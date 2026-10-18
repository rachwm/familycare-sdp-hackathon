import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SimulatorPage.css';
import { createFallSimulation, request } from './fallApi';
import { useBackendEvents } from '../data/backendEvents';
import { incomingCompanionIncidentId, latestPendingCompanionIncidentId } from './companionIncoming';
import { createMedicationReminder } from './reminderApi';
import { createActivityAnomalySimulation } from './activityApi';
import { resetDemoData } from './simulatorApi';

const asset = (name: string) => `${import.meta.env.BASE_URL}simulator/${name}`;

const scenarios = [
  { id: 'fall', title: 'Fall detection', description: 'Start the 30-second safety check-in.', icon: 'fall.svg', prompt: '', actions: [] },
  { id: 'activity', title: 'Activity anomaly', description: 'Test a routine change detected from home sensor patterns.', icon: 'activity.svg', prompt: '', actions: [] },
  { id: 'medication', title: 'Medication reminder', description: 'Create and display a saved medication reminder.', icon: 'medication.svg', prompt: 'This is a practice medication reminder. Please choose a response.', actions: ['Acknowledge reminder', 'Snooze reminder', 'I need help'] },
  { id: 'connection', title: 'Connection error', description: 'Test a failed response and retry.', icon: 'connection.svg', prompt: 'Practice error: the response could not be sent. Try again.', actions: ['Retry'] },
] as const;

type Scenario = (typeof scenarios)[number];

