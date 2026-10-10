// /**
//  * Lambda handler: Fetch air quality data from WAQI for all stations.
//  * Updates each school's reading through the store module.
//  *
//  * Trigger: EventBridge schedule (every 30 minutes)
//  *
//  * Environment:
//  * - WAQI_TOKEN: API token (required)
//  * - SCHOOL_TABLE_NAME: DynamoDB table name
 

// import store from './store.js';
// import { parseFeed, processFeed } from './parse.js';
// import { convertToLevel, sanitiseSubindex } from './convert.js';
// //import { getStations } from './seed.js';
// import { sendAlert } from './alerts.js';

// const WAQI_BASE_URL = 'https://api.waqi.info';

// // Category labels for each level
// const CATEGORY_LABELS = {
//   0: 'Good / Satisfactory',
//   1: 'Moderate',
//   2: 'Poor',
//   3: 'Very Poor / Severe',
// };

// /**
//  * Fetch a station's feed from WAQI by station ID.
//  * @param {number} stationId - WAQI station ID
//  * @param {string} token - WAQI API token
//  * @returns {Promise<Object>} - Parsed feed response
//  */
// export async function fetchStation(stationId, token) {
//   const url = `${WAQI_BASE_URL}/feed/${stationId}/?token=${token}`;
//   const response = await fetch(url);
//   return response.json();
// }

// /**
//  * Process a single station's data and update all schools using it.
//  * @param {number} stationId - Station ID
//  * @param {string} token - WAQI API token
//  * @param {Object} storeImpl - Store implementation
//  * @returns {Promise<Object>} - Result summary
//  */
// export async function processStation(stationId, token, storeImpl = store) {
//   // Fetch the station data
//   let feedResponse;
//   try {
//     feedResponse = await fetchStation(stationId, token);
//   } catch (error) {
//     return {
//       stationId,
//       success: false,
//       error: `Fetch failed: ${error.message}`,
//     };
//   }

//   // Get all schools using this station
//   const allSchools = await storeImpl.listSchools();
//   const stationSchools = allSchools.filter(
//     s => s.station_id === stationId && !s.is_demo_school
//   );

//   if (stationSchools.length === 0) {
//     return { stationId, success: true, schoolsUpdated: 0, reason: 'No schools for station' };
//   }

//   // Use the first school's stored timestamp as reference for "not newer" check
//   // All schools for the same station should have the same timestamp
//   const storedTimestamp = stationSchools[0].source_timestamp;

//   // Process the feed (parse, check stale, check timestamp)
//   const now = new Date();
//   const result = processFeed(feedResponse, storedTimestamp, now);

//   if (!result.success) {
//     return {
//       stationId,
//       success: true,
//       schoolsUpdated: 0,
//       reason: result.reason,
//     };
//   }

//   const parsed = result.parsed;

//   // Convert to level
//   const conversion = convertToLevel(parsed.pm25Subindex, parsed.pm10Subindex);

//   // Prepare attribution for storage
//   const attribution = parsed.attributions.map(a => ({
//     name: a.name,
//     url: a.url,
//   }));

//   // Update each school
//   const updateData = {
//     pm25_subindex: conversion.est_pm25 !== null ? Math.round(conversion.est_pm25 * 10) / 10 : null,
//     pm10_subindex: conversion.est_pm10 !== null ? Math.round(conversion.est_pm10 * 10) / 10 : null,
//     est_pm25: conversion.est_pm25,
//     est_pm10: conversion.est_pm10,
//     current_level: conversion.level,
//     category_label: conversion.level !== null ? CATEGORY_LABELS[conversion.level] : null,
//     driving_pollutant: conversion.driving_pollutant,
//     source_timestamp: parsed.timestamp,
//     last_updated: now.toISOString(),
//     station_name: feedResponse.data?.city?.name || null,
//     attribution,
//   };

//   for (const school of stationSchools) {
//     // Store previous level for alert detection
//     const prevLevel = school.current_level;

//     await storeImpl.updateSchoolReading(school.school_id, {
//       ...updateData,
//       prev_level: prevLevel,
//     });

//     if (process.env.ALERT_TOPIC_ARN && prevLevel !== null && conversion.level !== null && conversion.level > prevLevel) {
//       const alert = await sendAlert({ ...school, ...updateData }, prevLevel, conversion.level);
//       await storeImpl.putAlert({
//         school_id: school.school_id,
//         timestamp: now.toISOString(),
//         from_level: prevLevel,
//         to_level: conversion.level,
//         status: alert.sns_status,
//         is_demo: false,
//       });
//     }
//   }

//   return {
//     stationId,
//     success: true,
//     schoolsUpdated: stationSchools.length,
//     level: conversion.level,
//     driving: conversion.driving_pollutant,
//   };
// }

// /**
//  * Lambda handler: Fetch all stations and update schools.
//  */
// export async function handler(event, context) {
//   const token = process.env.WAQI_TOKEN;

