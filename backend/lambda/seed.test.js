/**
 * Unit tests for seed.js using the mock store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockStore } from './store.js';
import { seedSchools, getStations } from './seed.js';

describe('seedSchools', () => {
  let store;

  beforeEach(() => {
    store = createMockStore();
  });

  it('seeds all schools from data file', async () => {
    const result = await seedSchools({}, store);

    // Should have 10 regular schools + 1 demo school
    expect(result.seeded).toBe(11);

    const schools = await store.listSchools();
    expect(schools).toHaveLength(11);
  });

  it('seeds demo school with correct properties', async () => {
    await seedSchools({ demoInbox: 'demo@test.com' }, store);

    const demoSchool = await store.getSchool('demo');
    expect(demoSchool).not.toBeNull();
    expect(demoSchool.is_demo_school).toBe(true);
    expect(demoSchool.display_name).toBe('Demo School (simulation only)');
    expect(demoSchool.contact_email).toBe('demo@test.com');
    expect(demoSchool.baseline_level).toBe(0);
    expect(demoSchool.current_level).toBe(0);
  });

  it('uses DEMO_INBOX environment variable for demo school email', async () => {
    const result = await seedSchools({ demoInbox: 'env-demo@example.com' }, store);

    const demoSchool = await store.getSchool('demo');
    expect(demoSchool.contact_email).toBe('env-demo@example.com');
  });

  it('seeds regular schools with correct station assignments', async () => {
    await seedSchools({}, store);

    // Najafgarh schools should have station_id 10120
    const najafgarhA = await store.getSchool('najafgarh-a');
    expect(najafgarhA.station_id).toBe(10120);
    expect(najafgarhA.is_demo_school).toBe(false);

    // Mundka schools should have station_id 10708
    const mundkaA = await store.getSchool('mundka-a');
    expect(mundkaA.station_id).toBe(10708);
  });

  it('initializes schools with null readings', async () => {
    await seedSchools({}, store);

    const school = await store.getSchool('najafgarh-a');
    expect(school.pm25_subindex).toBeNull();
    expect(school.pm10_subindex).toBeNull();
    expect(school.current_level).toBeNull();
    expect(school.source_timestamp).toBeNull();
  });

  it('returns list of seeded schools', async () => {
    const result = await seedSchools({}, store);

    expect(result.schools).toHaveLength(11);
    expect(result.schools.map(s => s.school_id)).toContain('demo');
    expect(result.schools.map(s => s.school_id)).toContain('najafgarh-a');
  });
});

describe('getStations', () => {
  it('returns list of stations from seed data', () => {
    const stations = getStations();

    expect(stations).toHaveLength(5);
    expect(stations.map(s => s.station_id)).toEqual(
      expect.arrayContaining([10120, 10708, 2553, 10116, 2556])
    );
  });

  it('includes station names', () => {
    const stations = getStations();
    const mundka = stations.find(s => s.station_id === 10708);

    expect(mundka.name).toBe('Mundka');
    expect(mundka.area).toBe('Mundka');
  });
});
