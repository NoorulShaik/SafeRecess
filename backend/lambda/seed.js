/**
 * Seed DynamoDB with stations and schools from data/stations_and_schools.json.
 * Reads DEMO_INBOX from environment for the demo school contact.
 *
 * Usage: node seed.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import store from './store.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const rootDataPath = join(moduleDirectory, '..', '..', 'data', 'stations_and_schools.json');
const bundledDataPath = join(moduleDirectory, 'data', 'stations_and_schools.json');

function loadSeedData() {
  try {
    return JSON.parse(readFileSync(rootDataPath, 'utf8'));
  } catch (rootError) {
    try {
      return JSON.parse(readFileSync(bundledDataPath, 'utf8'));
    } catch {
      throw new Error(`Unable to load stations and schools data from ${rootDataPath}`, { cause: rootError });
    }
  }
}

const data = loadSeedData();

/**
 * Load and seed school data.
 * @param {Object} options - { demoInbox: string } - email for demo school
 * @param {Object} storeImpl - Optional store implementation (defaults to real store)
 */
export async function seedSchools(options = {}, storeImpl = store) {
  const { demoInbox = process.env.DEMO_INBOX } = options;
  if (!demoInbox) {
    throw new Error('DEMO_INBOX environment variable is required');
  }

  const schools = [];

  // Process regular schools (two per station)
  for (const school of data.schools) {
    const contactEmail = school.contact_email === 'REPLACE_WITH_YOUR_DEMO_INBOX'
      ? demoInbox
      : school.contact_email;

    schools.push({
      school_id: school.school_id,
      display_name: school.display_name,
      station_id: school.station_id,
      contact_email: contactEmail,
      // Initial state - no readings yet
      pm25_subindex: null,
      pm10_subindex: null,
      est_pm25: null,
      est_pm10: null,
      current_level: null,
      category_label: null,
      driving_pollutant: null,
      source_timestamp: null,
      last_updated: null,
      station_name: null,
      attribution: null,
      prev_level: null,
      is_demo_school: false,
      is_simulated: false,
    });
  }

  // Process demo school
  if (data.demo_school) {
    const demo = data.demo_school;
    const demoEmail = demo.contact_email === 'REPLACE_WITH_YOUR_DEMO_INBOX'
      ? demoInbox
      : demo.contact_email;

    schools.push({
      school_id: demo.school_id,
      display_name: demo.display_name,
      station_id: null, // Demo school has no station
      contact_email: demoEmail,
      is_demo_school: true,
      baseline_level: demo.baseline_level ?? 0,
      // Initial state
      pm25_subindex: null,
      pm10_subindex: null,
      est_pm25: null,
      est_pm10: null,
      current_level: demo.baseline_level ?? 0,
      category_label: 'Good / Satisfactory',
      driving_pollutant: null,
      source_timestamp: null,
      last_updated: null,
      station_name: demo.station_id ? data.stations.find(s => s.station_id === demo.station_id)?.name || null : null,
      attribution: null,
      prev_level: null,
      is_simulated: false,
    });
  }

  // Write to store
  for (const school of schools) {
    await storeImpl.putSchool(school);
  }

  return {
    seeded: schools.length,
    schools: schools.map(s => ({ school_id: s.school_id, display_name: s.display_name })),
  };
}

/**
 * Get the list of stations from seed data.
 */
export function getStations() {
  return data.stations;
}

// Run if called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedSchools()
    .then(result => {
      console.log(`Seeded ${result.seeded} items.`);
    })
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
