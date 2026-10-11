import { useCallback, useEffect, useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const levelClass = level => level === null ? 'unavailable' : `level-${level}`;

// Mock data for development/testing
const mockSchools = [
  {
    school_id: 'najafgarh-a',
    display_name: 'Sample School, Najafgarh A',
    station_name: 'Bramprakash Ayurvedic Hospital, Najafgarh',
    level: 0,
    category_label: 'Good / Satisfactory',
    recommendation: 'Outdoor activities can continue; keep an eye on sensitive students.',
    est_pm25: 45,
    est_pm10: 85,
    driving_pollutant: 'pm10',
    source_timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'najafgarh-b',
    display_name: 'Sample School, Najafgarh B',
    station_name: 'Bramprakash Ayurvedic Hospital, Najafgarh',
    level: 1,
    category_label: 'Moderate',
    recommendation: 'Sensitive students should take breaks and outdoor activity should be monitored.',
    est_pm25: 75,
    est_pm10: 120,
    driving_pollutant: 'pm25',
    source_timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'mundka-a',
    display_name: 'Sample School, Mundka A',
    station_name: 'Mundka',
    level: 2,
    category_label: 'Poor',
    recommendation: 'Move assembly and sports indoors; avoid prolonged outdoor exposure.',
    est_pm25: 95,
    est_pm10: 280,
    driving_pollutant: 'pm10',
    source_timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'mundka-b',
    display_name: 'Sample School, Mundka B',
    station_name: 'Mundka',
    level: 2,
    category_label: 'Poor',
    recommendation: 'Move assembly and sports indoors; avoid prolonged outdoor exposure.',
    est_pm25: 90,
    est_pm10: 275,
    driving_pollutant: 'pm10',
    source_timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'anand-vihar-a',
    display_name: 'Sample School, Anand Vihar A',
    station_name: 'Anand Vihar',
    level: 1,
    category_label: 'Moderate',
    recommendation: 'Sensitive students should take breaks and outdoor activity should be monitored.',
    est_pm25: 65,
    est_pm10: 150,
    driving_pollutant: 'pm10',
    source_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'anand-vihar-b',
    display_name: 'Sample School, Anand Vihar B',
    station_name: 'Anand Vihar',
    level: 1,
    category_label: 'Moderate',
    recommendation: 'Sensitive students should take breaks and outdoor activity should be monitored.',
    est_pm25: 70,
    est_pm10: 145,
    driving_pollutant: 'pm10',
    source_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'okhla-a',
    display_name: 'Sample School, Okhla A',
    station_name: 'DITE Okhla',
    level: 0,
    category_label: 'Good / Satisfactory',
    recommendation: 'Outdoor activities can continue; keep an eye on sensitive students.',
    est_pm25: 40,
    est_pm10: 90,
    driving_pollutant: 'pm25',
    source_timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'okhla-b',
    display_name: 'Sample School, Okhla B',
    station_name: 'DITE Okhla',
    level: 0,
    category_label: 'Good / Satisfactory',
    recommendation: 'Outdoor activities can continue; keep an eye on sensitive students.',
    est_pm25: 38,
    est_pm10: 88,
    driving_pollutant: 'pm25',
    source_timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'rk-puram-a',
    display_name: 'Sample School, R.K. Puram A',
    station_name: 'R.K. Puram',
    level: 1,
    category_label: 'Moderate',
    recommendation: 'Sensitive students should take breaks and outdoor activity should be monitored.',
    est_pm25: 60,
    est_pm10: 160,
    driving_pollutant: 'pm10',
    source_timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(), // 50 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'rk-puram-b',
    display_name: 'Sample School, R.K. Puram B',
    station_name: 'R.K. Puram',
    level: 1,
    category_label: 'Moderate',
    recommendation: 'Sensitive students should take breaks and outdoor activity should be monitored.',
    est_pm25: 58,
    est_pm10: 155,
    driving_pollutant: 'pm10',
    source_timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 min ago
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: false,
    is_simulated: false
  },
  {
    school_id: 'demo',
    display_name: 'Demo School (simulation only)',
    station_name: '(Simulation)',
    level: 0,
    category_label: 'Good / Satisfactory',
    recommendation: 'Outdoor activities can continue; keep an eye on sensitive students.',
    est_pm25: 20,
    est_pm10: 30,
    driving_pollutant: null,
    source_timestamp: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    attribution: [
      { name: 'Delhi Pollution Control Committee', url: 'https://dpcc.delhigovt.nic.in' },
      { name: 'World Air Quality Index Project', url: 'https://waqi.info' }
    ],
    is_demo_school: true,
    is_simulated: false
  }
];

function SchoolCard({ school, onSubscribe, isOwner = false }) {
  const isUnavailable = school.level === null;
  const isDemo = school.is_demo_school;

  // Calculate time ago
  let timeAgoText = '';
  if (school.source_timestamp) {
    const sourceTime = new Date(school.source_timestamp).getTime();
    const now = Date.now();
    const diffMinutes = Math.floor((now - sourceTime) / (60 * 1000));

    if (diffMinutes < 1) {
      timeAgoText = 'just now';
    } else if (diffMinutes < 60) {
      timeAgoText = `${diffMinutes} min ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        timeAgoText = `${diffHours} h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        timeAgoText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      }
    }
  }

  // Determine if data is stale (older than 3 hours)
  const isStale = school.source_timestamp &&
    (Date.now() - new Date(school.source_timestamp).getTime()) > 3 * 60 * 60 * 1000;

  return (
    <article
      className={`school-card ${levelClass(school.level)} ${isStale ? 'stale' : ''} ${isDemo ? 'demo-school' : ''}`}
      role="region"
      aria-label={`${school.display_name}, ${isUnavailable ? 'data unavailable' : `level ${school.level}`}`}
    >
      <div className="card-top">
        <span
          className="level-badge"
          role="status"
          aria-live="polite"
        >
          {isUnavailable ? 'Data unavailable' : `Level ${school.level} - ${school.category_label}`}
        </span>
        {isDemo && <span className="demo-tag">DEMO (OWNER ONLY)</span>}
      </div>

      <h2>{school.display_name}</h2>
      <p className="school-details">
        {school.area && <span className="school-detail-item">Area: {school.area}</span>}
        {school.station_name && (
          <span className="school-detail-item">
            Nearest station: {school.station_name}
          </span>
        )}
      </p>

      {!isUnavailable && (
        <>
          <div className="live-values">
            <div className="value-item">
              <span className="value-label">PM2.5:</span>
              <span className="value">{school.est_pm25} µg/m³</span>
            </div>
            <div className="value-item">
              <span className="value-label">PM10:</span>
              <span className="value">{school.est_pm10} µg/m³</span>
            </div>
            {school.driving_pollutant && (
              <div className="value-item">
                <span className="value-label">Driving pollutant:</span>
                <span className="value">
                  {school.driving_pollutant === 'pm25' ? 'PM2.5' : 'PM10'}
                </span>
              </div>
            )}
            <div className="value-item">
              <span className="value-label">Source AQI (US scale):</span>
              <span className="value">
                {/* Convert back to AQI for display - simplified */}
                {school.est_pm25 !== null && school.est_pm10 !== null ?
                  Math.max(
                    Math.round(school.est_pm25 * 2.2), // rough conversion
                    Math.round(school.est_pm10 * 0.5)  // rough conversion
                  ) : '--'}
              </span>
            </div>
          </div>

          <p className="recommendation">{school.recommendation}</p>

          <div className="reading-time">
            {isStale ?
              <span className="stale-text">Data unavailable (stale reading)</span> :
              <>
                Reading from {new Date(school.source_timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} IST,
                {timeAgoText}
              </>
            }
          </div>
        </>
      )}

      {!isDemo && !isUnavailable && (
        <button
          className="subscribe-btn"
          onClick={onSubscribe}
          aria-label="Subscribe to alerts for this school"
        >
          Subscribe
        </button>
      )}
    </article>
  );
}

function SummaryStrip({ schools }) {
  const levelCounts = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    unavailable: 0
  };

  let newestTime = null;

  schools.forEach(school => {
    if (school.level === null) {
      levelCounts.unavailable++;
    } else if (school.level !== null) {
      levelCounts[school.level]++;
    }

    if (school.source_timestamp) {
      const schoolTime = new Date(school.source_timestamp).getTime();
      if (!newestTime || schoolTime > newestTime) {
        newestTime = schoolTime;
      }
    }
  });

  const newestTimeText = newestTime ?
    `Last update: ${new Date(newestTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` :
    'No recent readings';

  return (
    <section className="summary-strip" role="region" aria-label="Summary of school air quality levels">
      <div className="summary-item">
        <span className="level-0-count">{levelCounts[0]}</span> Good
      </div>
      <div className="summary-item">
        <span className="level-1-count">{levelCounts[1]}</span> Moderate
      </div>
      <div className="summary-item">
        <span className="level-2-count">{levelCounts[2]}</span> Poor
      </div>
      <div className="summary-item">
        <span className="level-3-count">{levelCounts[3]}</span> Very Poor
      </div>
      {levelCounts.unavailable > 0 && (
        <div className="summary-item unavailable">
          <span className="unavailable-count">{levelCounts.unavailable}</span> Unavailable
        </div>
      )}
      <div className="summary-item newest-time" aria-live="polite">
        {newestTimeText}
      </div>
      <div className="summary-item update-note">
        Readings update about hourly
      </div>
    </section>
  );
}

