const configuredBase = String(import.meta.env.VITE_API_URL || '').trim()
const API_BASE = configuredBase.replace(/\/+$/, '')

function apiUrl(endpoint) {
  const path = `/${String(endpoint).replace(/^\/+/, '')}`
  return API_BASE.endsWith(path) ? API_BASE : `${API_BASE}${path}`
}

async function request(endpoint, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(apiUrl(endpoint), {
      ...options,
      signal: options.signal || controller.signal,
    })
    let payload = null

    try {
      payload = await response.json()
    } catch {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      throw new Error('The API returned an invalid JSON response')
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Request failed with status ${response.status}`)
    }

    return payload
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.')
    }
    throw error instanceof Error ? error : new Error('The request failed')
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  listSchools: () => request('/schools'),
  subscribe: ({ schoolId, email, role }) => request('/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ school_id: schoolId, email, role }),
  }),
  simulate: (severity, demoKey) => request('/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-demo-key': demoKey },
    body: JSON.stringify({ severity }),
  }),
  resetSimulation: demoKey => request('/simulate/reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-demo-key': demoKey },
  }),
}

export { apiUrl }
