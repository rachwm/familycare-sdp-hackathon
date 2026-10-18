import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { getMedicationReminder, type MedicationReminder } from './reminderApi';

type PreviewAction = 'acknowledge' | 'snooze' | 'help';
const responses: Record<PreviewAction, string> = {
  acknowledge: 'Reminder acknowledged on this device. No response has been sent.',
  snooze: 'Snooze selected for this preview. Another reminder has not been scheduled.',
  help: 'Help selected for this preview. No help request has been sent.',
};

export function MedicationCompanion({ reminderId }: { reminderId: string }) {
  const navigate = useNavigate();
  const [reminder, setReminder] = useState<MedicationReminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<PreviewAction | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(''); setReminder(null);
    void getMedicationReminder(reminderId, controller.signal).then(saved => {
      if (active) setReminder(saved);
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'The reminder could not load.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [reminderId, attempt]);

  function stopAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onplaying = null; audio.onended = null; audio.onerror = null;
    audio.pause(); audio.currentTime = 0; audioRef.current = null;
  }

  function changeVoice(enabled: boolean) {
    stopAudio(); setVoiceEnabled(enabled); setVoiceStatus(''); setVoiceError('');
    if (!enabled || !reminder || outcome) return;
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/medication.wav`);
    audioRef.current = audio;
    audio.onplaying = () => setVoiceStatus('Voice prompt is playing.');
    audio.onended = () => { setVoiceStatus('Voice prompt finished.'); audioRef.current = null; };
    audio.onerror = () => {
      if (audioRef.current !== audio) return;
      setVoiceEnabled(false); setVoiceStatus('');
      setVoiceError('The recording could not load. Please read the reminder.');
    };
    setVoiceStatus('Loading voice prompt…');
    void audio.play().catch(reason => {
      if (audioRef.current !== audio) return;
      setVoiceEnabled(false); setVoiceStatus('');
      setVoiceError(reason instanceof Error ? `Audio could not play: ${reason.message}` : 'Audio could not play.');
    });
  }

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.onplaying = null; audio.onended = null; audio.onerror = null;
      audio.pause(); audioRef.current = null;
    }
  }, []);

  function choose(action: PreviewAction) {
    stopAudio(); setVoiceStatus(''); setOutcome(action);
  }

  return (
    <div className="companion-page">
      <header className="companion-header"><Brand /><span className="companion-mode">Home Companion</span></header>
      <label className="companion-voice-control">
        <input type="checkbox" checked={voiceEnabled} disabled={!reminder || Boolean(outcome)} onChange={event => changeVoice(event.target.checked)} />Voice prompts
      </label>
      {voiceStatus && <p role="status">{voiceStatus}</p>}
      {voiceError && <p className="companion-voice-error" role="status">{voiceError}</p>}
      <section aria-labelledby="medication-heading">
        <h1 id="medication-heading">Medication reminder</h1>
        {loading && <p role="status">Loading your medication reminder…</p>}
        {error && <div className="companion-feedback" role="alert"><p>{error}</p>
          <button type="button" className="companion-button companion-button--okay" onClick={() => setAttempt(value => value + 1)}>Retry loading reminder</button>
        </div>}
        {reminder && <>
          <div className="companion-feedback">
            <p>{reminder.message}</p>
            <p>Reminder time: <time dateTime={reminder.time}>{reminder.time}</time></p>
          </div>
          <p>Practice responses — no response will be sent.</p>
          <div className="companion-actions">
            <button type="button" className="companion-button companion-button--okay" disabled={Boolean(outcome)} onClick={() => choose('acknowledge')}>Acknowledge reminder</button>
            <button type="button" className="companion-button companion-button--okay" disabled={Boolean(outcome)} onClick={() => choose('snooze')}>Snooze reminder</button>
            <button type="button" className="companion-button companion-button--help" disabled={Boolean(outcome)} onClick={() => choose('help')}>I need help</button>
          </div>
          <div className="companion-feedback" role="status" aria-live="polite" aria-atomic="true">{outcome && <p>{responses[outcome]}</p>}</div>
        </>}
        <div className="companion-actions"><button type="button" className="companion-button companion-button--okay" onClick={() => navigate('/simulator')}>Back to simulator</button></div>
      </section>
    </div>
  );
}
