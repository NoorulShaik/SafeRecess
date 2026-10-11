import { convertToLevel, concentrationToAqi, loadConfig } from './convert.js';
import { sendAlert, recommendationForLevel, subscribeEmailToSchool } from './alerts.js';
import store from './store.js';

const config = {
  0: 'Good / Satisfactory',
  1: 'Moderate',
  2: 'Poor',
  3: 'Very Poor / Severe',
};

const simulationState = new Map();
const requestState = new Map();

// Demo email tracking (in-memory, reset on Lambda recycle)
const demoEmailState = new Map();

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  };
}

function throttled(key, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const recent = (requestState.get(key) || []).filter(time => now - time < windowMs);
  if (recent.length >= limit) return true;
  recent.push(now);
  requestState.set(key, recent);
  return false;
}

// Validate demo key from header
function validateDemoKey(event) {
  const demoKey = process.env.DEMO_KEY;
  if (!demoKey) {
    // If no demo key is configured, allow access (for backwards compatibility during transition)
    return true;
  }

  const providedKey = event.headers?.['x-demo-key'] ||
                    event.headers?.['X-Demo-Key'] ||
                    event.multiValueHeaders?.['x-demo-key']?.[0] ||
                    event.multiValueHeaders?.['X-Demo-Key']?.[0];

  return demoKey === providedKey;
}

function publicSchool(school) {
  const now = new Date();
  const staleAt = Number(process.env.STALE_AFTER_HOURS || 3) * 60 * 60 * 1000;
  const stale = school.source_timestamp &&
    now.getTime() - new Date(school.source_timestamp).getTime() > staleAt;
  const unavailable = !school.is_demo_school && (!school.source_timestamp || stale);
  const level = unavailable ? null : school.current_level;
  return {
    school_id: school.school_id,
    display_name: school.display_name,
    station_name: school.station_name,
    level,
    category_label: level === null ? 'Data unavailable' : (school.category_label || config[level]),
    recommendation: level === null ? recommendationForLevel(null) : recommendationForLevel(level),
    driving_pollutant: school.driving_pollutant,
    est_pm25: school.est_pm25,
    est_pm10: school.est_pm10,
    reading_timestamp: school.source_timestamp,
    last_updated: school.last_updated,
    attribution: school.attribution || [],
    is_demo_school: Boolean(school.is_demo_school),
    is_simulated: Boolean(school.is_simulated),
    sim_expires_at: school.sim_expires_at || null,
  };
}

function sortedSchools(schools) {
  return schools.sort((a, b) => (b.level ?? -1) - (a.level ?? -1));
}

