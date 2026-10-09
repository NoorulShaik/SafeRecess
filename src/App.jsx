import { useCallback, useEffect, useState } from 'react'

const demoSchools = [
  ['najafgarh-a', 'Sample School, Najafgarh A', 0],
  ['najafgarh-b', 'Sample School, Najafgarh B', 0],
  ['mundka-a', 'Sample School, Mundka A', 2],
  ['mundka-b', 'Sample School, Mundka B', 2],
  ['anand-vihar-a', 'Sample School, Anand Vihar A', 1],
  ['anand-vihar-b', 'Sample School, Anand Vihar B', 1],
  ['okhla-a', 'Sample School, Okhla A', 0],
  ['okhla-b', 'Sample School, Okhla B', 0],
  ['rk-puram-a', 'Sample School, R.K. Puram A', 1],
  ['rk-puram-b', 'Sample School, R.K. Puram B', 1],
  ['demo', 'Demo School (simulation only)', 0],
].map(([school_id, display_name, level]) => ({
  school_id, display_name, level, category_label: level === 0 ? 'Good / Satisfactory' : level === 1 ? 'Moderate' : 'Poor',
  recommendation: level === 0 ? 'Outdoor activities can continue; keep an eye on sensitive students.' : level === 1 ? 'Sensitive students should take breaks and outdoor activity should be monitored.' : 'Move assembly and sports indoors; avoid prolonged outdoor exposure.',
  is_demo_school: school_id === 'demo', is_simulated: false,
}))

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const levelClass = level => level === null ? 'unavailable' : `level-${level}`

function SchoolCard({ school }) {
  return (
    <article className={`school-card ${levelClass(school.level)}`}>
      <div className="card-top">
        <span className="level-badge">{school.level === null ? 'Unavailable' : `Level ${school.level}`}</span>
        {school.is_demo_school && <span className="demo-tag">DEMO</span>}
      </div>
      <h2>{school.display_name}</h2>
      <p className="category">{school.category_label}</p>
      <p>{school.recommendation}</p>
      {school.reading_timestamp && <small>Reading from {new Date(school.reading_timestamp).toLocaleString()}</small>}
      {school.station_name && <small>Nearest station: {school.station_name}</small>}
    </article>
  )
}

function App() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alertStatus, setAlertStatus] = useState(null)
  const [demoBusy, setDemoBusy] = useState(false)

  const loadSchools = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/schools`)
      if (!response.ok) throw new Error(`Status API returned ${response.status}`)
      const data = await response.json()
      setSchools(data.schools || [])
      setError('')
    } catch (err) {
      setError(err.message)
      setSchools(demoSchools)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSchools() }, [loadSchools])

  async function simulate(severity) {
    setDemoBusy(true)
    try {
      const response = await fetch(`${API_BASE}/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ severity }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Simulation failed')
      setAlertStatus(data.alert || { message: 'Simulation applied without an alert.', sns_status: 'No worsening transition' })
      await loadSchools()
    } catch (err) {
      setAlertStatus({ message: err.message, sns_status: 'Not sent' })
    } finally { setDemoBusy(false) }
  }

  async function resetDemo() {
    setDemoBusy(true)
    try {
      await fetch(`${API_BASE}/simulate/reset`, { method: 'POST' })
      setAlertStatus({ message: 'Demo school reset to baseline.', sns_status: 'No email sent' })
      await loadSchools()
    } finally { setDemoBusy(false) }
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">SAFE RECESS · DELHI</p>
          <h1>Make outdoor time safer.</h1>
          <p className="subtitle">Clear, school-level guidance when air quality changes.</p>
        </div>
        <div className="hero-mark" aria-hidden="true">◒</div>
      </header>
      <section className="notice">
        <strong>Estimated status</strong>
        <span>India (CPCB) categories based on PM2.5 and PM10. This dashboard uses sample schools and live station readings where available.</span>
      </section>
      {error && <p className="connection-note">API unavailable — showing demo preview. {error}</p>}
      <div className="legend">
        {[['level-0', 'Good / Satisfactory'], ['level-1', 'Moderate'], ['level-2', 'Poor'], ['level-3', 'Very Poor / Severe']].map(([className, text]) => <span key={className}><i className={className} />{text}</span>)}
      </div>
      <section className="dashboard-heading"><div><p className="eyebrow">TODAY’S STATUS</p><h2>Schools near you</h2></div><span>{loading ? 'Loading…' : `${schools.length} schools monitored`}</span></section>
      <section className="school-grid">{schools.map(school => <SchoolCard key={school.school_id} school={school} />)}</section>
      <section className="demo-panel">
        <div><p className="eyebrow">TRY THE ALERT FLOW</p><h2>Demo school simulation</h2><p>Only the labelled demo school changes. A spike sends one clearly marked demo alert.</p></div>
        <div className="demo-actions">
          <button disabled={demoBusy} onClick={() => simulate('moderate')}>Moderate</button>
          <button disabled={demoBusy} onClick={() => simulate('poor')}>Poor</button>
          <button disabled={demoBusy} onClick={() => simulate('very_poor')}>Very poor</button>
          <button className="secondary" disabled={demoBusy} onClick={resetDemo}>Reset</button>
        </div>
      </section>
      {alertStatus && <section className="alert-status"><div><p className="eyebrow">ALERT STATUS</p><h2>{alertStatus.subject || 'Demo activity'}</h2><p>{alertStatus.message}</p></div><strong>{alertStatus.sns_status}</strong></section>}
      <footer>Data credits: World Air Quality Index Project and the originating agency returned by the feed. SafeRecess shows estimated categories and is not medical advice.</footer>
    </main>
  )
}

export default App
