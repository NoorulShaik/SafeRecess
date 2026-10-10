import { convertToLevel, concentrationToAqi, loadConfig } from './convert.js';
import { sendAlert, recommendationForLevel } from './alerts.js';
import store from './store.js';

const config = {
  0: 'Good / Satisfactory',
  1: 'Moderate',
  2: 'Poor',
  3: 'Very Poor / Severe',
};

const simulationState = new Map();
const requestState = new Map();

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

    if (method === 'POST' && path === '/simulate') {
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
      await storeImpl.updateSchoolReading('demo', {
        current_level: 0, category_label: config[0], est_pm25: null, est_pm10: null,
        pm25Subindex: null, pm10Subindex: null,
        pm25_subindex: null, pm10_subindex: null, driving_pollutant: null,
        is_simulated: false, sim_expires_at: null, source_timestamp: null, last_updated: new Date().toISOString(),
      });
      return json(200, { school: publicSchool({ ...(await storeImpl.getSchool('demo')), current_level: 0 }) });
    }

    return json(404, { error: 'Not found' });
  };
}

export const handler = createApi();
