import { useState } from 'react';
import { resolveFollowUpIncident, sendResponderCommand, type LiveIncident, type ResponderCommand } from './liveIncidents';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
export function LiveResponderActions({ incident, responder, refresh }: { incident: LiveIncident; responder: boolean; refresh: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [condition, setCondition] = useState('safe'); const [notes, setNotes] = useState('');
  const button = responder ? 'field-responder-button' : 'sdp-button';
  async function submit(command: ResponderCommand) {
    if (busy) return;
    setBusy(true); setError('');
    try { await sendResponderCommand(incident.event_id, command, API_BASE); refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Update failed. Refresh the incident before retrying.'); }
    finally { setBusy(false); }
  }
  async function resolveFollowUp() {
    if (busy) return;
    setBusy(true); setError('');
    try { await resolveFollowUpIncident(incident.event_id, API_BASE); refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Resolution failed. Refresh the incident before retrying.'); }
    finally { setBusy(false); }
  }
  const next = { assigned: ['Accept Assignment', 'accepted'], accepted: ['I’m On the Way', 'on_the_way'], on_the_way: ['Confirm Arrival', 'arrived'] } as const;
  const action = next[incident.responder_status as keyof typeof next];
  return <>
    <p>{incident.responder_name ? `Assigned responder: ${incident.responder_name}` : 'No confirmed responder assignment'}</p>
    {error && <p role="alert">{error}</p>}
    {incident.visit_report ? <section aria-label="Completed visit report"><h3>Visit report submitted</h3><p>Resident condition: {incident.visit_report.resident_condition.replace(/_/g, ' ')}</p><p>{incident.visit_report.summary}</p><p>{incident.visit_report.action_taken}</p><p>{incident.status === 'resolved' ? 'Visit completed · incident resolved' : 'Coordinator follow-up required · incident remains open'}</p>{!responder && incident.status !== 'resolved' && <button className={button} disabled={busy} type="button" onClick={() => { void resolveFollowUp(); }}>Resolve After Follow-up</button>}</section> : incident.status !== 'resolved' && <>
      {!responder && incident.requires_responder && !incident.responder_id && <button className={button} disabled={busy} onClick={() => submit({ endpoint: 'assign-responder', payload: { responder_id: 'daniel', responder_name: 'Daniel Lim', responder_phone: '' } })}>Assign Daniel Lim</button>}
      {responder && incident.responder_id === 'daniel' && incident.responder_name === 'Daniel Lim' && <>
        {action && <button className={button} disabled={busy} onClick={() => submit({ endpoint: 'responder-status', payload: { responder_status: action[1] } })}>{action[0]}</button>}
        {incident.responder_status === 'arrived' && <form onSubmit={event => { event.preventDefault(); void submit({ endpoint: 'visit-report', payload: { summary: notes.trim() || 'Wellbeing visit completed.', resident_condition: condition, action_taken: 'Resident wellbeing checked during the visit.' } }); }}>
          <label>Resident condition<select aria-label="Live resident condition" value={condition} onChange={event => setCondition(event.target.value)} disabled={busy}><option value="safe">Safe</option><option value="needs_further_assistance">Needs further assistance</option></select></label>
          <label>Visit notes (optional)<textarea aria-label="Live visit notes" maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} disabled={busy}/></label>
          <button className={button} disabled={busy} type="submit">{condition === 'safe' ? 'Submit Report & Complete Visit' : 'Submit Report & Request Follow-up'}</button>
        </form>}
      </>}
    </>}
    {busy && <p role="status">Saving backend update…</p>}
  </>;
}
