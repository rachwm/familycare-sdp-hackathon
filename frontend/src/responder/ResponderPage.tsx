import { DashboardModeControl, LiveIncidentPanel, useDashboardData } from '../data/DashboardData';
import { useEffect, useRef, useState, type Dispatch, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { Botanical } from '../components/Botanical';
import { Avatar } from '../components/Avatar';
import { Icon, type IconName } from '../components/Icon';
import { FALL_ID } from '../data/mockData';
import type { DemoState, VisitReport } from '../coordinator/demo';
import type { ResponderAction } from './demo';
import './responder.css';

const progress = [
  { stage: 'assigned', label: 'Assigned', time: '10:48 AM', icon: 'bell' },
  { stage: 'accepted', label: 'Accepted', time: '10:49 AM', icon: 'check' },
  { stage: 'on-way', label: 'On the Way', time: '10:50 AM', icon: 'car' },
  { stage: 'arrived', label: 'Arrived', time: '10:58 AM', icon: 'home' },
] as const;
export function ResponderPage({ state, dispatch, showFamilyDemo }: { state: DemoState; dispatch: Dispatch<ResponderAction>; showFamilyDemo: () => void }) {
  const liveMode = useDashboardData()?.mode === 'live';
  const [condition, setCondition] = useState<VisitReport['condition'] | ''>('');
  const [notes, setNotes] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const report = state.visitReport;
  const assigned = state.responder === 'Daniel Lim' && (progress.some(step => step.stage === state.stage) || !!report);
  const blocked = state.escalated && !report;
  const current = progress.findIndex(step => step.stage === state.stage);
  const status = report ? 'Visit completed' : progress[current]?.label ?? 'No assignment';
  useEffect(() => { document.title = 'FamilyCare | Field Responder'; }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [state.stage, report]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (condition) dispatch({ type: 'submit-report', condition, notes });
  }
  function reset() { setCondition(''); setNotes(''); dispatch({ type: 'load-assignment' }); }
  return <div className="field-responder-shell">
    <header className="field-responder-header"><Brand /><span className="field-responder-role">Field Responder</span></header>
    <Botanical position="top" />
    <main className="field-responder-main">
      <section className="field-responder-heading"><p>Good morning,</p><h1 ref={heading} tabIndex={-1}>{liveMode ? 'Field Responder' : report ? 'Visit completed' : 'Daniel Lim'}</h1><p>{liveMode ? 'Live resident incidents · read-only' : report ? 'Thank you for checking on Puan Aisha.' : 'A little care makes a big difference.'}</p></section>
      <DashboardModeControl/>
      <div className="field-responder-demo-label"><Icon name="info"/><span>{liveMode ? 'Live Mode · no confirmed responder assignment' : 'Demo only · simulated assignment and updates'}</span></div>
      {liveMode ? <LiveIncidentPanel responder/> : !assigned || blocked ? <section className="field-responder-card"><span className="field-responder-card-icon"><Icon name="bell" /></span><h2>{blocked ? 'Assignment needs coordinator review' : 'No active assignment for Daniel'}</h2><p className="field-responder-muted">{blocked ? 'This incident is escalated. Start a fresh demonstration to try the field responder flow.' : 'Load the Puan Aisha demonstration assignment to begin. This resets the shared demo incident.'}</p><button className="field-responder-button" onClick={reset}>Load Daniel’s Demo Assignment</button></section> : report ? <>
        <section className={`field-responder-card field-responder-confirmation${report.condition === 'needs-assistance' ? ' needs-assistance' : ''}`} aria-label="Visit confirmation">
          <span className="field-responder-success"><Icon name={report.condition === 'safe' ? 'check' : 'history'} /></span><h2>Visit report submitted</h2><p className="field-responder-muted">16 October 2026 · {report.submittedAt}</p>
          <div className="field-responder-result"><span>Resident condition</span><strong>{report.condition === 'safe' ? 'Safe' : 'Needs further assistance'}</strong><p>{report.condition === 'safe' ? 'Daniel’s demo visit is complete.' : 'Your visit is complete. The incident stays open for coordinator follow-up.'}</p></div>
          {report.notes && <div className="field-responder-saved-notes"><h3>Visit notes</h3><p>{report.notes}</p></div>}
          <p className="field-responder-family-note"><Icon name="message"/>Outcome recorded in the shared Family Dashboard demo. No real notification sent.</p>
          <Link to={`/incidents/${FALL_ID}`} className="field-responder-button" onClick={showFamilyDemo}>View Family Demo Update <Icon name="arrow"/></Link>
        </section>
        <button className="field-responder-reset" onClick={reset}>Start a new demo visit</button>
      </> : <>
        <section className="field-responder-card field-responder-assignment"><div className="field-responder-section-row"><h2>Your assignment</h2><span className="field-responder-status">{status}</span></div>
          <div className="field-responder-resident"><Avatar /><div><h3>Puan Aisha</h3><p>Elmina Green 2</p><p>City of Elmina</p></div></div>
          <div className="field-responder-incident"><Icon name="alert"/><div><strong>Possible fall detected</strong><p>No response after the resident check-in. A wellbeing visit has been requested.</p></div></div>
          <dl className="field-responder-facts"><div><dt>Detected</dt><dd>10:32 AM</dd></div><div><dt>Assigned to you</dt><dd>10:48 AM</dd></div></dl>
          <p className="field-responder-readonly">Resident details are read-only.</p>
        </section>
        <section className="field-responder-card"><h2>Visit progress</h2><ol className="field-responder-progress">{progress.map((step, index) => <li key={step.stage} className={index <= current ? 'confirmed' : ''} aria-current={index === current ? 'step' : undefined}><span><Icon name={index < current ? 'check' : step.icon as IconName}/></span><div><strong>{step.label}</strong><p>{index <= current ? step.time : 'Pending'}</p></div>{index === current && <small>Current</small>}</li>)}</ol>
          {state.stage === 'assigned' && <><p className="field-responder-action-note">Accept the assignment when you’re ready to help.</p><button className="field-responder-button" onClick={() => dispatch({ type: 'accept' })}>Accept Assignment <Icon name="check"/></button></>}
          {state.stage === 'accepted' && <><p className="field-responder-action-note">Confirm when you begin your journey.</p><button className="field-responder-button" onClick={() => dispatch({ type: 'depart' })}>I’m On the Way <Icon name="arrow"/></button></>}
          {state.stage === 'on-way' && <><p className="field-responder-action-note">Update your status once you reach the residence.</p><button className="field-responder-button" onClick={() => dispatch({ type: 'arrive' })}>Confirm Arrival <Icon name="home"/></button></>}
          {state.stage === 'arrived' && <p className="field-responder-action-note">Arrival confirmed. Check on Puan Aisha, then submit the visit report below.</p>}
        </section>
        {state.stage === 'arrived' && <section className="field-responder-card"><h2>Visit report</h2><p className="field-responder-muted">Record the resident’s condition after your visit.</p><form onSubmit={submit}>
          <fieldset className="field-responder-conditions"><legend>Resident condition <span>Required</span></legend><label className={condition === 'safe' ? 'selected' : ''}><input type="radio" name="condition" value="safe" required checked={condition === 'safe'} onChange={() => setCondition('safe')}/><Icon name="shield"/><span>Safe</span></label><label className={condition === 'needs-assistance' ? 'selected' : ''}><input type="radio" name="condition" value="needs-assistance" required checked={condition === 'needs-assistance'} onChange={() => setCondition('needs-assistance')}/><Icon name="people"/><span>Needs further assistance</span></label></fieldset>
          <label className="field-responder-notes" htmlFor="visit-notes">Visit notes <span>Optional</span></label><textarea id="visit-notes" value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} rows={4} placeholder="Add a short update about your visit…"/><p className="field-responder-note-count">{notes.length}/1,000 characters</p>
          {condition === 'needs-assistance' && <p className="field-responder-followup"><Icon name="info"/>The incident will remain open for coordinator follow-up. This demo does not contact emergency services.</p>}
          <button className="field-responder-button" type="submit" disabled={!condition}>Submit Report & Complete Visit <Icon name="check"/></button>
        </form></section>}
      </>}
      <p className="field-responder-footer">FamilyCare · City of Elmina<br/>{liveMode ? 'Backend incident data · no live dispatch actions' : '16 October 2026 · Mock data, no live dispatch'}</p>
    </main><div className="field-responder-garden"><Botanical position="bottom"/></div>
  </div>;
}
