import { LiveResponderActions } from './LiveResponderActions';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { displayDate, displayTime, fetchLiveIncident, fetchLiveIncidents, incidentLabel, type LiveIncident } from './liveIncidents';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
type Mode = 'demo' | 'live';
interface ReadState<T> { value: T | undefined; loading: boolean; error: boolean }
// Separate list/detail lifecycles prevent a late request from overwriting a newly selected incident.
function usePolling<T>(enabled: boolean, read: (signal: AbortSignal) => Promise<T>): ReadState<T> {
  const [state, setState] = useState<ReadState<T>>({ value: undefined, loading: true, error: false });
  const [owner, setOwner] = useState(() => read);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    setOwner(() => read);
    setState({ value: undefined, loading: true, error: false });
    async function poll() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const value = await read(controller.signal);
        if (active) setState({ value, loading: false, error: false });
      } catch {
        if (active) setState({ value: undefined, loading: false, error: true });
      } finally {
        clearTimeout(timeout);
        if (active) timer = setTimeout(poll, 3000);
      }
    }
    void poll();
    return () => { active = false; controller?.abort(); clearTimeout(timer); };
  }, [enabled, read]);
  return owner === read ? state : { value: undefined, loading: true, error: false };
}
interface DashboardData {
  mode: Mode; changeMode: (mode: Mode) => void; refresh: () => void;
  list: ReadState<LiveIncident[]>; detail: ReadState<LiveIncident | null>; eventId: string | null;
}
const Context = createContext<DashboardData | null>(null);
export const useDashboardData = () => useContext(Context);
export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  // This preference is isolated from the existing Family Dashboard mode.
  const [mode, setMode] = useState<Mode>(() => { try { return sessionStorage.getItem('familycare-operations-mode') === 'live' ? 'live' : 'demo'; } catch { return 'demo'; } });
  const match = location.pathname.match(/^\/coordinator\/(?:incidents|progress|reports)\/([^/]+)/);
  let eventId: string | null = null;
  try { eventId = match ? decodeURIComponent(match[1]) : new URLSearchParams(location.search).get('event_id'); } catch { /* Malformed URLs show the incident list. */ }
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(value => value + 1);
  const readList = useCallback((signal: AbortSignal) => fetchLiveIncidents(signal, fetch, API_BASE), [revision]);
  const readDetail = useCallback((signal: AbortSignal) => fetchLiveIncident(eventId!, signal, fetch, API_BASE), [eventId, revision]);
  const list = usePolling(mode === 'live', readList);
  const detail = usePolling(mode === 'live' && eventId !== null, readDetail);
  function changeMode(value: Mode) {
    setMode(value);
    try { sessionStorage.setItem('familycare-operations-mode', value); } catch { /* Storage may be unavailable. */ }
  }
  return <Context.Provider value={{ mode, changeMode, refresh, list, detail, eventId }}>{children}</Context.Provider>;
}
export function DashboardModeControl() {
  const data = useDashboardData();
  return data && <label>Data mode <select aria-label="Dashboard data mode" value={data.mode} onChange={event => data.changeMode(event.target.value as Mode)}><option value="demo">Demo Mode</option><option value="live">Live Mode</option></select></label>;
}
export function LiveIncidentPanel({ responder = false }: { responder?: boolean }) {
  const data = useDashboardData()!;
  const card = responder ? 'field-responder-card' : 'sdp-card';
  const button = responder ? 'field-responder-button' : 'sdp-button secondary';
  const location = useLocation();
  const path = responder ? '/responder' : '/coordinator';
  const selected = data.eventId !== null;
  const state = selected ? data.detail : data.list;
  const incidents = selected ? data.detail.value ? [data.detail.value] : [] : data.list.value ?? [];
  return <section aria-label="Live incidents">
    <article className={card}><h2>Live incident data</h2><p>Refreshes every 3 seconds.</p>
      <p>Assignments, responder updates and visit reports use the backend. Demo actions remain separate.</p>
      {!responder && /\/reports(?:\/|$)/.test(location.pathname) && <p>Submitted visit reports appear with their incident below.</p>}
      {selected && <Link className={button} to={path}>All live incidents</Link>}
    </article>
    {state.loading ? <article className={card} role="status"><p>Loading live incidents…</p></article> : state.error ? <article className={card} role="alert"><h2>Backend unavailable</h2><p>Live incident data could not be loaded. Check the backend connection. Retrying automatically every 3 seconds.</p></article> : !incidents.length ? <article className={card} role="status"><h2>{selected ? 'Incident not found' : 'No live incidents'}</h2><p>{selected ? 'This incident is no longer available from the backend.' : 'The backend returned no incidents.'}</p></article> : incidents.map(incident => <article className={card} key={incident.event_id}>
      <h2>Possible fall · {incidentLabel(incident)}</h2>
      <dl className={responder ? 'field-responder-facts' : 'sdp-facts'}>
        {Object.entries({ 'Incident ID': incident.event_id, 'Resident ID': incident.resident_id, 'Detected': `${displayDate(incident.timestamp)} · ${displayTime(incident.timestamp)}`, 'Detection timestamp': incident.timestamp, Location: incident.location, Severity: incident.severity, 'Current status': incident.status, 'Responder status': incident.responder_status, 'Responder required': incident.requires_responder ? 'Yes' : 'No', 'Backend simulation': incident.simulation ? 'Yes' : 'No' }).map(([key,value]) => <div key={key}><dt>{key}</dt><dd style={{ overflowWrap: 'anywhere' }}>{value}</dd></div>)}
      </dl>
      <LiveResponderActions key={incident.event_id} incident={incident} responder={responder} refresh={data.refresh}/>
      {!selected && <Link className={button} to={responder ? `/responder?event_id=${encodeURIComponent(incident.event_id)}` : `/coordinator/incidents/${encodeURIComponent(incident.event_id)}`}>View incident {incident.event_id}</Link>}
    </article>)}
  </section>;
}
