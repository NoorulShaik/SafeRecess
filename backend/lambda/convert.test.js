/**
 * Unit tests for convert.js
 * Tests PM2.5 and PM10 sub-index to concentration conversion,
 * concentration to India level mapping, and worse-pollutant logic.
 *
 * Tolerance: 0.5 µg/m³ for concentration comparisons
 */

import { describe, it, expect } from 'vitest';
import {
  pm25SubindexToConcentration,
  pm10SubindexToConcentration,
  pm25ConcentrationToLevel,
  pm10ConcentrationToLevel,
  convertToLevel,
  concentrationToAqi,
} from './convert.js';

const TOLERANCE = 0.5;

describe('PM2.5 sub-index to concentration', () => {
  it('PM2.5 sub-index 129 -> ~46.9 µg/m³ (2024 table)', () => {
    const result = pm25SubindexToConcentration(129, '2024');
    expect(result).toBeCloseTo(46.9, 1);
  });

  it('PM2.5 sub-index 129 -> ~46.9 µg/m³ (2012 table)', () => {
    const result = pm25SubindexToConcentration(129, '2012');
    expect(result).toBeCloseTo(46.9, 1);
  });

  it('PM2.5 sub-index 149 -> ~55.0 µg/m³ (2024 table)', () => {
    const result = pm25SubindexToConcentration(149, '2024');
    expect(result).toBeCloseTo(55.0, 0);
  });

  it('PM2.5 sub-index 170 -> ~82.6 µg/m³ (2024 table)', () => {
    const result = pm25SubindexToConcentration(170, '2024');
    expect(result).toBeCloseTo(82.6, 0);
  });

  it('PM2.5 sub-index 170 -> ~92.3 µg/m³ (2012 table)', () => {
    const result = pm25SubindexToConcentration(170, '2012');
    expect(result).toBeCloseTo(92.3, 0);
  });

  it('returns null for null/undefined input', () => {
    expect(pm25SubindexToConcentration(null)).toBeNull();
    expect(pm25SubindexToConcentration(undefined)).toBeNull();
  });

  it('handles boundary values', () => {
    // Test at segment boundaries
    const result0 = pm25SubindexToConcentration(0, '2024');
    expect(result0).toBe(0);

    const result50 = pm25SubindexToConcentration(50, '2024');
    expect(result50).toBeCloseTo(9.0, 1);
  });
});

describe('PM10 sub-index to concentration', () => {
  it('PM10 sub-index 198 -> ~350 µg/m³', () => {
    const result = pm10SubindexToConcentration(198);
    expect(result).toBeCloseTo(350, 0);
  });

  it('returns null for null/undefined input', () => {
    expect(pm10SubindexToConcentration(null)).toBeNull();
    expect(pm10SubindexToConcentration(undefined)).toBeNull();
  });
});

describe('Concentration to India level', () => {
  describe('PM2.5 boundaries', () => {
    it('PM2.5 concentration 60 -> level 0', () => {
      expect(pm25ConcentrationToLevel(60)).toBe(0);
    });

    it('PM2.5 concentration 61 -> level 1', () => {
      expect(pm25ConcentrationToLevel(61)).toBe(1);
    });

    it('PM2.5 concentration 90 -> level 1', () => {
      expect(pm25ConcentrationToLevel(90)).toBe(1);
    });

    it('PM2.5 concentration 91 -> level 2', () => {
      expect(pm25ConcentrationToLevel(91)).toBe(2);
    });

    it('PM2.5 concentration 120 -> level 2', () => {
      expect(pm25ConcentrationToLevel(120)).toBe(2);
    });

    it('PM2.5 concentration 121 -> level 3', () => {
      expect(pm25ConcentrationToLevel(121)).toBe(3);
    });

    it('PM2.5 concentration above 121 -> level 3', () => {
      expect(pm25ConcentrationToLevel(200)).toBe(3);
    });
  });

  describe('PM10 boundaries', () => {
    it('PM10 concentration 100 -> level 0', () => {
      expect(pm10ConcentrationToLevel(100)).toBe(0);
    });

    it('PM10 concentration 101 -> level 1', () => {
      expect(pm10ConcentrationToLevel(101)).toBe(1);
    });

    it('PM10 concentration 250 -> level 1', () => {
      expect(pm10ConcentrationToLevel(250)).toBe(1);
    });

    it('PM10 concentration 251 -> level 2', () => {
      expect(pm10ConcentrationToLevel(251)).toBe(2);
    });

    it('PM10 concentration 350 -> level 2', () => {
      expect(pm10ConcentrationToLevel(350)).toBe(2);
    });

    it('PM10 concentration 351 -> level 3', () => {
      expect(pm10ConcentrationToLevel(351)).toBe(3);
    });

    it('PM10 concentration above 351 -> level 3', () => {
      expect(pm10ConcentrationToLevel(500)).toBe(3);
    });
  });
});

