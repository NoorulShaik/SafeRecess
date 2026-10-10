/**
 * Data store abstraction layer.
 * All database access goes through this module.
 * Swap implementations by changing the storeImpl export.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

// ─────────────────────────────────────────────────────────────────────────────
// DynamoDB implementation
// ─────────────────────────────────────────────────────────────────────────────

const TABLE_NAME = process.env.SCHOOLS_TABLE || 'SafeRecess-Schools';
const ALERTS_TABLE_NAME = process.env.ALERTS_TABLE_NAME || 'SafeRecess-Alerts';

let ddbClient;
let docClient;

function getDocClient() {
  if (!docClient) {
    ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
    docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

/**
 * Get a school by ID.
 * @param {string} schoolId
 * @returns {Promise<Object|null>} - School object or null if not found
 */
async function getSchool(schoolId) {
  const client = getDocClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { school_id: schoolId },
    })
  );
  return result.Item || null;
}

/**
 * Save or update a school record.
 * @param {Object} school - School object with all fields
 * @returns {Promise<void>}
 */
async function putSchool(school) {
  const client = getDocClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: school,
    })
  );
}

/**
 * List all schools.
 * @returns {Promise<Array<Object>>} - Array of school objects
 */
async function listSchools() {
  const client = getDocClient();
  const result = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );
  return result.Items || [];
}

/**
 * Update a school's reading data after a fetch.
 * @param {string} schoolId
 * @param {Object} data - { pm25Subindex, pm10Subindex, est_pm25, est_pm10,
 *                          current_level, category_label, driving_pollutant,
 *                          source_timestamp, last_updated, station_name, attribution }
 * @returns {Promise<void>}
 */
async function updateSchoolReading(schoolId, data) {
  const client = getDocClient();
  await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { school_id: schoolId },
      UpdateExpression: [
        'SET pm25_subindex = :pm25',
        'pm10_subindex = :pm10',
        'est_pm25 = :est_pm25',
        'est_pm10 = :est_pm10',
        'current_level = :level',
        'category_label = :category',
        'driving_pollutant = :driving',
        'source_timestamp = :ts',
        'last_updated = :now',
      ].join(', '),
      ExpressionAttributeValues: {
        ':pm25': data.pm25Subindex,
        ':pm10': data.pm10Subindex,
        ':est_pm25': data.est_pm25,
        ':est_pm10': data.est_pm10,
        ':level': data.current_level,
        ':category': data.category_label,
        ':driving': data.driving_pollutant,
        ':ts': data.source_timestamp,
        ':now': data.last_updated,
      },
    })
  );
}

/**
 * Log an alert.
 * @param {Object} alert - { school_id, timestamp, from_level, to_level, status, is_demo }
 * @returns {Promise<void>}
 */
async function putAlert(alert) {
  const client = getDocClient();
  await client.send(
    new PutCommand({
      TableName: ALERTS_TABLE_NAME,
      Item: alert,
    })
  );
}

/**
 * List recent alerts for a school.
 * @param {string} schoolId
 * @param {number} limit - Max number of alerts to return
 * @returns {Promise<Array<Object>>}
 */
async function listAlerts(schoolId, limit = 10) {
  const client = getDocClient();
  const result = await client.send(
    new ScanCommand({
      TableName: ALERTS_TABLE_NAME,
      FilterExpression: 'school_id = :sid',
      ExpressionAttributeValues: {
        ':sid': schoolId,
      },
      Limit: limit,
    })
  );
  return result.Items || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory implementation for testing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an in-memory store for testing.
 * Returns a fresh store instance with isolated state.
 */
export function createMockStore() {
  const schools = new Map();
  const alerts = [];

  return {
    schools,
    alerts,

    async getSchool(schoolId) {
      return schools.get(schoolId) || null;
    },

    async putSchool(school) {
      schools.set(school.school_id, { ...school });
    },

    async listSchools() {
      return Array.from(schools.values());
    },

    async updateSchoolReading(schoolId, data) {
      const school = schools.get(schoolId);
      if (school) {
        schools.set(schoolId, { ...school, ...data });
      }
    },

    async putAlert(alert) {
      alerts.push({ ...alert });
    },

    async listAlerts(schoolId, limit = 10) {
      return alerts
        .filter(a => a.school_id === schoolId)
        .slice(-limit);
    },

    // Test helpers
    reset() {
      schools.clear();
      alerts.length = 0;
    },

    seed(schoolList) {
      for (const s of schoolList) {
        schools.set(s.school_id, { ...s });
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export the real implementation as default
// ─────────────────────────────────────────────────────────────────────────────

const dynamoStore = {
  getSchool,
  putSchool,
  listSchools,
  updateSchoolReading,
  putAlert,
  listAlerts,
};

// Default export: real DynamoDB implementation
// For tests, use createMockStore() instead
export default dynamoStore;

// Also export individual functions for convenience
export {
  getSchool,
  putSchool,
  listSchools,
  updateSchoolReading,
  putAlert,
  listAlerts,
};