export function SimulatorPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [result, setResult] = useState('');
  const [backendResult, setBackendResult] = useState('');
  const [starting, setStarting] = useState(false);
  const [startingScenario, setStartingScenario] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const previewHeading = useRef<HTMLHeadingElement>(null);

  // The Home Companion menu stays ready for sensor alerts and scheduled check-ins.
  // Do not interrupt a simulation already being started by the resident.
  useBackendEvents(event => {
    if (busyRef.current || resetting) return;
    const incidentId = incomingCompanionIncidentId(event);
    if (incidentId) {
      navigate(`/companion?eventId=${encodeURIComponent(incidentId)}`);
      return;
    }
    if (event.type === 'ROUTINE_REMINDER' && typeof event.data === 'object' && event.data !== null) {
      const reminderId = (event.data as Record<string, unknown>).id;
      if (typeof reminderId === 'string' && reminderId) {
        navigate(`/companion?reminderId=${encodeURIComponent(reminderId)}`);
      }
    }
  }, !starting && !resetting);

  // Recover recently created alerts if a WebSocket notification was missed.
  useEffect(() => {
    if (starting || resetting) return;
    let active = true;
    let reading = false;
    const checkPending = async () => {
      if (reading || busyRef.current) return;
      reading = true;
      try {
        const incidents = await request('/api/incidents');
        if (!active || busyRef.current) return;
        const id = latestPendingCompanionIncidentId(incidents, Date.now() - 2 * 60_000);
        if (id) navigate(`/companion?eventId=${encodeURIComponent(id)}`);
      } catch {
        // Retry silently: simulation controls keep their own error handling.
      } finally {
        reading = false;
      }
    };
    void checkPending();
    const timer = window.setInterval(() => { void checkPending(); }, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [navigate, starting, resetting]);

  useEffect(() => {
    if (selected) previewHeading.current?.focus();
  }, [selected]);

  async function runScenario(scenario: Scenario) {
    if (busyRef.current) return;
    setApiError('');
    setResult('');
    setBackendResult('');
    if (
      scenario.id === 'fall' ||
      scenario.id === 'medication' ||
      scenario.id === 'activity'
    ) {
      busyRef.current = true;
      setStarting(true);
      setStartingScenario(scenario.id);
      setSelected(null);
      try {
        if (scenario.id === 'fall') {
          const event = await createFallSimulation();
          if (mountedRef.current) navigate(`/companion?eventId=${encodeURIComponent(event.event_id)}`);
        } else if (scenario.id === 'medication') {
          const reminder = await createMedicationReminder();
          if (mountedRef.current) navigate(`/companion?reminderId=${encodeURIComponent(reminder.id)}`);
        } else {
          const anomaly = await createActivityAnomalySimulation();
          if (mountedRef.current) navigate(`/companion?eventId=${encodeURIComponent(anomaly.incident_id)}`);
        }
      } catch (error) {
        if (mountedRef.current) setApiError(error instanceof Error ? error.message : 'Could not start the simulation.');
      } finally {
        busyRef.current = false;
        if (mountedRef.current) { setStarting(false); setStartingScenario(null); }
      }
      return;
    }
    setSelected(scenario);
  }

  function respond(action: string) {
    if (selected?.id === 'connection') {
      setResult('Practice retry completed. No response was sent to a server.');
    } else if (action === 'Snooze reminder') {
      setResult('Snooze selected in this preview. A later reminder has not been scheduled.');
    } else {
      setResult(`You selected “${action}”. This practice response was not sent.`);
    }
  }

  async function resetAllDemoData() {
    if (busyRef.current || resetting) return;
    const confirmed = window.confirm(
      'Clear every saved demo incident and medication reminder? This cannot be undone.',
    );
    if (!confirmed) return;
    setResetting(true);
    setResetMessage('');
    setResetError('');
    try {
      const cleared = await resetDemoData();
      if (!mountedRef.current) return;
      setSelected(null);
      setResult('');
      setBackendResult('');
      setResetMessage(
        `Demo ready: cleared ${cleared.incidents_cleared} incident${cleared.incidents_cleared === 1 ? '' : 's'} and ${cleared.reminders_cleared} reminder${cleared.reminders_cleared === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      if (mountedRef.current) setResetError(error instanceof Error ? error.message : 'Could not reset demo data.');
    } finally {
      if (mountedRef.current) setResetting(false);
    }
  }

  return (
    <div className="simulator-page">
      <img className="simulator-botanical-header" src={asset('botanical-header.png')} alt="" />
      <header className="simulator-header">
        <Link className="simulator-logo-link" to="/companion" aria-label="Open Home Companion">
          <img src={asset('logo.png')} width="90" height="82" alt="" />
        </Link>
        <div className="simulator-brand-copy">
          <strong>FamilyCare</strong>
          <span>A Safer Home. A More Connected Tomorrow.</span>
        </div>
        <Link className="simulator-alert-link" to="/simulator" aria-label="Home Companion menu">
          <img src={asset('bell.svg')} width="34" height="34" alt="" />
        </Link>
      </header>

      <div className="simulator-workspace">
        <nav className="simulator-sidebar" aria-label="FamilyCare navigation">
          <img className="simulator-botanical-sidebar" src={asset('botanical-sidebar.png')} alt="" />
          <Link className="simulator-nav-link simulator-nav-link--home" to="/simulator">
            <img src={asset('home.svg')} width="40" height="40" alt="" />Home
          </Link>
          <Link className="simulator-nav-link" to="/history">
            <img src={asset('activity.svg')} width="40" height="40" alt="" />Activity
          </Link>
          <Link className="simulator-nav-link" to="/profile">
            <img src={asset('settings.svg')} width="40" height="40" alt="" />Settings
          </Link>
        </nav>

        <main className="simulator-main" aria-labelledby="simulator-title">
          <div className="simulator-heading">
            <h1 id="simulator-title">Sensor Simulator</h1>
            <p>Choose a scenario to test the Home Companion.</p>
          </div>

          <section className="simulator-panel" aria-label="Simulation controls" aria-busy={starting}>
            <p className="simulator-notice">SIMULATION ONLY · Safety events and reminders are saved to the local backend</p>
            {apiError && <p role="alert">{apiError} Please check that the backend is running before trying again.</p>}
            <ul className="simulator-scenarios">
              {scenarios.map(scenario => (
                <li className="simulator-row" key={scenario.id}>
                  <div className={`simulator-icon simulator-icon--${scenario.id}`}>
                    <img src={asset(scenario.icon)} width="48" height="48" alt="" />
                  </div>
                  <div className="simulator-row-copy">
                    <h2>{scenario.title}</h2>
                    <p>{scenario.description}</p>
                  </div>
                  <button className="simulator-run" type="button" disabled={starting} onClick={() => { void runScenario(scenario); }} aria-label={`Run ${scenario.title.toLowerCase()} simulation`}>
                    {starting && scenario.id === startingScenario ? 'Starting…' : 'Run simulation'}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="simulator-demo-tools" aria-labelledby="demo-tools-title">
            <div>
              <h2 id="demo-tools-title">Final demo controls</h2>
              <p>Clear saved practice incidents and reminders before recording the final demonstration.</p>
            </div>
            <button className="simulator-reset-data" type="button" disabled={starting || resetting} onClick={() => { void resetAllDemoData(); }}>
              {resetting ? 'Resetting…' : 'Reset Demo Data'}
            </button>
            {resetMessage && <p className="simulator-reset-message" role="status">{resetMessage}</p>}
            {resetError && <p className="simulator-reset-error" role="alert">{resetError}</p>}
          </section>

          {selected && (
            <section className="simulator-preview" aria-labelledby="simulator-preview-title">
              <h2 ref={previewHeading} tabIndex={-1} id="simulator-preview-title">{selected.title} · Practice preview</h2>
              {backendResult && <p className="simulator-notice" role="status">{backendResult}</p>}
              <p>{selected.prompt}</p>
              <div className="simulator-preview-actions">
                {selected.actions.map(action => (
                  <button className="simulator-run" type="button" key={action} onClick={() => respond(action)} disabled={Boolean(result)}>{action}</button>
                ))}
              </div>
              <p className="simulator-result" role="status" aria-live="polite" aria-atomic="true">{result}</p>
              <button className="simulator-reset" type="button" onClick={() => { setResult(''); setBackendResult(''); previewHeading.current?.focus(); }}>Reset practice</button>
            </section>
          )}

          <p className="simulator-footer-note">Fall and activity-anomaly detections create connected Home Companion check-ins and live family alerts.</p>
        </main>
      </div>
    </div>
  );
}
