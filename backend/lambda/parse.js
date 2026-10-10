/**
 * Parse WAQI feed responses and handle stale/unchanged readings.
 * Pure functions with no AWS calls.
 */

import config from './data/config.json' with { type: 'json' };

function loadConfig() {
  return config;
}

/**
 * Parse a WAQI feed response and extract the relevant fields.
 *
 * @param {Object} feedResponse - The full WAQI API response
 * @returns {Object} - { stationId, timestamp, pm25Subindex, pm10Subindex, attributions }
 *                     Returns null for missing pollutants; null stationId if idx missing.
 *                     Returns { error: string } if response is invalid.
 */
export function parseFeed(feedResponse) {
  // Validate response structure
  if (!feedResponse || typeof feedResponse !== 'object') {
    return { error: 'Invalid response: not an object' };
  }

  if (feedResponse.status !== 'ok') {
    return { error: `API returned status: ${feedResponse.status}` };
  }

  const data = feedResponse.data;
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid response: missing data object' };
  }

  // Extract station ID (idx)
  //const stationId = data.idx ?? null;
  // Extract station ID (idx) and format it to match our database strings (e.g., "@7397")
  // Extract station ID (idx)
  const stationId = data.idx ?? null;

  // Extract timestamp - use time.iso, NEVER time.v
  const timestamp = data.time?.iso ?? null;
  if (!timestamp) {
    return { error: 'Missing time.iso in response' };
  }

  // Extract PM2.5 and PM10 sub-indices from iaqi
  // These are AQI sub-indices, NOT raw concentrations
  const iaqi = data.iaqi || {};

  // pm25 and pm10 may be missing; extract the 'v' field if present
  const pm25Subindex = iaqi.pm25?.v !== undefined ? iaqi.pm25.v : null;
  const pm10Subindex = iaqi.pm10?.v !== undefined ? iaqi.pm10.v : null;

  // Extract attributions list
  const attributions = data.attributions || [];

  return {
    stationId,
    timestamp,
    pm25Subindex,
    pm10Subindex,
    attributions,
  };
}

/**
 * Check if a reading is stale (older than the configured threshold).
 *
 * @param {string} timestamp - ISO 8601 timestamp from the feed (time.iso)
 * @param {Date} currentTime - Current time to compare against
 * @param {number} staleAfterHours - Optional override for stale threshold (reads from config if not provided)
 * @returns {boolean} - true if the reading is stale
 */
export function isStale(timestamp, currentTime, staleAfterHours = null) {
  if (!timestamp) {
    return true; // Missing timestamp = stale
  }

  const cfg = loadConfig();
  const thresholdHours = staleAfterHours ?? cfg.stale_after_hours;

  const readingTime = new Date(timestamp);
  const now = currentTime instanceof Date ? currentTime : new Date(currentTime);

  if (isNaN(readingTime.getTime())) {
    return true; // Invalid timestamp = stale
  }

  const ageMs = now.getTime() - readingTime.getTime();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;

  return ageMs > thresholdMs;
}

/**
 * Check if a new reading should be skipped because its timestamp
 * is not newer than the stored one.
 *
 * @param {string} newTimestamp - ISO 8601 timestamp from the new reading
 * @param {string} storedTimestamp - ISO 8601 timestamp of the stored reading (null if no prior reading)
 * @returns {boolean} - true if the new reading should be skipped (not newer)
 */
export function shouldSkip(newTimestamp, storedTimestamp) {
  // No prior reading -> don't skip
  if (!storedTimestamp) {
    return false;
  }

  // No new timestamp -> skip (can't process without timestamp)
  if (!newTimestamp) {
    return true;
  }

  const newTime = new Date(newTimestamp);
  const storedTime = new Date(storedTimestamp);

  // Invalid timestamps -> skip
  if (isNaN(newTime.getTime()) || isNaN(storedTime.getTime())) {
    return true;
  }

  // Skip if not strictly newer (same timestamp = skip)
  return newTime.getTime() <= storedTime.getTime();
}

/**
 * Combined validation: parse, check for stale, check for unchanged timestamp.
 *
 * @param {Object} feedResponse - The full WAQI API response
 * @param {string} storedTimestamp - ISO timestamp of the last stored reading (null if none)
 * @param {Date} currentTime - Current time for stale check
 * @returns {Object} - { success: true, parsed: {...} } or { success: false, reason: string }
 */
export function processFeed(feedResponse, storedTimestamp, currentTime) {
  // Parse the response
  const parsed = parseFeed(feedResponse);

  if (parsed.error) {
    return { success: false, reason: parsed.error };
  }

  // Check if timestamp is newer than stored
  if (shouldSkip(parsed.timestamp, storedTimestamp)) {
    return { success: false, reason: 'Reading timestamp not newer than stored' };
  }

  // Check for stale data
  if (isStale(parsed.timestamp, currentTime)) {
    return { success: false, reason: 'Reading is stale' };
  }

  return { success: true, parsed };
}

// Export config loader for testing
export { loadConfig };