describe('convertToLevel - combined function', () => {
  it('PM2.5 129 -> level 0 (both tables)', () => {
    const result2024 = convertToLevel(129, null, '2024');
    expect(result2024.level).toBe(0);
    expect(result2024.driving_pollutant).toBe('pm25');

    const result2012 = convertToLevel(129, null, '2012');
    expect(result2012.level).toBe(0);
    expect(result2012.driving_pollutant).toBe('pm25');
  });

  it('PM2.5 149 -> level 0; PM10 198 -> level 2; worse wins -> level 2', () => {
    const result = convertToLevel(149, 198, '2024');
    expect(result.level).toBe(2);
    expect(result.driving_pollutant).toBe('pm10');
    expect(result.est_pm25).toBeCloseTo(55.0, 0);
    expect(result.est_pm10).toBeCloseTo(350, 0);
  });

  it('PM2.5 170 -> level 1 (2024 table)', () => {
    const result = convertToLevel(170, null, '2024');
    expect(result.level).toBe(1);
    expect(result.driving_pollutant).toBe('pm25');
  });

  it('PM2.5 170 -> level 2 (2012 table)', () => {
    const result = convertToLevel(170, null, '2012');
    expect(result.level).toBe(2);
    expect(result.driving_pollutant).toBe('pm25');
  });

  it('handles missing PM2.5', () => {
    const result = convertToLevel(null, 198);
    expect(result.level).toBe(2);
    expect(result.driving_pollutant).toBe('pm10');
    expect(result.est_pm25).toBeNull();
  });

  it('handles missing PM10', () => {
    const result = convertToLevel(170, null, '2024');
    expect(result.level).toBe(1);
    expect(result.driving_pollutant).toBe('pm25');
    expect(result.est_pm10).toBeNull();
  });

  it('handles both missing -> null level', () => {
    const result = convertToLevel(null, null);
    expect(result.level).toBeNull();
    expect(result.driving_pollutant).toBeNull();
  });

  it('uses default EPA table version from config when not specified', () => {
    // Config defaults to '2024'
    const result = convertToLevel(170, null);
    expect(result.level).toBe(1);
  });
});

describe('concentrationToAqi - forward conversion for simulation', () => {
  it('converts PM2.5 concentration to sub-index', () => {
    const config = { epa_pm25: { '2024': [
      { c_low: 0, c_high: 9.0, aqi_low: 0, aqi_high: 50 },
      { c_low: 9.1, c_high: 35.4, aqi_low: 51, aqi_high: 100 },
      { c_low: 35.5, c_high: 55.4, aqi_low: 101, aqi_high: 150 },
      { c_low: 55.5, c_high: 125.4, aqi_low: 151, aqi_high: 200 },
    ]}};

    const result = concentrationToAqi(46.9, config.epa_pm25['2024']);
    expect(result).toBeCloseTo(129, 0);
  });
});
