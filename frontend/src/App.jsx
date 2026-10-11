import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'

const levelClass = level => level === null ? 'unavailable' : `level-${level}`
const schoolArea = school => school.area || school.station_name || school.display_name.split(',').slice(1).join(',').trim()
const schoolStation = school => school.station_name || schoolArea(school)

function pollutantValue(value) {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)} µg/m³`
}

function SchoolCard({ school, onSubscribe }) {
  return (
    <article className={`school-card ${levelClass(school.level)}`}>
      <div className="card-top">
        <span className="level-badge">{school.level === null ? 'Unavailable' : `Level ${school.level}`}</span>
        {school.is_demo_school && <span className="demo-tag">DEMO</span>}
      </div>
      <h2>{school.display_name}</h2>
      <p className="category">{school.category_label}</p>
      <div className="pollutants">
        <div><strong>PM2.5</strong><span>{pollutantValue(school.est_pm25)}</span></div>
        <div><strong>PM10</strong><span>{pollutantValue(school.est_pm10)}</span></div>
      </div>
      <p>{school.recommendation}</p>
      {school.driving_pollutant && <small>Driving pollutant: {school.driving_pollutant.toUpperCase()}</small>}
      {school.reading_timestamp && <small>Reading: {new Date(school.reading_timestamp).toLocaleString()}</small>}
      {school.station_name && <small>Station: {school.station_name}</small>}
      {!school.is_demo_school && (
        <button type="button" onClick={() => onSubscribe(school)} aria-label={`Subscribe to alerts for ${school.display_name}`}>
          Subscribe
        </button>
      )}
    </article>
  )
}

function SubscribeDrawer({ school, form, busy, error, success, onChange, onClose, onSubmit }) {
  if (!school) return null

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="subscribe-drawer" role="dialog" aria-modal="true" aria-labelledby="subscribe-title">
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close subscribe form">×</button>
        <p className="eyebrow">SCHOOL ALERTS</p>
        <h2 id="subscribe-title">Subscribe to {school.display_name}</h2>
        <p>Confirm your email to receive alerts when this school’s air quality worsens.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="subscribe-email">Email</label>
          <input id="subscribe-email" name="email" type="email" value={form.email} onChange={onChange} required autoFocus />
          <label htmlFor="subscribe-role">Role</label>
          <select id="subscribe-role" name="role" value={form.role} onChange={onChange}>
            <option value="parent">Parent</option>
            <option value="principal">Principal</option>
            <option value="pe_teacher">PE teacher</option>
          </select>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
          <div className="subscribe-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? 'Subscribing…' : 'Subscribe'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function App() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alertStatus, setAlertStatus] = useState(null)
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoKey, setDemoKey] = useState(String(import.meta.env.VITE_DEMO_KEY || ''))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArea, setSelectedArea] = useState('All Areas')
  const [selectedStation, setSelectedStation] = useState('All Stations')
  const [subscribeSchool, setSubscribeSchool] = useState(null)
  const [subscribeForm, setSubscribeForm] = useState({ email: '', role: 'parent' })
  const [subscribeBusy, setSubscribeBusy] = useState(false)
  const [subscribeError, setSubscribeError] = useState('')
  const [subscribeSuccess, setSubscribeSuccess] = useState('')

  const loadSchools = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.listSchools()
      setSchools(Array.isArray(data?.schools) ? data.schools : [])
    } catch (requestError) {
      setSchools([])
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSchools()
    const intervalId = setInterval(loadSchools, 5 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [loadSchools])

  const areas = useMemo(() => [...new Set(schools.map(schoolArea).filter(Boolean))].sort(), [schools])
  const stations = useMemo(() => [...new Set(schools.map(schoolStation).filter(Boolean))].sort(), [schools])
  const filteredSchools = useMemo(() => schools.filter(school => {
    const query = searchTerm.trim().toLowerCase()
    const area = schoolArea(school)
    return (!query || school.display_name.toLowerCase().includes(query))
      && (selectedArea === 'All Areas' || area === selectedArea)
      && (selectedStation === 'All Stations' || schoolStation(school) === selectedStation)
  }), [schools, searchTerm, selectedArea, selectedStation])

  const openSubscribe = school => {
    setSubscribeSchool(school)
    setSubscribeForm({ email: '', role: 'parent' })
    setSubscribeError('')
    setSubscribeSuccess('')
  }

  const closeSubscribe = () => {
    setSubscribeSchool(null)
    setSubscribeError('')
    setSubscribeSuccess('')
  }

  const submitSubscribe = async event => {
    event.preventDefault()
    setSubscribeError('')
    setSubscribeSuccess('')
    setSubscribeBusy(true)
    try {
      const result = await api.subscribe({ schoolId: subscribeSchool.school_id, ...subscribeForm })
      setSubscribeSuccess(result?.message || 'Subscription request sent. Check your email to confirm.')
    } catch (requestError) {
      setSubscribeError(requestError.message)
    } finally {
      setSubscribeBusy(false)
    }
  }

  const updateSubscribeForm = event => {
    const { name, value } = event.target
    setSubscribeForm(current => ({ ...current, [name]: value }))
  }

  const simulate = async severity => {
    if (!demoKey.trim()) {
      setAlertStatus({ message: 'Demo key is not configured.', sns_status: 'Configuration error' })
      return
    }
    setDemoBusy(true)
    setAlertStatus(null)
    try {
      const result = await api.simulate(severity, demoKey.trim())
      setAlertStatus(result?.alert || { message: 'Simulation completed.', sns_status: 'No worsening transition' })
      await loadSchools()
    } catch (requestError) {
      setAlertStatus({ message: requestError.message, sns_status: 'Not sent' })
    } finally {
      setDemoBusy(false)
    }
  }

  const resetDemo = async () => {
    if (!demoKey.trim()) {
      setAlertStatus({ message: 'Demo key is not configured.', sns_status: 'Configuration error' })
      return
    }
    setDemoBusy(true)
    setAlertStatus(null)
    try {
      await api.resetSimulation(demoKey.trim())
      setAlertStatus({ message: 'Demo school reset to baseline.', sns_status: 'No email sent' })
      await loadSchools()
    } catch (requestError) {
      setAlertStatus({ message: requestError.message, sns_status: 'Not completed' })
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">SAFE RECESS · DELHI</p>
          <h1>School air quality at a glance.</h1>
          <p className="subtitle">See the actual estimated PM2.5 and PM10 values, then subscribe to alerts for one school.</p>
        </div>
      </header>
      <section className="notice"><strong>Estimated readings</strong><span>Values are estimated from WAQI AQI sub-indices using the configured EPA conversion. Confirmed subscribers receive an email when their selected school worsens.</span></section>
      {error && <p className="connection-note" role="alert">API unavailable — showing error. {error}</p>}
      {loading && <p className="connection-note" role="status">Loading school data…</p>}
      <div className="legend">{[['level-0', 'Good / Satisfactory'], ['level-1', 'Moderate'], ['level-2', 'Poor'], ['level-3', 'Very Poor / Severe']].map(([className, text]) => <span key={className}><i className={className} />{text}</span>)}</div>
      <section className="dashboard-heading"><div><p className="eyebrow">CURRENT READINGS</p><h2>Schools</h2></div><span>{loading ? 'Loading…' : `${filteredSchools.length} schools monitored`}</span></section>
      <section className="controls" aria-label="School filters">
        <label>Search schools<input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search schools…" /></label>
        <label>Area<select value={selectedArea} onChange={event => setSelectedArea(event.target.value)}><option>All Areas</option>{areas.map(area => <option key={area}>{area}</option>)}</select></label>
        <label>Station<select value={selectedStation} onChange={event => setSelectedStation(event.target.value)}><option>All Stations</option>{stations.map(station => <option key={station}>{station}</option>)}</select></label>
      </section>
      <section className="school-grid" aria-label="List of schools with air quality status">
        {filteredSchools.filter(school => !school.is_demo_school).map(school => <SchoolCard key={school.school_id} school={school} onSubscribe={openSubscribe} />)}
        {!loading && filteredSchools.filter(school => !school.is_demo_school).length === 0 && <p className="no-results">No schools match the current filters.</p>}
      </section>
      {schools.find(school => school.is_demo_school) && <section className="demo-panel"><div><p className="eyebrow">TEST THE ALERT FLOW</p><h2>Demo school simulation</h2><p>Only the labelled demo school changes. Subscribers must confirm their email before receiving SNS alerts.</p></div><div className="demo-actions"><label className="demo-key-label" htmlFor="demo-key">Demo key<input id="demo-key" type="password" value={demoKey} onChange={event => setDemoKey(event.target.value)} placeholder="Paste backend demo key" autoComplete="off" /></label>{['moderate', 'poor', 'very_poor'].map(severity => <button key={severity} disabled={demoBusy || !demoKey.trim()} onClick={() => simulate(severity)}>{severity.replace('_', ' ')}</button>)}<button className="secondary" disabled={demoBusy || !demoKey.trim()} onClick={resetDemo}>Reset</button></div></section>}
      {alertStatus && <section className="alert-status" role="status"><div><p className="eyebrow">ALERT STATUS</p><p>{alertStatus.message}</p></div><strong>{alertStatus.sns_status}</strong></section>}
      <footer>Data credits: World Pollution Index Project and the originating agency returned by the feed. SafeRecess shows estimated categories and is not medical advice.</footer>
      <SubscribeDrawer school={subscribeSchool} form={subscribeForm} busy={subscribeBusy} error={subscribeError} success={subscribeSuccess} onChange={updateSubscribeForm} onClose={closeSubscribe} onSubmit={submitSubscribe} />
    </main>
  )
}

export default App
