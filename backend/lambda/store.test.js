/**
 * Unit tests for store.js using the mock store.
 * Tests the store interface without hitting AWS.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockStore } from './store.js';

describe('Mock store', () => {
  let store;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('getSchool / putSchool', () => {
    it('returns null for non-existent school', async () => {
      const result = await store.getSchool('nonexistent');
      expect(result).toBeNull();
    });

    it('stores and retrieves a school', async () => {
      const school = {
        school_id: 'test-1',
        display_name: 'Test School',
        station_id: 12345,
        contact_email: 'test@example.com',
        current_level: 0,
      };

      await store.putSchool(school);
      const result = await store.getSchool('test-1');

      expect(result).not.toBeNull();
      expect(result.school_id).toBe('test-1');
      expect(result.display_name).toBe('Test School');
    });

    it('overwrites an existing school', async () => {
      await store.putSchool({ school_id: 'test-1', current_level: 0 });
      await store.putSchool({ school_id: 'test-1', current_level: 2 });

      const result = await store.getSchool('test-1');
      expect(result.current_level).toBe(2);
    });
  });

  describe('listSchools', () => {
    it('returns empty array when no schools', async () => {
      const result = await store.listSchools();
      expect(result).toEqual([]);
    });

    it('returns all schools', async () => {
      await store.putSchool({ school_id: 'school-1', display_name: 'School 1' });
      await store.putSchool({ school_id: 'school-2', display_name: 'School 2' });

      const result = await store.listSchools();
      expect(result).toHaveLength(2);
      expect(result.map(s => s.school_id).sort()).toEqual(['school-1', 'school-2']);
    });
  });

  describe('updateSchoolReading', () => {
    it('updates reading fields on an existing school', async () => {
      await store.putSchool({ school_id: 'test-1', current_level: null });

      await store.updateSchoolReading('test-1', {
        pm25Subindex: 129,
        pm10Subindex: 96,
        est_pm25: 46.9,
        est_pm10: 96,
        current_level: 0,
        category_label: 'Good / Satisfactory',
        driving_pollutant: 'pm25',
        source_timestamp: '2026-10-06T09:00:00+05:30',
        last_updated: '2026-10-06T11:00:00Z',
      });

      const result = await store.getSchool('test-1');
      expect(result.current_level).toBe(0);
      expect(result.driving_pollutant).toBe('pm25');
      expect(result.source_timestamp).toBe('2026-10-06T09:00:00+05:30');
    });

    it('does nothing for non-existent school', async () => {
      // Should not throw
      await store.updateSchoolReading('nonexistent', {
        current_level: 1,
      });
    });
  });

  describe('putAlert / listAlerts', () => {
    it('stores and retrieves alerts', async () => {
      await store.putAlert({
        school_id: 'test-1',
        timestamp: '2026-10-06T10:00:00Z',
        from_level: 0,
        to_level: 2,
        status: 'sent',
        is_demo: false,
      });

      const alerts = await store.listAlerts('test-1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].to_level).toBe(2);
    });

    it('filters alerts by school_id', async () => {
      await store.putAlert({ school_id: 'school-1', timestamp: 't1', from_level: 0, to_level: 1 });
      await store.putAlert({ school_id: 'school-2', timestamp: 't2', from_level: 0, to_level: 2 });

      const alerts = await store.listAlerts('school-1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].school_id).toBe('school-1');
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 15; i++) {
        await store.putAlert({
          school_id: 'test-1',
          timestamp: `t${i}`,
          from_level: 0,
          to_level: 1,
        });
      }

      const alerts = await store.listAlerts('test-1', 5);
      expect(alerts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('test helpers', () => {
    it('reset clears all data', async () => {
      await store.putSchool({ school_id: 'test-1' });
      await store.putAlert({ school_id: 'test-1', timestamp: 't1' });

      store.reset();

      expect(await store.listSchools()).toEqual([]);
      expect(await store.listAlerts('test-1')).toEqual([]);
    });

    it('seed populates schools', async () => {
      store.seed([
        { school_id: 's1', display_name: 'School 1' },
        { school_id: 's2', display_name: 'School 2' },
      ]);

      const schools = await store.listSchools();
      expect(schools).toHaveLength(2);
    });
  });
});