//   if (!token) {
//     throw new Error('WAQI_TOKEN environment variable is required');
//   }

//   // Get all unique station IDs from seed data
//   // const stations = getStations();
//   // const results = [];
//   // Get all schools from DynamoDB
//   const schools = await store.listSchools();
  
//   // Extract unique station names to fetch from WAQI, ignoring empty/null values
//   // const stations = [...new Set(schools.map(s => s.station_name).filter(Boolean))];
//   const stations = [...new Set(schools.map(s => s.station_id).filter(Boolean))];
//   const results = [];
//   // Process each station (one fetch per station, applied to all its schools)
//   // Process each station (one fetch per station, applied to all its schools)
//   for (const station of stations) {
//     const result = await processStation(station, token, store);
//     results.push(result);
//   }

//   // Summary
//   const summary = {
//     timestamp: new Date().toISOString(),
//     stationsProcessed: results.length,
//     stationsWithUpdates: results.filter(r => r.schoolsUpdated > 0).length,
//     totalSchoolsUpdated: results.reduce((sum, r) => sum + (r.schoolsUpdated || 0), 0),
//     errors: results.filter(r => !r.success),
//   };

//   console.log('Fetch complete:', JSON.stringify(summary, null, 2));

//   return summary;
// }

// // Export for testing
// export { CATEGORY_LABELS };
import store from './store.js';
import { convertToLevel } from './convert.js';

const WAQI_BASE_URL = 'https://api.waqi.info';
export const CATEGORY_LABELS = { 0: 'Good / Satisfactory', 1: 'Moderate', 2: 'Poor', 3: 'Very Poor / Severe' };

export async function fetchStation(stationId, token) {
  const cleanId = String(stationId).replace(/^@/, '');
  const path = /^\d+$/.test(cleanId) ? `@${cleanId}` : stationId;
  const url = `${WAQI_BASE_URL}/feed/${path}/?token=${token}`;
  const response = await fetch(url);
  return response.json();
}

export async function processStation(stationId, token, storeImpl = store) {
  let feedResponse;
  try {
    feedResponse = await fetchStation(stationId, token);
  } catch (error) {
    return { stationId, success: false, error: error.message };
  }

  const allSchools = await storeImpl.listSchools();
  const stationSchools = allSchools.filter(s => s.station_id === stationId && !s.is_demo_school);
  
  if (stationSchools.length === 0) {
    return { stationId, success: true, schoolsUpdated: 0, reason: 'No schools' };
  }

  if (feedResponse.status !== 'ok' || !feedResponse.data) {
    return { stationId, success: true, schoolsUpdated: 0, reason: `API error: ${feedResponse.status}` };
  }

  const data = feedResponse.data;
  const parsed = {
    timestamp: data.time?.iso,
    pm25Subindex: data.iaqi?.pm25?.v ?? null,
    pm10Subindex: data.iaqi?.pm10?.v ?? null,
    attributions: data.attributions || []
  };

  const conversion = convertToLevel(parsed.pm25Subindex, parsed.pm10Subindex);
  const now = new Date();

  const updateData = {
    pm25Subindex: parsed.pm25Subindex ?? null,
    pm10Subindex: parsed.pm10Subindex ?? null,
    pm25_subindex: conversion.est_pm25 !== null ? Math.round(conversion.est_pm25 * 10) / 10 : null,
    pm10_subindex: conversion.est_pm10 !== null ? Math.round(conversion.est_pm10 * 10) / 10 : null,
    est_pm25: conversion.est_pm25,
    est_pm10: conversion.est_pm10,
    current_level: conversion.level,
    category_label: conversion.level !== null ? CATEGORY_LABELS[conversion.level] : 'Data unavailable',
    driving_pollutant: conversion.driving_pollutant,
    source_timestamp: parsed.timestamp,
    last_updated: now.toISOString(),
    station_name: data.city?.name || null,
    attribution: parsed.attributions.map(a => ({ name: a.name, url: a.url })),
  };

  for (const school of stationSchools) {
    await storeImpl.updateSchoolReading(school.school_id, { ...updateData, prev_level: school.current_level });
  }

  return { stationId, success: true, schoolsUpdated: stationSchools.length, level: conversion.level };
}

export async function handler(event, context) {
  const token = process.env.WAQI_TOKEN;
  const schools = await store.listSchools();
  const stations = [...new Set(schools.map(s => s.station_id).filter(Boolean))];
  const results = [];
  
  for (const station of stations) {
    results.push(await processStation(station, token, store));
  }
  
  const summary = {
    timestamp: new Date().toISOString(),
    stationsProcessed: results.length,
    stationsWithUpdates: results.filter(r => r.schoolsUpdated > 0).length,
    totalSchoolsUpdated: results.reduce((sum, r) => sum + (r.schoolsUpdated || 0), 0),
    errors: results.filter(r => !r.success || (r.schoolsUpdated === 0 && r.reason !== 'No schools')),
  };
  
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}