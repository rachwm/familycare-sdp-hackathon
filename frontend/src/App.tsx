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
import { HomePage } from './pages/HomePage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { IncidentPage } from './pages/IncidentPage';
import { ActivityPage, NotFoundPage, ResidentPage, SettingsPage } from './pages/DetailPages';

const STORAGE_KEY = 'familycare-demo-scenario';
function initialScenario(): Scenario {
  try {
    const saved = import.meta.env.DEV ? sessionStorage.getItem(STORAGE_KEY) : null;
    return scenarios.find(scenario => scenario.id === saved)?.id ?? 'normal';
  } catch { return 'normal'; }
}
export default function App() {
  const [demo, setDemo] = useState(() => createDemo(window.location.pathname.startsWith('/coordinator') ? 'requested' : initialScenario() === 'unusual' ? 'normal' : initialScenario() as Stage, window.location.pathname.startsWith('/coordinator') ? 'coordinator' : 'family'));
  const [unusual, setUnusual] = useState(initialScenario() === 'unusual' && !window.location.pathname.startsWith('/coordinator'));
  const scenario: Scenario = unusual ? 'unusual' : familyScenario(demo);
  const dispatch = useCallback((action: Action) => { setUnusual(false); setDemo(current => ({ ...transition(current, action), source: 'coordinator' })); }, []);
  useEffect(() => {
    if (demo.source !== 'coordinator' || demo.escalated || unusual) return;
    const matching = demo.stage === 'matching' && eligibleCandidate(demo);
    if (demo.stage !== 'requested' && !matching) return;
    const timer = window.setTimeout(() => dispatch({ type: demo.stage === 'requested' ? 'start-matching' : 'auto-assign' }), 1500);
    return () => window.clearTimeout(timer);
  }, [demo, unusual, dispatch]);
  const location = useLocation();
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
  if (location.pathname.startsWith('/coordinator')) return <Routes><Route path='/coordinator/*' element={<Coordinator state={demo} dispatch={dispatch} />} /></Routes>;
  return <FamilyDemoContext.Provider value={!unusual && demo.source === 'coordinator' ? demo : undefined}>
    <div className={`app-shell${detail ? ' app-shell--detail' : ''}`}>
      <Botanical position="top" />
      {!detail && <header className="app-header"><Link to="/" aria-label="FamilyCare home"><Brand /></Link><Link className="icon-button notification-button" to="/alerts" aria-label="View alerts"><Icon name="bell" />{scenario !== 'normal' && scenario !== 'completed' && <span className="notification-dot" />}</Link></header>}
      <main ref={main} tabIndex={-1} id="main-content">
        <Routes>
          <Route path="/" element={<HomePage scenario={scenario} />} />
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
    {!unusual && demo.source === 'coordinator' && <aside className='family-coordinator-note' role='status'><strong>Shared coordinator demo</strong><p>{demo.escalated ? 'Incident escalated · support review pending' : demo.stage === 'matching' && !eligibleCandidate(demo) ? 'No suitable responder · coordinator action required' : demo.events.at(-1)?.title ?? 'Normal monitoring'}</p><Link to='/coordinator'>Open Response Centre →</Link></aside>}
    {import.meta.env.DEV && <aside className="demo-controls" aria-label="Development scenario controls"><label htmlFor="demo-scenario">Demo scenarios</label><select id="demo-scenario" value={scenario} onChange={event => changeScenario(event.target.value as Scenario)}>{scenarios.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select><p>16 October 2026 · Mock data only</p><Link to="/coordinator">Open SDP Response Centre →</Link><span className="sr-only" role="status">Selected scenario: {state.label}</span></aside>}
  </FamilyDemoContext.Provider>;
}
