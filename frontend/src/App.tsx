import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
  const [scenario, setScenario] = useState<Scenario>(initialScenario);
  const location = useLocation();
  const navigate = useNavigate();
  const main = useRef<HTMLElement>(null);
  const detail = location.pathname === '/resident' || /^\/(incidents|activities|profile)\/.+/.test(location.pathname);
  const state = getScenario(scenario);
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
    document.title = `FamilyCare | ${location.pathname === '/' ? 'Home' : location.pathname.split('/')[1].replace(/^./, c => c.toUpperCase())}`;
  }, [location.pathname]);
  function changeScenario(value: Scenario) {
    setScenario(value);
    try { sessionStorage.setItem(STORAGE_KEY, value); } catch { /* Storage can be unavailable in private browsing. */ }
    if (location.pathname.startsWith('/incidents/')) navigate(value === 'normal' ? '/' : incidentPath(value));
  }
  return <>
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
          <Route path="/incidents/:incidentId" element={<IncidentPage scenario={scenario} />} />
          <Route path="/activities/:activityId" element={<ActivityPage scenario={scenario} />} />
          <Route path="/resident" element={<ResidentPage scenario={scenario} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <div className="garden"><Botanical position="bottom" /></div>
      <BottomNav />
    </div>
    {import.meta.env.DEV && <aside className="demo-controls" aria-label="Development scenario controls"><label htmlFor="demo-scenario">Demo scenarios</label><select id="demo-scenario" value={scenario} onChange={event => changeScenario(event.target.value as Scenario)}>{scenarios.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select><p>16 October 2026 · Mock data only</p><span className="sr-only" role="status">Selected scenario: {state.label}</span></aside>}
  </>;
}