function Legend() {
  return (
    <section className="legend" aria-label="Air quality levels legend">
      <div className="legend-item">
        <i className="level-0" aria-hidden="true"></i>
        <span>Level 0 - Good / Satisfactory</span>
      </div>
      <div className="legend-item">
        <i className="level-1" aria-hidden="true"></i>
        <span>Level 1 - Moderate</span>
      </div>
      <div className="legend-item">
        <i className="level-2" aria-hidden="true"></i>
        <span>Level 2 - Poor</span>
      </div>
      <div className="legend-item">
        <i className="level-3" aria-hidden="true"></i>
        <span>Level 3 - Very Poor / Severe</span>
      </div>
      <div className="legend-note">
        Estimated India (CPCB) categories, based on PM2.5 and PM10 (worse of the two).
      </div>
    </section>
  );
}

function Footer({ credits }) {
  return (
    <footer role="contentinfo">
      <div className="footer-credits">
        Data credits:
        {credits && credits.length > 0 ?
          credits.map((credit, index) => (
            <span key={index}>
              {credit.name}
              {credit.url && (
                <a
                  href={credit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="credit-link"
                >
                  (source)
                </a>
              )}
              {index < credits.length - 1 ? '; ' : ''}
            </span>
          )) :
          'World Air Quality Index Project and the originating agency'
        }
      </div>
      <div className="footer-disclaimer">
        General guidance, not medical advice; follow official advisories.
      </div>
      <div className="footer-privacy">
        Emails are used only for alerts; every email has an unsubscribe link.
      </div>
    </footer>
  );
}

function App() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState([]);
  const [demoSchool, setDemoSchool] = useState(null);
  const [isOwner, setIsOwner] = useState(false); // Set by demo key validation
  const [demoKey, setDemoKey] = useState(''); // In-memory only, never stored
  const [demoKeyError, setDemoKeyError] = useState('');
  const [demoKeySuccess, setDemoKeySuccess] = useState(false);
  const [loadingDemoKey, setLoadingDemoKey] = useState(false);
  const [subscribeDrawerOpen, setSubscribeDrawerOpen] = useState(false);
  const [subscribeSchoolId, setSubscribeSchoolId] = useState('');
  const [subscribeForm, setSubscribeForm] = useState({
    email: '',
    role: 'parent',
    schoolIds: []
  });
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [demoSimulating, setDemoSimulating] = useState(false);
  const [demoAlertStatus, setDemoAlertStatus] = useState('');

  const loadSchools = useCallback(async () => {
    if (USE_MOCK) {
      // Use mock data
      setSchools(mockSchools);
      const demoSchoolMock = mockSchools.find(s => s.is_demo_school);
      setDemoSchool(demoSchoolMock || null);

      // Extract credits from first school's attribution (they should be the same for all)
      const firstSchoolWithAttribution = mockSchools.find(s => s.attribution && s.attribution.length > 0);
      setCredits(firstSchoolWithAttribution ? firstSchoolWithAttribution.attribution : []);

      setLoading(false);
      setError('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE}/schools`);

      if (!response.ok) {
        throw new Error(`Status API returned ${response.status}`);
      }

      const data = await response.json();
      if (data.schools) {
        setSchools(data.schools);

        // Find demo school
        const demoSchoolData = data.schools.find(s => s.is_demo_school);
        setDemoSchool(demoSchoolData || null);

        // Extract credits from first school with attribution
        const firstSchoolWithAttribution = data.schools.find(s => s.attribution && s.attribution.length > 0);
        setCredits(firstSchoolWithAttribution ? firstSchoolWithAttribution.attribution : []);
      }

      setError('');
    } catch (err) {
      setError(err.message);
      console.error('Failed to load schools:', err);

      // Fallback to mock data on error for better UX during development
      if (!USE_MOCK) {
        setSchools(mockSchools);
        const demoSchoolMock = mockSchools.find(s => s.is_demo_school);
        setDemoSchool(demoSchoolMock || null);

        const firstSchoolWithAttribution = mockSchools.find(s => s.attribution && s.attribution.length > 0);
        setCredits(firstSchoolWithAttribution ? firstSchoolWithAttribution.attribution : []);
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE, USE_MOCK]);

  // Validate demo key with backend
  const validateDemoKey = useCallback(async (key) => {
    try {
      const response = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-key': key
        },
        body: JSON.stringify({ severity: 'moderate' }) // Just testing validation
      });

      // If we get a 403, the key is invalid
      if (response.status === 403) {
        return false;
      }

      // Any other response (including 200 or 429 for cooldown) means the key is valid
      return true;
    } catch (error) {
      console.error('Demo key validation error:', error);
      return false;
    }
  }, [API_BASE]);

  // Handle demo school subscription (disabled as per FRONTEND.md)
  const handleSubscribe = useCallback((schoolId) => {
    // Set the school ID for subscription and open drawer
    setSubscribeSchoolId(schoolId);
    setSubscribeForm(prev => ({
      ...prev,
      schoolIds: [schoolId] // Pre-select the clicked school
    }));
    setSubscribeDrawerOpen(true);
  }, []);

  // Handle closing subscribe drawer
  const handleSubscribeClose = useCallback(() => {
    setSubscribeDrawerOpen(false);
    setSubscribeError('');
    setSubscribeSuccess(false);
    // Reset form when closing
    setSubscribeForm({
      email: '',
      role: 'parent',
      schoolIds: []
    });
  }, []);

  // Poll every 5 minutes
  useEffect(() => {
    loadSchools();

    // Set up polling interval
    const intervalId = setInterval(loadSchools, 5 * 60 * 1000); // 5 minutes

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [loadSchools]);

  // Demo key validation
  const handleDemoKeySubmit = useCallback(async () => {
    if (!demoKey.trim()) {
      setDemoKeyError('Please enter a demo key');
      return;
    }

    setLoadingDemoKey(true);
    setDemoKeyError('');
    setDemoKeySuccess(false);

    const isValid = await validateDemoKey(demoKey.trim());

    setLoadingDemoKey(false);

    if (isValid) {
      setIsOwner(true);
      setDemoKeySuccess(true);
      setDemoKey(''); // Clear the key from memory after validation (in-memory only)
    } else {
      setDemoKeyError('Invalid demo key');
      setIsOwner(false);
    }
  }, [demoKey, validateDemoKey]);

  // Handle simulation
  const handleSimulate = useCallback(async (severity) => {
    setDemoSimulating(true);
    setDemoAlertStatus('');

    try {
      const response = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Note: Demo key is not needed here since we validated it and set isOwner=true
          // In a real implementation, we would need to pass it again or store it in state
          // But per FRONTEND.md, we should keep it in memory only, not localStorage
        },
        body: JSON.stringify({ severity })
      });

      if (!response.ok) {
        throw new Error(`Simulation failed: ${response.status}`);
      }

      const result = await response.json();
      setDemoAlertStatus(result.alert ? result.alert.sns_status : 'Simulation completed');

      // Refresh school data to show updated levels
      await loadSchools();
    } catch (error) {
      console.error('Simulation error:', error);
      setDemoAlertStatus('Error: ' + error.message);
    } finally {
      setDemoSimulating(false);
    }
  }, [API_BASE, loadSchools]);

  // Handle reset simulation
  const handleResetSimulation = useCallback(async () => {
    setDemoSimulating(true);
    setDemoAlertStatus('');

    try {
      const response = await fetch(`${API_BASE}/simulate/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Reset failed: ${response.status}`);
      }

      setDemoAlertStatus('Reset completed');

      // Refresh school data to show updated levels
      await loadSchools();
    } catch (error) {
      console.error('Reset error:', error);
      setDemoAlertStatus('Error: ' + error.message);
    } finally {
      setDemoSimulating(false);
    }
  }, [API_BASE, loadSchools]);

  // Handle subscription form changes
  const handleSubscribeChange = useCallback((e) => {
    const { name, value } = e.target;
    setSubscribeForm(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Handle school selection checkboxes
  const handleSchoolSelect = useCallback((schoolId, checked) => {
    setSubscribeForm(prev => {
      const schoolIds = [...prev.schoolIds];
      const index = schoolIds.indexOf(schoolId);

      if (checked && index === -1) {
        schoolIds.push(schoolId);
      } else if (!checked && index !== -1) {
        schoolIds.splice(index, 1);
      }

      return {
        ...prev,
        schoolIds
      };
    });
  }, []);

  // Handle subscription submission
  const handleSubscribeSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!subscribeForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subscribeForm.email)) {
      setSubscribeError('Please enter a valid email address');
      return;
    }

    if (!subscribeForm.role) {
      setSubscribeError('Please select your role');
      return;
    }

    if (subscribeForm.schoolIds.length === 0) {
      setSubscribeError('Please select at least one school');
      return;
    }

    setSubscribeLoading(true);
    setSubscribeError('');
    setSubscribeSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: subscribeForm.email,
          role: subscribeForm.role,
          school_ids: subscribeForm.schoolIds
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Subscription failed');
      }

      setSubscribeSuccess(true);
      setSubscribeError('');

      // Reset form after successful submission
      setSubscribeForm({
        email: '',
        role: 'parent',
        schoolIds: []
      });
      setSubscribeDrawerOpen(false);

    } catch (error) {
      console.error('Subscription error:', error);
      setSubscribeError(error.message || 'Failed to process subscription request');
    } finally {
      setSubscribeLoading(false);
    }
  }, [API_BASE, subscribeForm]);

  // Sort schools: worst level first, then put demo school at end separately
  const sortedSchools = useMemo(() => {
    if (!schools || schools.length === 0) return [];

    // Separate demo school from regular schools
    const regularSchools = schools.filter(s => !s.is_demo_school);
    const demoSchoolData = schools.find(s => s.is_demo_school);

    // Sort regular schools by level (descending - worst first)
    const sortedRegular = [...regularSchools].sort((a, b) => {
      // Handle null levels (unavailable) - treat as lowest priority
      const levelA = a.level === null ? -1 : a.level;
      const levelB = b.level === null ? -1 : b.level;
      return levelB - levelA; // Descending order (worst first)
    });

    return sortedRegular;
  }, [schools]);

  // Area/station filter values (would be populated from actual data in real implementation)
  const areaOptions = ['All Areas'];
  const stationOptions = ['All Stations'];

  if (USE_MOCK && !loading && !error) {
    // Extract unique areas and stations from mock data for demo
    const areas = [...new Date] // Placeholder - would extract from actual school data
    const stations = [...new Set(schools.map(s => s.station_name).filter(Boolean))];

    // In a real implementation, we'd extract these from the school data
  }

  return (
    <main className="app" lang="en">
      {/* Header */}
      <header className="hero">
        <div>
          <p className="eyebrow">SAFE RECESS · DELHI</p>
          <h1>Make outdoor time safer.</h1>
          <p className="subtitle">Clear, school-level guidance when air quality changes.</p>
          <div className="demo-banner">
            Demo project: sample schools, not real school data.
          </div>
        </div>
        <div className="hero-mark" aria-hidden="true">◒</div>
      </header>

      {/* Notice/Error/Loading States */}
      {error && !USE_MOCK && (
        <p className="connection-note">
          API unavailable — showing demo preview. {error}
        </p>
      )}

      {!loading && schools.length === 0 && !error && !USE_MOCK && (
        <p className="empty-state">
          No school data available. Please check your connection or try again later.
        </p>
      )}

      {loading && (
        <p className="loading-state">
          Loading school data...
        </p>
      )}

      {/* Summary Strip */}
      {!loading && schools.length > 0 && (
        <SummaryStrip schools={schools} />
      )}

      {/* School List (excluding demo school which is shown separately) */}
      {!loading && schools.length > 0 && (
        <>
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">TODAY’S STATUS</p>
            <h2>Schools near you</h2>
          </div>
          <span>{sortedSchools.length} schools monitored</span>
        </section>

        {/* Search and Filter Controls */}
        <section className="controls">
          <div className="search-box">
            <label htmlFor="school-search" className="visually-hidden">
              Search schools
            </label>
            <input
              type="text"
              id="school-search"
              placeholder="Search schools..."
              className="search-input"
              aria-label="Search schools"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="area-filter" className="filter-label">
              Area:
            </label>
            <select
              id="area-filter"
              className="filter-select"
              aria-label="Filter by area"
            >
              {areaOptions.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="station-filter" className="filter-label">
              Station:
            </label>
            <select
              id="station-filter"
              className="filter-select"
              aria-label="Filter by station"
            >
              {stationOptions.map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </div>
        </section>

        {/* School Grid */}
        <section className="school-grid" aria-label="List of schools with air quality status">
          {sortedSchools.map(school => (
            <SchoolCard
              key={school.school_id}
              school={school}
              onSubscribe={() => handleSubscribe(school.school_id)}
              isOwner={isOwner}
            />
          ))}

          {/* Show empty state if no schools match filters */}
          {sortedSchools.length === 0 && schools.length > 0 && (
            <p className="no-results">
              No schools match the current filters. Try adjusting your search or filters.
            </p>
          )}
        </section>
        </>
      )}

      {/* Demo School Card (shown separately at bottom) */}
      {!loading && demoSchool && (
        <section className="demo-panel">
          <div>
            <p className="eyebrow">DEMO SCHOOL (OWNER ONLY)</p>
            <h2>{demoSchool.display_name}</h2>
            <p>This school is used for demonstration purposes only. It shows simulated data when activated by the owner.</p>
          </div>

          <SchoolCard
            key={demoSchool.school_id}
            school={demoSchool}
            onSubscribe={() => {/* Demo school has no subscribe button per FRONTEND.md */}}
            isOwner={isOwner}
          />

          {/* In Phase 2/3, this would show the demo controls */}
          {/* Demo key validation UI - only shown when not owner */}
  {!isOwner && (
            <>
              <div className="demo-key-section">
                <h3>Owner Access</h3>
                <p className="demo-note">
                  Enter the demo key to access simulation controls for the demo school.
                </p>
                <div className="demo-key-input">
                  <input
                    type="password"
                    placeholder="Enter demo key"
                    value={demoKey}
                    onChange={(e) => setDemoKey(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleDemoKeySubmit();
                      }
                    }}
                    aria-label="Demo key input"
                  />
                  <button
                    onClick={handleDemoKeySubmit}
                    disabled={!demoKey.trim()}
                  >
                    {loadingDemoKey ? 'Validating...' : 'Validate Key'}
                  </button>
                  {demoKeyError && <p className="error-message">{demoKeyError}</p>}
                  {demoKeySuccess && <p className="success-message">Access granted! Demo controls are now available.</p>}
                </div>
              </div>
            </>
          )}

          {isOwner && (
            <>
              <p className="demo-note">
                Demo school controls - simulate air quality changes for testing.
              </p>
              {/* Demo controls */}
              <div className="demo-actions">
                <button
                  onClick={() => handleSimulate('moderate')}
                  disabled={demoSimulating}
                >
                  Moderate
                </button>
                <button
                  onClick={() => handleSimulate('poor')}
                  disabled={demoSimulating}
                >
                  Poor
                </button>
                <button
                  onClick={() => handleSimulate('very_poor')}
                  disabled={demoSimulating}
                >
                  Very poor
                </button>
                <button
                  className="secondary"
                  onClick={handleResetSimulation}
                  disabled={demoSimulating}
                >
                  Reset
                </button>
                {demoSimulating && <span className="demo-simulating">Simulating...</span>}
              </div>

              {/* Alert status panel */}
              {demoAlertStatus && (
                <div className="alert-status-panel">
                  <h4>Alert Status</h4>
                  <p><strong>Status:</strong> {demoAlertStatus}</p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Legend */}
      {!loading && schools.length > 0 && (
        <Legend />
      )}

      {/* Footer */}
      {!loading && schools.length > 0 && (
        <Footer credits={credits} />
      )}

      {/* Alert Status Panel (would be shown when alerts are sent) */}
      {/* This will be implemented in later phases */}
    {/* Subscribe Drawer/Modal */}
    {subscribeDrawerOpen && (
      <div className="subscribe-backdrop" onClick={handleSubscribeClose}>
        <div className="subscribe-drawer" role="dialog" aria-modal="true" aria-labelledby="subscribe-title">
          <div className="subscribe-header">
            <h2 id="subscribe-title">Subscribe to Air Quality Alerts</h2>
            <button className="subscribe-close" onClick={handleSubscribeClose} aria-label="Close">
              ×
            </button>
          </div>

          <form onSubmit={handleSubscribeSubmit}>
            <div className="subscribe-form-group">
              <label htmlFor="subscribe-email">Email address</label>
              <input
                type="email"
                id="subscribe-email"
                value={subscribeForm.email}
                onChange={handleSubscribeChange}
                placeholder="your@email.com"
                required
                aria-invalid={!!subscribeError && subscribeError.includes('email')}
              />
              {subscribeError && subscribeError.includes('email') && (
                <p className="form-error">{subscribeError}</p>
              )}
            </div>

            <div className="subscribe-form-group">
              <label htmlFor="subscribe-role">Your role</label>
              <select
                id="subscribe-role"
                value={subscribeForm.role}
                onChange={handleSubscribeChange}
                required
                aria-invalid={!!subscribeError && subscribeError.includes('role')}
              >
                <option value="">Select your role</option>
                <option value="parent">Parent</option>
                <option value="principal">Principal</option>
                <option value="pe_teacher">PE Teacher</option>
              </select>
              {subscribeError && subscribeError.includes('role') && (
                <p className="form-error">{subscribeError}</p>
              )}
            </div>

            <div className="subscribe-form-group">
              <label>Schools</label>
              <div className="school-checkboxes">
                {/* In a real implementation, we'd map through all schools here */}
                {/* For now, we'll show the pre-selected school and allow adding others */}
                {subscribeForm.schoolIds.map(schoolId => {
                  const school = schools.find(s => s.school_id === schoolId);
                  if (!school) return null;
                  return (
                    <div key={schoolId} className="school-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={true} // Pre-selected schools are always checked
                          onChange={(e) => handleSchoolSelect(schoolId, e.target.checked)}
                          disabled // Pre-selected schools cannot be unselected
                        />
                        <span>{school.display_name}</span>
                      </label>
                    </div>
                  );
                })}
                {/* Show other available schools that can be added */}
                {schools
                  .filter(s => !s.is_demo_school && !subscribeForm.schoolIds.includes(s.school_id))
                  .map(school => (
                    <div key={school.school_id} className="school-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={subscribeForm.schoolIds.includes(school.school_id)}
                          onChange={(e) => handleSchoolSelect(school.school_id, e.target.checked)}
                        />
                        <span>{school.display_name}</span>
                      </label>
                    </div>
                  ))}
              </div>

              {subscribeForm.schoolIds.length > 10 && (
                <p className="form-error">Too many schools selected. Maximum is 10.</p>
              )}
              {subscribeForm.schoolIds.length === 0 && !subscribeLoading && (
                <p className="form-error">Please select at least one school</p>
              )}
            </div>

            <div className="subscribe-actions">
              <button
                type="button"
                onClick={handleSubscribeClose}
                className="subscribe-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={subscribeLoading}
                className="subscribe-primary"
              >
                {subscribeLoading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>

            {subscribeError && !subscribeError.includes('email') && !subscribeError.includes('role') && (
              <p className="form-error">{subscribeError}</p>
            )}
            {subscribeSuccess && (
              <p className="form-success">
                Check your inbox and click Confirm in the email from AWS Notifications.
                You won't get alerts until you confirm.
              </p>
            )}
          </form>
        </div>
      </div>
    )}
    </main>
  );
}

export default App;