/**
 * Unit tests for fetch.js using the mock store.
 * Tests the fetch/process logic without calling AWS or WAQI.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockStore } from './store.js';
import { processStation, fetchStation, CATEGORY_LABELS } from './fetch.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load sample feed fixtures
const samplesDir = join(__dirname, '..', '..', 'data', 'samples');
const mundkaFeed = JSON.parse(readFileSync(join(samplesDir, 'mundka_10708.json'), 'utf-8'));
const najafgarhFeed = JSON.parse(readFileSync(join(samplesDir, 'najafgarh_10120.json'), 'utf-8'));

// Mock global fetch
global.fetch = vi.fn();

/**
 * Create a fresh feed with a current timestamp for testing.
 * The sample feeds have old timestamps (2026-10-06) which would be stale.
 */
function freshFeed(baseFeed, minutesAgo = 30) {
  const now = new Date();
  const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
  const iso = timestamp.toISOString().replace('Z', '+00:00');

  return {
    ...baseFeed,
    data: {
      ...baseFeed.data,
      time: { ...baseFeed.data.time, iso },
    },
  };
}

describe('fetchStation', () => {
  it('constructs correct API URL', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => mundkaFeed,
    });

    await fetchStation(10708, 'test-token');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.waqi.info/feed/@10708/?token=test-token'
    );
  });

  it('returns parsed JSON response', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => mundkaFeed,
    });

    const result = await fetchStation(10708, 'test-token');
    expect(result.status).toBe('ok');
    expect(result.data.idx).toBe(10708);
  });
});

