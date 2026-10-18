import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { FamilyDemoContext } from './coordinator/familyBridge';
import { Coordinator } from './coordinator/Coordinator';
import { createDemo, eligibleCandidate, familyScenario, transition, type Action, type Stage } from './coordinator/demo';
import { Botanical } from './components/Botanical';
import { BottomNav } from './components/BottomNav';
import { Brand } from './components/Brand';
import { Icon } from './components/Icon';
import { scenarios, getScenario, incidentPath, type Scenario } from './data/mockData';
import { LiveContext, type LiveState } from './data/liveContext';
import { familyIncidents, fetchLiveIncidents } from './data/liveIncidents';
import { HomePage } from './pages/HomePage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { IncidentPage } from './pages/IncidentPage';
import { ActivityPage, NotFoundPage, ResidentPage, SettingsPage } from './pages/DetailPages';
import { CompanionPage } from './pages/CompanionPage';
import { SimulatorPage } from './pages/SimulatorPage';

const STORAGE_KEY = 'familycare-demo-scenario';
const MODE_KEY = 'familycare-mode';
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
function initialScenario(): Scenario {
  try {
    const saved = import.meta.env.DEV ? sessionStorage.getItem(STORAGE_KEY) : null;
    return scenarios.find(scenario => scenario.id === saved)?.id ?? 'normal';
  } catch { return 'normal'; }
}
export default function App() {
  const [mode, setMode] = useState<'demo' | 'live'>(() => {
    try { return sessionStorage.getItem(MODE_KEY) === 'live' ? 'live' : 'demo'; } catch { return 'demo'; }
  });
  const [live, setLive] = useState<Omit<LiveState, 'mode'>>({ incidents: [], loading: false, error: false });
  const location = useLocation();
  const coordinatorRoute = location.pathname.startsWith('/coordinator');
  const [demo, setDemo] = useState(() => createDemo(window.location.pathname.startsWith('/coordinator') ? 'requested' : initialScenario() === 'unusual' ? 'normal' : initialScenario() as Stage, window.location.pathname.startsWith('/coordinator') ? 'coordinator' : 'family'));
  const [unusual, setUnusual] = useState(initialScenario() === 'unusual' && !window.location.pathname.startsWith('/coordinator'));
  const scenario: Scenario = unusual ? 'unusual' : familyScenario(demo);
  useEffect(() => {
    if (mode !== 'live' || coordinatorRoute) return;
    let active = true;
    let controller: AbortController | undefined;
    let timer: number | undefined;
    const poll = async () => {
      controller = new AbortController();
      try {
        const incidents = await fetchLiveIncidents(controller.signal, fetch, API_BASE);
        if (active) setLive({ incidents: familyIncidents(incidents), loading: false, error: false });
      } catch {
        if (active && !controller?.signal.aborted) setLive(current => ({ ...current, loading: false, error: true }));
      } finally {
        if (active) timer = window.setTimeout(poll, 3000);
      }
    };
    setLive(current => ({ ...current, loading: true, error: false }));
    void poll();
    return () => { active = false; controller?.abort(); window.clearTimeout(timer); };
  }, [mode, coordinatorRoute]);
  const dispatch = useCallback((action: Action) => { setUnusual(false); setDemo(current => ({ ...transition(current, action), source: 'coordinator' })); }, []);
  useEffect(() => {
    if (demo.source !== 'coordinator' || demo.escalated || unusual) return;
    const matching = demo.stage === 'matching' && eligibleCandidate(demo);
    if (demo.stage !== 'requested' && !matching) return;
    const timer = window.setTimeout(() => dispatch({ type: demo.stage === 'requested' ? 'start-matching' : 'auto-assign' }), 1500);
    return () => window.clearTimeout(timer);
  }, [demo, unusual, dispatch]);
  const navigate = useNavigate();
  const main = useRef<HTMLElement>(null);
  const detail = location.pathname === '/resident' || /^\/(incidents|activities|profile)\/.+/.test(location.pathname);
  const state = getScenario(scenario);
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
    if (!location.pathname.startsWith('/coordinator')) document.title = `FamilyCare | ${location.pathname === '/' ? 'Home' : location.pathname.split('/')[1].replace(/^./, c => c.toUpperCase())}`;
  }, [location.pathname]);
  function changeScenario(value: Scenario) {
    setUnusual(value === 'unusual');
    setDemo(createDemo(value === 'unusual' ? 'normal' : value as Stage, 'family'));
    try { sessionStorage.setItem(STORAGE_KEY, value); } catch { /* Storage can be unavailable in private browsing. */ }
    if (location.pathname.startsWith('/incidents/')) navigate(value === 'normal' ? '/' : incidentPath(value));
  }
  function changeMode(value: 'demo' | 'live') {
    setMode(value);
    try { sessionStorage.setItem(MODE_KEY, value); } catch { /* Private browsing may disable storage. */ }
    if (/^\/(incidents|activities)\//.test(location.pathname)) navigate('/');
  }
  if (location.pathname === '/companion') {
  return <CompanionPage />;
}
if (location.pathname === '/simulator') {
  return <SimulatorPage />;
}
  if (location.pathname.startsWith('/coordinator')) return <Routes><Route path='/coordinator/*' element={<Coordinator state={demo} dispatch={dispatch} />} /></Routes>;
  return <LiveContext.Provider value={{ mode, ...live }}><FamilyDemoContext.Provider value={mode === 'demo' && !unusual && demo.source === 'coordinator' ? demo : undefined}>
    <div className={`app-shell${detail ? ' app-shell--detail' : ''}`}>
      <Botanical position="top" />
      {!detail && <header className="app-header"><Link to="/" aria-label="FamilyCare home"><Brand /></Link><Link className="icon-button notification-button" to="/alerts" aria-label="View alerts"><Icon name="bell" />{(mode === 'live' ? live.incidents.some(incident => incident.status !== 'resolved') : scenario !== 'normal' && scenario !== 'completed') && <span className="notification-dot" />}</Link></header>}
      <main ref={main} tabIndex={-1} id="main-content">
        <Routes>
          <Route path="/" element={<HomePage scenario={scenario} />} />
          <Route path="/companion" element={<CompanionPage />} />
          <Route path="/alerts" element={<AlertsPage scenario={scenario} />} />
          <Route path="/history" element={<HistoryPage scenario={scenario} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:section" element={<SettingsPage />} />
          <Route path="/incidents/:incidentId" element={<IncidentPage scenario={scenario} sharedDemo={!unusual && demo.source === 'coordinator' ? demo : undefined} />} />
          <Route path="/activities/:activityId" element={<ActivityPage scenario={scenario} />} />
          <Route path="/resident" element={<ResidentPage scenario={scenario} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <div className="garden"><Botanical position="bottom" /></div>
      <BottomNav />
    </div>
    {mode === 'demo' && !unusual && demo.source === 'coordinator' && <aside className='family-coordinator-note' role='status'><strong>Shared coordinator demo</strong><p>{demo.escalated ? 'Incident escalated · support review pending' : demo.stage === 'matching' && !eligibleCandidate(demo) ? 'No suitable responder · coordinator action required' : demo.events.at(-1)?.title ?? 'Normal monitoring'}</p><Link to='/coordinator'>Open Response Centre →</Link></aside>}
    <aside className="demo-controls" aria-label="FamilyCare data mode"><label htmlFor="family-mode">Data mode</label><select id="family-mode" value={mode} onChange={event => changeMode(event.target.value as 'demo' | 'live')}><option value="demo">Demo Mode</option><option value="live">Live Mode</option></select>{mode === 'live' && <p>Live incidents · updates every 3 seconds</p>}{import.meta.env.DEV && <><label htmlFor="demo-scenario">Demo scenarios</label><select id="demo-scenario" value={scenario} disabled={mode === 'live'} onChange={event => changeScenario(event.target.value as Scenario)}>{scenarios.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select><p>16 October 2026 · Mock data only in Demo Mode</p><Link to="/coordinator">Open SDP Response Centre →</Link><span className="sr-only" role="status">Selected scenario: {state.label}</span></>}</aside>
  </FamilyDemoContext.Provider></LiveContext.Provider>;
}
