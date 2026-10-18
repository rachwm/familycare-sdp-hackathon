import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { useBackendEvents } from '../data/backendEvents';
import { MedicationCompanion } from './MedicationCompanion';
import { incomingCompanionIncidentId, latestPendingCompanionIncidentId } from './companionIncoming';
import { request } from './fallApi';
import { getFallIncident, submitFallResponse, type FallIncident, type ResidentResponse } from './fallApi';
import './CompanionPage.css';

type Choice = 'okay' | 'help' | 'timeout';
type Phase = 'loading' | 'ready' | 'sending' | 'complete' | 'error';
const apiResponse: Record<Choice, ResidentResponse> = { okay: 'resident_okay', help: 'resident_needs_help', timeout: 'timeout' };

function recordedMessage(event: FallIncident): string {
  if (event.status === 'resolved') {
    return event.resident_response === 'resident_okay'
      ? 'Thank you, Puan Aisha. Your “I’m okay” response has been recorded.'
      : 'This incident has already been resolved.';
  }
  if (event.status === 'resident_needs_help') return 'Your request for help has been recorded. The incident has been escalated.';
  if (event.status === 'no_response') return 'No response was received. The incident has been escalated.';
  return '';
}

export function CompanionPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const reminderId = params.get('reminderId');
  const eventId = params.get('eventId');
  const navigateToIncident = useCallback((id: string) => {
    navigate(`/companion?eventId=${encodeURIComponent(id)}`);
  }, [navigate]);
  const refreshPending = useCallback(async () => {
    if (reminderId || eventId) return;
    try {
      const incidents = await request('/api/incidents');
      const id = latestPendingCompanionIncidentId(incidents);
      if (id) navigateToIncident(id);
    } catch {
      // The WebSocket remains active; retry on the next poll.
    }
  }, [reminderId, eventId, navigateToIncident]);
  useBackendEvents(event => {
    if (reminderId || eventId) return;
    if (event.type === 'ROUTINE_REMINDER' && typeof event.data === 'object' && event.data !== null) {
      const id = (event.data as Record<string, unknown>).id;
      if (typeof id === 'string' && id) navigate(`/companion?reminderId=${encodeURIComponent(id)}`);
      return;
    }
    const incomingId = incomingCompanionIncidentId(event);
    if (incomingId) navigateToIncident(incomingId);
    else if (event.type === 'INCIDENT_UPDATED' || event.type === 'DEMO_DATA_RESET') void refreshPending();
  }, !reminderId && !eventId);
  useEffect(() => {
    if (reminderId || eventId) return;
    void refreshPending();
    const timer = window.setInterval(() => { void refreshPending(); }, 3000);
    return () => window.clearInterval(timer);
  }, [reminderId, eventId, refreshPending]);

  if (reminderId && !eventId && params.get('demo') !== 'fall') {
    return <MedicationCompanion key={search} reminderId={reminderId} />;
  }
  // A new incident starts a fresh session, even when only the URL query changes.
  return <CompanionSession key={search} search={search} />;
}