export function createApi(storeImpl = store, options = {}) {
  const publish = options.publish;
  return async function apiHandler(event = {}) {
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const path = event.rawPath || event.path || '/schools';
    const sourceIp = event.requestContext?.http?.sourceIp || 'anonymous';

    // Throttling for subscribe endpoint (stricter limits)
    if (path === '/subscribe' &&
        throttled(`${sourceIp}:${path}`, 5, 60_000)) { // 5 requests per minute
      return json(429, { error: 'Too many requests. Please try again shortly.' });
    }

    // Throttling for simulate endpoints (already had this, keeping it)
    if (throttled(`${sourceIp}:${path}`, path.startsWith('/simulate') ? 10 : 60)) {
      return json(429, { error: 'Too many requests. Please try again shortly.' });
    }

    if (method === 'GET' && path === '/schools') {
      const schools = await storeImpl.listSchools();
      return json(200, { schools: sortedSchools(schools.map(publicSchool)) });
    }

    if (method === 'GET' && path.startsWith('/schools/')) {
      const id = path.split('/').pop();
      const school = await storeImpl.getSchool(id);
      return school ? json(200, publicSchool(school)) : json(404, { error: 'School not found' });
    }

    if (method === 'GET' && path === '/alerts') {
      const schoolId = event.queryStringParameters?.school_id || 'demo';
      return json(200, { alerts: await storeImpl.listAlerts(schoolId) });
    }

    if (method === 'POST' && path === '/subscribe') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return json(400, { error: 'Request body must be valid JSON' });
      }

      const schoolId = typeof body.school_id === 'string' ? body.school_id.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';

      // Validation
      if (!schoolId) {
        return json(400, { error: 'school_id is required' });
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(400, { error: 'A valid email is required' });
      }

      if (!role || !['parent', 'principal', 'pe_teacher'].includes(role)) {
        return json(400, { error: 'role must be parent, principal, or pe_teacher' });
      }

      // Reject demo school subscriptions
      const school = await storeImpl.getSchool(schoolId);
      if (!school) {
        return json(404, { error: 'School not found' });
      }

      if (school.is_demo_school) {
        return json(403, { error: 'Cannot subscribe to demo school' });
      }

      // Additional validation: limit schools per request (if school_ids array was intended)
      // Based on FRONTEND.md, it seems like school_ids should be an array for multi-select
      // But the current implementation only handles single school_id
      // Let's check if school_ids is provided as array and handle accordingly
      let schoolIds = [];
      if (Array.isArray(body.school_ids)) {
        schoolIds = body.school_ids.map(id => id.trim()).filter(Boolean);
        // Validate each school ID
        if (schoolIds.length === 0) {
          return json(400, { error: 'At least one school must be selected' });
        }

        // Check if any school is the demo school
        for (const id of schoolIds) {
          const s = await storeImpl.getSchool(id);
          if (!s) {
            return json(404, { error: `School not found: ${id}` });
          }
          if (s.is_demo_school) {
            return json(403, { error: 'Cannot subscribe to demo school' });
          }
        }

        // Cap on schools per request (abuse limit)
        if (schoolIds.length > 10) {
          return json(400, { error: 'Too many schools selected. Maximum is 10.' });
        }
      } else if (schoolId) {
        // Backward compatibility: single school_id
        schoolIds = [schoolId];
      } else {
        return json(400, { error: 'school_id or school_ids is required' });
      }

      // Per-email cooldown (abuse limit) - 1 request per email per 5 minutes
      const emailCooldownKey = `email_cooldown:${email}`;
      const lastRequestTime = demoEmailState.get(emailCooldownKey) || 0;
      const now = Date.now();
      if (now - lastRequestTime < 5 * 60 * 1000) { // 5 minutes
        return json(429, { error: 'Please wait 5 minutes before making another subscription request with this email' });
      }

      // Update cooldown timestamp
      demoEmailState.set(emailCooldownKey, now);

      // Clean up old cooldown entries periodically (every 100 requests)
      if (demoEmailState.size > 100) {
        for (const [key, timestamp] of demoEmailState.entries()) {
          if (now - timestamp > 30 * 60 * 1000) { // Older than 30 minutes
            demoEmailState.delete(key);
          }
        }
      }

      try {
        // Use the updated subscribeEmailToSchool function that handles multiple schools
        const result = await subscribeEmailToSchool(email, schoolIds);

        // Prepare school list for message
        const schoolNames = [];
        for (const id of schoolIds) {
          const school = await storeImpl.getSchool(id);
          if (school) {
            schoolNames.push(school.display_name);
          }
        }
        const schoolList = schoolNames.join(', ');

        return json(202, {
          message: `Check ${email} to confirm alerts for ${schoolList}.`,
          status: result.status,
        });
      } catch (error) {
        console.error('Subscription error:', error);
        return json(500, { error: 'Failed to process subscription request' });
      }
    }

    if (method === 'POST' && path === '/simulate') {
      // Validate demo key
      if (!validateDemoKey(event)) {
        return json(403, { error: 'Demo key required' });
      }

      const demo = await storeImpl.getSchool('demo');
      if (!demo?.is_demo_school) return json(404, { error: 'Demo school is not configured' });
      const previous = demo.current_level ?? demo.baseline_level ?? 0;
      const body = JSON.parse(event.body || '{}');
      const severity = body.severity || 'poor';
      const target = { moderate: { pm25: 75, pm10: 60 }, poor: { pm25: 105, pm10: 60 }, very_poor: { pm25: 180, pm10: 60 } }[severity];
      if (!target) return json(400, { error: 'severity must be moderate, poor, or very_poor' });
      const lastSim = demo.last_sim_at ? Date.now() - new Date(demo.last_sim_at).getTime() : Infinity;
      if (lastSim < 3 * 60 * 1000) return json(429, { error: 'Demo cooldown is active' });
      const pm25 = concentrationToAqi(target.pm25, loadConfig().epa_pm25[loadConfig().epa_pm25_version]);
      const pm10 = concentrationToAqi(target.pm10, loadConfig().epa_pm10);
      const conversion = convertToLevel(pm25, pm10);
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await storeImpl.updateSchoolReading('demo', {
        current_level: conversion.level, category_label: config[conversion.level],
        est_pm25: target.pm25, est_pm10: target.pm10,
        pm25Subindex: pm25, pm10Subindex: pm10,
        pm25_subindex: pm25, pm10_subindex: pm10,
        driving_pollutant: conversion.driving_pollutant, is_simulated: true,
        sim_expires_at: expires, last_sim_at: new Date().toISOString(), source_timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      });
      let alert = null;
      if (conversion.level > previous && (demo.demo_emails_this_hour || 0) < 5) {
        alert = await sendAlert({ ...demo, attribution: demo.attribution || [] }, previous, conversion.level, { isDemo: true, publish });
        await storeImpl.putAlert({ school_id: 'demo', timestamp: new Date().toISOString(), from_level: previous, to_level: conversion.level, status: alert.sns_status, is_demo: true });
      }
      simulationState.set('demo', expires);
      return json(200, { school: publicSchool({ ...demo, ...conversion, current_level: conversion.level, category_label: config[conversion.level], is_simulated: true, sim_expires_at: expires }), alert });
    }

    if (method === 'POST' && path === '/simulate/reset') {
      // Validate demo key
      if (!validateDemoKey(event)) {
        return json(403, { error: 'Demo key required' });
      }

      await storeImpl.updateSchoolReading('demo', {
        current_level: 0, category_label: config[0], est_pm25: null, est_pm10: null,
        pm25Subindex: null, pm10Subindex: null,
        pm25_subindex: null, pm10_subindex: null, driving_pollutant: null,
        is_simulated: false, sim_expires_at: null, last_sim_at: null, source_timestamp: null,
        last_updated: new Date().toISOString(),
      });
      return json(200, { school: publicSchool({ ...(await storeImpl.getSchool('demo')), current_level: 0 }) });
    }

    return json(404, { error: 'Not found' });
  };
}

export const handler = createApi();