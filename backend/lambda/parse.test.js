/**
 * Unit tests for parse.js
 * Tests WAQI feed parsing, stale detection, and timestamp comparison.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  parseFeed,
  isStale,
  shouldSkip,
  processFeed,
} from './parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load sample fixtures
const samplesDir = join(__dirname, '..', '..', 'data', 'samples');
const mundkaFeed = JSON.parse(readFileSync(join(samplesDir, 'mundka_10708.json'), 'utf-8'));
const najafgarhFeed = JSON.parse(readFileSync(join(samplesDir, 'najafgarh_10120.json'), 'utf-8'));

describe('parseFeed', () => {
  it('parses Mundka sample correctly', () => {
    const result = parseFeed(mundkaFeed);

    expect(result.error).toBeUndefined();
    expect(result.stationId).toBe(10708);
    expect(result.timestamp).toBe('2026-10-06T20:00:00+05:30');
    expect(result.pm25Subindex).toBe(149);
    expect(result.pm10Subindex).toBe(198);
    expect(result.attributions).toHaveLength(2);
    expect(result.attributions[0].name).toBe('Delhi Pollution Control Commitee (Government of NCT of Delhi)');
    expect(result.attributions[1].name).toBe('World Air Quality Index Project');
  });

  it('parses Najafgarh sample correctly', () => {
    const result = parseFeed(najafgarhFeed);

    expect(result.error).toBeUndefined();
    expect(result.stationId).toBe(10120);
    expect(result.timestamp).toBe('2026-10-06T09:00:00+05:30');
    expect(result.pm25Subindex).toBe(129);
    expect(result.pm10Subindex).toBe(96);
    expect(result.attributions).toHaveLength(2);
  });

  it('handles missing pm25 key', () => {
    const feed = {
      status: 'ok',
      data: {
        idx: 12345,
        time: { iso: '2026-10-06T10:00:00+05:30' },
        iaqi: { pm10: { v: 100 } },
        attributions: [],
      },
    };

    const result = parseFeed(feed);
    expect(result.error).toBeUndefined();
    expect(result.pm25Subindex).toBeNull();
    expect(result.pm10Subindex).toBe(100);
  });

  it('handles missing pm10 key', () => {
    const feed = {
      status: 'ok',
      data: {
        idx: 12345,
        time: { iso: '2026-10-06T10:00:00+05:30' },
        iaqi: { pm25: { v: 50 } },
        attributions: [],
      },
    };

    const result = parseFeed(feed);
    expect(result.error).toBeUndefined();
    expect(result.pm25Subindex).toBe(50);
    expect(result.pm10Subindex).toBeNull();
  });

  it('handles both pm25 and pm10 missing', () => {
    const feed = {
      status: 'ok',
      data: {
        idx: 12345,
        time: { iso: '2026-10-06T10:00:00+05:30' },
        iaqi: { co: { v: 5 } },
        attributions: [],
      },
    };

    const result = parseFeed(feed);
    expect(result.error).toBeUndefined();
    expect(result.pm25Subindex).toBeNull();
    expect(result.pm10Subindex).toBeNull();
  });

  it('handles missing iaqi object entirely', () => {
    const feed = {
      status: 'ok',
      data: {
        idx: 12345,
        time: { iso: '2026-10-06T10:00:00+05:30' },
        attributions: [],
      },
    };

    const result = parseFeed(feed);
    expect(result.error).toBeUndefined();
    expect(result.pm25Subindex).toBeNull();
    expect(result.pm10Subindex).toBeNull();
  });

  it('returns error for invalid response (null)', () => {
    const result = parseFeed(null);
    expect(result.error).toBeDefined();
  });

  it('returns error for invalid response (wrong status)', () => {
    const result = parseFeed({ status: 'error', data: {} });
    expect(result.error).toContain('error');
  });

  it('returns error for WAQI error response where data is a string', () => {
    // WAQI returns {"status":"error","data":"Invalid key"} for bad tokens
    const errorResponse = { status: 'error', data: 'Invalid key' };

    expect(() => parseFeed(errorResponse)).not.toThrow();
    const result = parseFeed(errorResponse);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('error');
  });

  it('returns error for missing time.iso', () => {
    const result = parseFeed({
      status: 'ok',
      data: {
        idx: 12345,
        iaqi: {},
        attributions: [],
      },
    });
    expect(result.error).toContain('time.iso');
  });

  it('handles missing idx gracefully', () => {
    const feed = {
      status: 'ok',
      data: {
        time: { iso: '2026-10-06T10:00:00+05:30' },
        iaqi: {},
        attributions: [],
      },
    };

    const result = parseFeed(feed);
    expect(result.stationId).toBeNull();
  });

  it('never uses top-level aqi field', () => {
    // The top-level aqi is 198 in Mundka, but we use pm25=149, pm10=198
    const result = parseFeed(mundkaFeed);
    expect(result.pm25Subindex).toBe(149); // from iaqi.pm25.v, NOT data.aqi
    expect(result.pm10Subindex).toBe(198); // from iaqi.pm10.v
  });
});

describe('isStale', () => {
  it('returns false for fresh reading (within threshold)', () => {
    // Najafgarh timestamp: 2026-10-06T09:00:00+05:30
    // If current time is 2026-10-06T11:00:00+05:30 (2 hours later), not stale
    const currentTime = new Date('2026-10-06T11:00:00+05:30');
    expect(isStale('2026-10-06T09:00:00+05:30', currentTime)).toBe(false);
  });

  it('returns true for stale reading (older than 3 hours)', () => {
    // Najafgarh timestamp: 2026-10-06T09:00:00+05:30
    // If current time is 2026-10-06T13:00:00+05:30 (4 hours later), stale
    const currentTime = new Date('2026-10-06T13:00:00+05:30');
    expect(isStale('2026-10-06T09:00:00+05:30', currentTime)).toBe(true);
  });

  it('respects custom stale threshold', () => {
    const timestamp = '2026-10-06T09:00:00+05:30';
    const currentTime = new Date('2026-10-06T11:30:00+05:30'); // 2.5 hours later

    // With 2-hour threshold: stale
    expect(isStale(timestamp, currentTime, 2)).toBe(true);

    // With 3-hour threshold: not stale
    expect(isStale(timestamp, currentTime, 3)).toBe(false);
  });

  it('returns true for missing timestamp', () => {
    const currentTime = new Date();
    expect(isStale(null, currentTime)).toBe(true);
    expect(isStale(undefined, currentTime)).toBe(true);
    expect(isStale('', currentTime)).toBe(true);
  });

  it('returns true for invalid timestamp', () => {
    const currentTime = new Date();
    expect(isStale('invalid-date', currentTime)).toBe(true);
  });

  it('exactly stale_after_hours old is still fresh (not stale)', () => {
    // A reading exactly 3 hours old should be fresh, not stale
    const timestamp = '2026-10-06T09:00:00+05:30';
    const currentTime = new Date('2026-10-06T12:00:00+05:30'); // exactly 3 hours later

    expect(isStale(timestamp, currentTime, 3)).toBe(false);
  });

  it('older than stale_after_hours is stale', () => {
    // A reading even 1 second over the threshold is stale
    const timestamp = '2026-10-06T09:00:00+05:30';
    const currentTime = new Date('2026-10-06T12:00:01+05:30'); // 3 hours + 1 second

    expect(isStale(timestamp, currentTime, 3)).toBe(true);
  });
});

describe('shouldSkip', () => {
  it('returns false when no prior reading exists', () => {
    expect(shouldSkip('2026-10-06T10:00:00+05:30', null)).toBe(false);
    expect(shouldSkip('2026-10-06T10:00:00+05:30', undefined)).toBe(false);
    expect(shouldSkip('2026-10-06T10:00:00+05:30', '')).toBe(false);
  });

  it('returns false when new timestamp is newer', () => {
    expect(shouldSkip('2026-10-06T11:00:00+05:30', '2026-10-06T10:00:00+05:30')).toBe(false);
  });

  it('returns true when new timestamp is older', () => {
    expect(shouldSkip('2026-10-06T09:00:00+05:30', '2026-10-06T10:00:00+05:30')).toBe(true);
  });

  it('returns true when timestamps are identical', () => {
    expect(shouldSkip('2026-10-06T10:00:00+05:30', '2026-10-06T10:00:00+05:30')).toBe(true);
  });

  it('returns true when new timestamp is missing', () => {
    expect(shouldSkip(null, '2026-10-06T10:00:00+05:30')).toBe(true);
  });

  it('returns true for invalid timestamps', () => {
    expect(shouldSkip('invalid', '2026-10-06T10:00:00+05:30')).toBe(true);
    expect(shouldSkip('2026-10-06T10:00:00+05:30', 'invalid')).toBe(true);
  });

  it('handles timezone-aware comparison', () => {
    // Same instant, different timezone representations
    const utc = '2026-10-06T04:30:00Z';
    const ist = '2026-10-06T10:00:00+05:30';

    // These are the same instant, so should skip
    expect(shouldSkip(utc, ist)).toBe(true);
    expect(shouldSkip(ist, utc)).toBe(true);
  });
});

describe('processFeed', () => {
  it('successfully processes a fresh, newer reading', () => {
    const currentTime = new Date('2026-10-06T22:00:00+05:30'); // 2 hours after Mundka reading
    const storedTimestamp = '2026-10-06T18:00:00+05:30'; // older than the feed

    const result = processFeed(mundkaFeed, storedTimestamp, currentTime);

    expect(result.success).toBe(true);
    expect(result.parsed.stationId).toBe(10708);
    expect(result.parsed.pm25Subindex).toBe(149);
    expect(result.parsed.pm10Subindex).toBe(198);
  });

  it('rejects stale reading', () => {
    // Mundka timestamp: 2026-10-06T20:00:00+05:30
    // Current time 5 hours later = stale
    const currentTime = new Date('2026-10-07T01:00:00+05:30');
    const storedTimestamp = null;

    const result = processFeed(mundkaFeed, storedTimestamp, currentTime);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('stale');
  });

  it('rejects unchanged timestamp', () => {
    const currentTime = new Date('2026-10-06T22:00:00+05:30');
    // Stored timestamp matches the feed timestamp
    const storedTimestamp = '2026-10-06T20:00:00+05:30';

    const result = processFeed(mundkaFeed, storedTimestamp, currentTime);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('not newer');
  });

  it('rejects invalid response', () => {
    const currentTime = new Date();
    const result = processFeed({ status: 'error' }, null, currentTime);

    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('accepts first reading (no stored timestamp)', () => {
    const currentTime = new Date('2026-10-06T22:00:00+05:30'); // 2 hours after, fresh
    const result = processFeed(mundkaFeed, null, currentTime);

    expect(result.success).toBe(true);
    expect(result.parsed.stationId).toBe(10708);
  });
});