function CompanionSession({ search }: { search: string }) {
  const params = new URLSearchParams(search);
  const eventId = params.get('eventId');
  const connected = Boolean(eventId);
  const isFall = connected || params.get('demo') === 'fall';
  const [choice, setChoice] = useState<Choice | null>(null);
  const choiceRef = useRef<Choice | null>(null);
  const [seconds, setSeconds] = useState(30);
  const deadline = useRef<number | null>(connected ? null : Date.now() + 30_000);
  const [phase, setPhase] = useState<Phase>(connected ? 'loading' : 'ready');
  const [incident, setIncident] = useState<FallIncident | null>(null);
  const [requestError, setRequestError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sendAttempt, setSendAttempt] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const chooseResponse = useCallback((value: Choice) => {
    if (isFall && choiceRef.current !== null) return;
    choiceRef.current = value;
    setChoice(value);
  }, [isFall]);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    const controller = new AbortController();
    setPhase('loading');
    setRequestError('');
    void getFallIncident(eventId, controller.signal).then(event => {
      if (!active) return;
      setIncident(event);
      // Use the incident's original time so refreshing cannot restart its clock.
      deadline.current = Math.min(Date.parse(event.timestamp) + 30_000, Date.now() + 30_000);
      setSeconds(Math.max(0, Math.min(30, Math.ceil((deadline.current - Date.now()) / 1000))));
      setPhase(event.status === 'awaiting_resident_response' ? 'ready' : 'complete');
    }).catch(error => {
      if (!active) return;
      setRequestError(error instanceof Error ? error.message : 'Could not load the check-in.');
      setPhase('error');
    });
    return () => { active = false; controller.abort(); };
  }, [eventId, loadAttempt]);

  useEffect(() => {
    if (!isFall || phase !== 'ready' || choice !== null || deadline.current === null) return;
    function tick() {
      const remaining = Math.max(0, Math.ceil(((deadline.current ?? Date.now()) - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) chooseResponse('timeout');
    }
    tick();
    const timer = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [isFall, phase, choice, chooseResponse]);

  useEffect(() => {
    if (!eventId || choice === null) return;
    let active = true;
    const controller = new AbortController();
    setPhase('sending');
    setRequestError('');
    void submitFallResponse(eventId, apiResponse[choice], controller.signal).then(event => {
      if (!active) return;
      setIncident(event);
      setPhase('complete');
    }).catch(error => {
      if (!active) return;
      setRequestError(error instanceof Error ? error.message : 'Could not confirm your response.');
      setPhase('error');
    });
    return () => { active = false; controller.abort(); };
  }, [eventId, choice, sendAttempt]);

  function changeVoice(enabled: boolean) {
    setVoiceEnabled(enabled);
    setVoiceError('');
    setVoiceStatus('');
    const previous = audioRef.current;
    if (previous) {
      previous.onplaying = null; previous.onended = null; previous.onerror = null;
      previous.pause(); previous.currentTime = 0; audioRef.current = null;
    }
    if (!enabled) return;
    if (isFall && (choice !== null || phase === 'complete')) {
      setVoiceStatus('The check-in has finished.');
      return;
    }
    const filename = incident?.event_type === 'unusual_activity'
      ? 'greeting.wav'
      : isFall ? 'fall-alert.wav' : 'greeting.wav';
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/${filename}`);
    audioRef.current = audio;
    audio.volume = 1;
    audio.onplaying = () => setVoiceStatus('Voice prompt is playing.');
    audio.onended = () => { setVoiceStatus('Voice prompt finished.'); audioRef.current = null; };
    audio.onerror = () => {
      if (audioRef.current !== audio) return;
      setVoiceEnabled(false); setVoiceStatus('');
      setVoiceError('The recording could not load. Please read the message.');
    };
    setVoiceStatus('Loading voice prompt…');
    void audio.play().catch(error => {
      if (audioRef.current !== audio) return;
      setVoiceEnabled(false); setVoiceStatus('');
      setVoiceError(error instanceof Error ? `Audio could not play: ${error.message}` : 'Audio could not play. Please read the message.');
    });
  }

  useEffect(() => {
    if (choice === null && phase !== 'complete') return;
    const audio = audioRef.current;
    if (audio) {
      audio.onplaying = null; audio.onended = null; audio.onerror = null;
      audio.pause(); audio.currentTime = 0; audioRef.current = null;
      setVoiceStatus('Voice prompt stopped.');
    }
  }, [choice, phase]);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onplaying = null; audio.onended = null; audio.onerror = null;
      audio.pause(); audioRef.current = null;
    }
  }, []);

  const buttonsDisabled = isFall && (choice !== null || phase !== 'ready');
  const checkInHeading = !connected
    ? (isFall ? 'A possible fall was detected' : 'Good morning, Puan Aisha')
    : incident?.event_type === 'unusual_activity'
      ? 'Activity anomaly detected'
      : incident?.event_type === 'possible_fall'
        ? 'A possible fall was detected'
        : 'Loading your safety check-in';
  const checkInPrompt = incident?.event_type === 'unusual_activity'
    ? 'Puan Aisha, we noticed a change from your usual home routine. Are you okay?'
    : isFall
      ? 'Puan Aisha, are you okay? Please choose a button.'
      : 'Your home companion is here for you.';
  let feedback = '';
  if (connected) {
    if (phase === 'loading') feedback = 'Loading your check-in…';
    if (phase === 'sending') feedback = choice === 'timeout' ? 'No response was received. Recording the timeout…' : 'Sending your response…';
    if (phase === 'complete' && incident) feedback = recordedMessage(incident);
    if (phase === 'error') feedback = choice ? 'Your response could not be confirmed. Please retry.' : 'Your check-in could not be loaded. Please retry.';
  } else if (choice === 'okay') feedback = 'You selected “I’m okay”.';
  else if (choice === 'help') feedback = 'You selected “I need help”.';
  else if (choice === 'timeout') feedback = '00:00 — no response was received.';

  return (
    <div className="companion-page">
      <header className="companion-header"><Brand /><span className="companion-mode">Home Companion</span></header>
      <label className="companion-voice-control">
        <input type="checkbox" checked={voiceEnabled} onChange={event => changeVoice(event.target.checked)} />Voice prompts
      </label>
      {voiceError && <p className="companion-voice-error" role="status">{voiceError}</p>}
      {voiceStatus && <p role="status">{voiceStatus}</p>}
      <section aria-labelledby="companion-heading">
        <h1 id="companion-heading">{checkInHeading}</h1>
        <p>{checkInPrompt}</p>
        {isFall && ((phase === 'ready' && choice === null) || choice === 'timeout') && (
          <div className="companion-countdown"><p>Time remaining to respond</p>
            <div className="companion-countdown-number" role="timer" aria-label={`${seconds} seconds remaining`} aria-live="off">00:{String(seconds).padStart(2, '0')}</div>
          </div>
        )}
        <div className="companion-actions">
          <button type="button" className="companion-button companion-button--okay" disabled={buttonsDisabled} onClick={() => chooseResponse('okay')}>I’m okay</button>
          <button type="button" className="companion-button companion-button--help" disabled={buttonsDisabled} onClick={() => chooseResponse('help')}>I need help</button>
        </div>
        <div className="companion-feedback" role="status" aria-live="polite" aria-atomic="true">
          {feedback && <p>{feedback}</p>}
          {connected && phase === 'ready' && <p className="companion-demo-note">{incident?.simulation ? 'Connected practice check-in.' : 'Your care check-in is ready.'}</p>}
          {!connected && (isFall || choice !== null) && <p className="companion-demo-note">Practice mode — no alert or response is being sent.</p>}
        </div>
        {connected && phase === 'error' && (
          <div className="companion-feedback">
            <p>{requestError}</p>
            <button type="button" className="companion-button companion-button--okay" onClick={() => choice ? setSendAttempt(value => value + 1) : setLoadAttempt(value => value + 1)}>{choice ? 'Retry response' : 'Retry loading check-in'}</button>
          </div>
        )}
        {(phase === 'complete' || (!connected && choice !== null)) && (
          <Link className="companion-home-link" to="/simulator">Back to Home Companion</Link>
        )}
      </section>
    </div>
  );
}