describe('processStation', () => {
  let store;

  beforeEach(() => {
    store = createMockStore();
    global.fetch.mockClear();
  });

  it('fetches station data and updates schools', async () => {
    // Seed with Mundka schools
    store.seed([
      { school_id: 'mundka-a', station_id: 10708, is_demo_school: false, source_timestamp: null },
      { school_id: 'mundka-b', station_id: 10708, is_demo_school: false, source_timestamp: null },
    ]);

    // Mock fetch to return fresh Mundka feed
    global.fetch.mockResolvedValueOnce({
      json: async () => freshFeed(mundkaFeed),
    });

    const result = await processStation(10708, 'test-token', store);

    expect(result.success).toBe(true);
    expect(result.schoolsUpdated).toBe(2);

    // Check schools were updated
    const schoolA = await store.getSchool('mundka-a');
    expect(schoolA.current_level).toBe(2); // PM10 198 drives level 2
    expect(schoolA.driving_pollutant).toBe('pm10');
    expect(schoolA.source_timestamp).toBeDefined();
  });

  it('skips update when timestamp not newer', async () => {
    const feed = freshFeed(mundkaFeed);
    const storedTs = feed.data.time.iso;

    // Seed with school that already has this timestamp
    store.seed([
      {
        school_id: 'mundka-a',
        station_id: 10708,
        is_demo_school: false,
        source_timestamp: storedTs,
      },
    ]);

    global.fetch.mockResolvedValueOnce({
      json: async () => feed,
    });

    const result = await processStation(10708, 'test-token', store);

    expect(result.success).toBe(true);
    expect(result.schoolsUpdated).toBe(0);
    expect(result.reason).toContain('not newer');
  });

  it('skips update when reading is stale', async () => {
    store.seed([
      { school_id: 'mundka-a', station_id: 10708, is_demo_school: false, source_timestamp: null },
    ]);

    // Use the original feed with old timestamp (2026-10-06)
    global.fetch.mockResolvedValueOnce({
      json: async () => mundkaFeed,
    });

    const result = await processStation(10708, 'test-token', store);

    expect(result.success).toBe(true);
    expect(result.schoolsUpdated).toBe(0);
    expect(result.reason).toContain('stale');
  });

  it('handles fetch failure gracefully', async () => {
    store.seed([
      { school_id: 'mundka-a', station_id: 10708, is_demo_school: false },
    ]);

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await processStation(10708, 'test-token', store);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('handles station with no schools', async () => {
    store.seed([
      // No schools for station 10708
    ]);

    global.fetch.mockResolvedValueOnce({
      json: async () => freshFeed(mundkaFeed),
    });

    const result = await processStation(10708, 'test-token', store);

    expect(result.success).toBe(true);
    expect(result.schoolsUpdated).toBe(0);
    expect(result.reason).toBe('No schools for station');
  });

  it('skips demo schools when processing station', async () => {
    store.seed([
      { school_id: 'mundka-a', station_id: 10708, is_demo_school: false, source_timestamp: null },
      { school_id: 'demo', station_id: 10708, is_demo_school: true, source_timestamp: null },
    ]);

    global.fetch.mockResolvedValueOnce({
      json: async () => freshFeed(mundkaFeed),
    });

    const result = await processStation(10708, 'test-token', store);

    expect(result.schoolsUpdated).toBe(1); // Only mundka-a, not demo

    const demoSchool = await store.getSchool('demo');
    expect(demoSchool.source_timestamp).toBeNull(); // Not updated
  });

  it('stores attribution list from feed', async () => {
    store.seed([
      { school_id: 'mundka-a', station_id: 10708, is_demo_school: false, source_timestamp: null },
    ]);

    global.fetch.mockResolvedValueOnce({
      json: async () => freshFeed(mundkaFeed),
    });

    await processStation(10708, 'test-token', store);

    const school = await store.getSchool('mundka-a');
    expect(school.attribution).toHaveLength(2);
    expect(school.attribution[0].name).toContain('Delhi Pollution Control');
    expect(school.attribution[1].name).toContain('World Air Quality Index');
  });

  it('converts sub-indices to levels correctly', async () => {
    store.seed([
      { school_id: 'najafgarh-a', station_id: 10120, is_demo_school: false, source_timestamp: null },
    ]);

    global.fetch.mockResolvedValueOnce({
      json: async () => freshFeed(najafgarhFeed),
    });

    await processStation(10120, 'test-token', store);

    const school = await store.getSchool('najafgarh-a');
    // Najafgarh: PM2.5 129 -> ~46.9 -> level 0, PM10 AQI 96 -> ~146 -> level 1.
    // The worse pollutant wins, so PM10 correctly drives the result.
    expect(school.current_level).toBe(1);
    expect(school.category_label).toBe('Moderate');
    expect(school.driving_pollutant).toBe('pm10');
  });

  it('stores prev_level for alert detection', async () => {
    // Seed with school at level 0
    store.seed([
      { school_id: 'mundka-a', station_id: 10708, is_demo_school: false, current_level: 0, source_timestamp: null },
    ]);

    global.fetch.mockResolvedValueOnce({
      json: async () => freshFeed(mundkaFeed),
    });

    await processStation(10708, 'test-token', store);

    const school = await store.getSchool('mundka-a');
    expect(school.prev_level).toBe(0); // Previous level stored
    expect(school.current_level).toBe(2); // New level
  });

  it('handles missing pollutant gracefully', async () => {
    store.seed([
      { school_id: 'test-1', station_id: 12345, is_demo_school: false, source_timestamp: null },
    ]);

    // Feed with only PM2.5 and fresh timestamp
    const partialFeed = {
      status: 'ok',
      data: {
        idx: 12345,
        time: { iso: new Date().toISOString().replace('Z', '+00:00') },
        iaqi: { pm25: { v: 50 } },
        attributions: [],
        city: { name: 'Test Station' },
      },
    };

    global.fetch.mockResolvedValueOnce({
      json: async () => partialFeed,
    });

    const result = await processStation(12345, 'test-token', store);

    expect(result.success).toBe(true);
    expect(result.schoolsUpdated).toBe(1);

    const school = await store.getSchool('test-1');
    expect(school.est_pm10).toBeNull();
    expect(school.current_level).toBe(0); // Driven by PM2.5 only
  });
});

describe('CATEGORY_LABELS', () => {
  it('has labels for all levels', () => {
    expect(CATEGORY_LABELS[0]).toBe('Good / Satisfactory');
    expect(CATEGORY_LABELS[1]).toBe('Moderate');
    expect(CATEGORY_LABELS[2]).toBe('Poor');
    expect(CATEGORY_LABELS[3]).toBe('Very Poor / Severe');
  });
});
