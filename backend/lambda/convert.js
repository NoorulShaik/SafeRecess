/**
 * Convert AQI sub-indices to estimated concentrations and India (CPCB) levels.
 * Reads EPA breakpoints and India bands from config.json.
 */

import config from './data/config.json' with { type: 'json' };

function loadConfig() {
  return config;
}

/**
 * Sanitise a raw sub-index value from an API response.
 * Accepts a number or numeric string; returns null for null, undefined,
 * NaN, Infinity, non-numeric strings (e.g. "-") and negative values.
 * A sub-index above 500 is kept as-is; the interpolation handles it.
 *
 * @param {*} v - Raw value
 * @returns {number|null}
 */
export function sanitiseSubindex(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Linear interpolation: find concentration from AQI sub-index.
 * Uses piecewise linear interpolation within EPA breakpoint segments.
 *
 * @param {number} aqi - AQI sub-index value (must be a finite non-negative number)
 * @param {Array} breakpoints - EPA breakpoint table [{c_low, c_high, aqi_low, aqi_high}, ...]
 * @returns {number|null} - Concentration in µg/m³, or null if out of range
 */
function aqiToConcentration(aqi, breakpoints) {
  // Reject anything that is not a finite non-negative number
  if (!Number.isFinite(aqi) || aqi < 0) {
    return null;
  }

  // Find the segment containing this AQI value
  for (const segment of breakpoints) {
    if (aqi >= segment.aqi_low && aqi <= segment.aqi_high) {
      // Linear interpolation: C = C_low + (AQI - AQI_low) * (C_high - C_low) / (AQI_high - AQI_low)
      const concentration =
        segment.c_low +
        ((aqi - segment.aqi_low) * (segment.c_high - segment.c_low)) /
          (segment.aqi_high - segment.aqi_low);
      return concentration;
    }
  }

  // Above top bracket - extrapolate using last segment
  const lastSegment = breakpoints[breakpoints.length - 1];
  if (aqi > lastSegment.aqi_high) {
    // Extrapolate conservatively
    const concentration =
      lastSegment.c_high +
      ((aqi - lastSegment.aqi_high) * (lastSegment.c_high - lastSegment.c_low)) /
        (lastSegment.aqi_high - lastSegment.aqi_low);
    return concentration;
  }

  return null;
}

/**
 * Convert concentration to India (CPCB) level.
 * Rounds concentration to nearest integer before comparison.
 *
 * @param {number} concentration - Concentration in µg/m³
 * @param {Array} bands - India band table [{upper, level}, ...]
 * @returns {number} - Level 0-3, or 3 if above all bands
 */
function concentrationToLevel(concentration, bands) {
  // Also reject NaN and Infinity, which pass the null/undefined check
  if (concentration === null || concentration === undefined || !Number.isFinite(concentration)) {
    return null;
  }

  // Round to nearest integer per spec
  const rounded = Math.round(concentration);

  // Find the appropriate level
  for (const band of bands) {
    if (band.upper === null || rounded <= band.upper) {
      return band.level;
    }
  }

  // Above all bands = Level 3
  return 3;
}

/**
 * Convert PM2.5 sub-index to estimated concentration.
 *
 * @param {number} subindex - AQI sub-index for PM2.5
 * @param {string} tableVersion - '2024' or '2012' EPA table
 * @returns {number|null} - Concentration in µg/m³
 */
export function pm25SubindexToConcentration(subindex, tableVersion = null) {
  const cfg = loadConfig();
  const version = tableVersion || cfg.epa_pm25_version;
  const breakpoints = cfg.epa_pm25[version];

  if (!breakpoints) {
    throw new Error(`Unknown EPA PM2.5 table version: ${version}`);
  }

  return aqiToConcentration(subindex, breakpoints);
}

/**
 * Convert PM10 sub-index to estimated concentration.
 *
 * @param {number} subindex - AQI sub-index for PM10
 * @returns {number|null} - Concentration in µg/m³
 */
export function pm10SubindexToConcentration(subindex) {
  const cfg = loadConfig();
  return aqiToConcentration(subindex, cfg.epa_pm10);
}

/**
 * Convert PM2.5 concentration to India level.
 *
 * @param {number} concentration - Concentration in µg/m³
 * @returns {number|null} - Level 0-3
 */
export function pm25ConcentrationToLevel(concentration) {
  const cfg = loadConfig();
  return concentrationToLevel(concentration, cfg.india_bands_upper_inclusive.pm25);
}

/**
 * Convert PM10 concentration to India level.
 *
 * @param {number} concentration - Concentration in µg/m³
 * @returns {number|null} - Level 0-3
 */
export function pm10ConcentrationToLevel(concentration) {
  const cfg = loadConfig();
  return concentrationToLevel(concentration, cfg.india_bands_upper_inclusive.pm10);
}

/**
 * Convert concentration to AQI sub-index (forward conversion).
 * Used for simulation presets.
 *
 * @param {number} concentration - Concentration in µg/m³
 * @param {Array} breakpoints - EPA breakpoint table
 * @returns {number|null} - AQI sub-index
 */
export function concentrationToAqi(concentration, breakpoints) {
  if (concentration === null || concentration === undefined || !Number.isFinite(concentration) || concentration < 0) {
    return null;
  }

  // Find the segment containing this concentration
  for (const segment of breakpoints) {
    if (concentration >= segment.c_low && concentration <= segment.c_high) {
      // Linear interpolation: AQI = AQI_low + (C - C_low) * (AQI_high - AQI_low) / (C_high - C_low)
      const aqi =
        segment.aqi_low +
        ((concentration - segment.c_low) * (segment.aqi_high - segment.aqi_low)) /
          (segment.c_high - segment.c_low);
      return Math.round(aqi);
    }
  }

  return null;
}

/**
 * Main conversion function: takes PM2.5 and PM10 sub-indices,
 * converts both to concentrations, maps to India levels,
 * and returns the worse level.
 *
 * @param {number} pm25Subindex - AQI sub-index for PM2.5 (null if missing)
 * @param {number} pm10Subindex - AQI sub-index for PM10 (null if missing)
 * @param {string} epaTableVersion - Optional override for EPA table version
 * @returns {Object} - { level, est_pm25, est_pm10, driving_pollutant }
 */
export function convertToLevel(pm25Subindex, pm10Subindex, epaTableVersion = null) {
  const cfg = loadConfig();

  // Sanitise inputs: NaN, strings like "-", negative numbers all count as missing
  const pm25 = sanitiseSubindex(pm25Subindex);
  const pm10 = sanitiseSubindex(pm10Subindex);

  // Convert both pollutants
  const est_pm25 = pm25 !== null ? pm25SubindexToConcentration(pm25, epaTableVersion) : null;
  const est_pm10 = pm10 !== null ? pm10SubindexToConcentration(pm10) : null;

  // Get levels for each
  const pm25Level = est_pm25 !== null ? pm25ConcentrationToLevel(est_pm25) : null;
  const pm10Level = est_pm10 !== null ? pm10ConcentrationToLevel(est_pm10) : null;

  // Handle missing pollutants
  if (pm25Level === null && pm10Level === null) {
    return { level: null, est_pm25: null, est_pm10: null, driving_pollutant: null };
  }
  if (pm25Level === null) {
    return { level: pm10Level, est_pm25: null, est_pm10, driving_pollutant: 'pm10' };
  }
  if (pm10Level === null) {
    return { level: pm25Level, est_pm25, est_pm10: null, driving_pollutant: 'pm25' };
  }

  // Return the worse level
  if (pm10Level > pm25Level) {
    return { level: pm10Level, est_pm25, est_pm10, driving_pollutant: 'pm10' };
  } else {
    return { level: pm25Level, est_pm25, est_pm10, driving_pollutant: 'pm25' };
  }
}

// Export for testing
export { loadConfig, aqiToConcentration, concentrationToLevel };
