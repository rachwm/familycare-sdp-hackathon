import { DashboardModeControl, LiveIncidentPanel, useDashboardData } from '../data/DashboardData';
import { useEffect, useRef, type Dispatch } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { Botanical } from '../components/Botanical';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { ResponderPortrait, Timeline } from './CoordinatorParts';
import { IncidentsDirectory, NotFound } from './DirectoryPages';
import { currentTime, eligibleCandidate, incidentId, statusLabel, steps, type Action, type DemoState, type Stage } from './demo';
import { getIncidents, incidentPath, residentFor, type IncidentRecord } from './records';
import { coordinatorDemoReports, coordinatorDemoTabs, responderMilestones, type CoordinatorDemoReport } from './demoView';
import './coordinator-demo.css';

export function CoordinatorDemo({ state, dispatch }: { state: DemoState; dispatch: Dispatch<Action> }) {
  const liveMode = useDashboardData()?.mode === 'live';
  const location = useLocation(); const navigate = useNavigate(); const main = useRef<HTMLElement>(null);
  const [section = '', id, subpage] = location.pathname.replace(/^\/coordinator\/?/, '').split('/');
  const progressPage = section === 'progress' || subpage === 'track';
  const reportPage = section === 'reports';
  const incidents = getIncidents(state); const reports = coordinatorDemoReports(state);
  const selected = incidents.find(incident => incident.id === (id ?? incidentId));
  const report = reports.find(report => report.id === id);
  const matchingFailed = state.stage === 'matching' && !eligibleCandidate(state);
  const title = reportPage ? id ? 'Visit Report' : 'Visit Reports' : progressPage ? 'Responder Progress' : id ? 'Incident Details' : 'SDP Response Centre';
  useEffect(() => {
    document.title = `FamilyCare | ${title}`; window.scrollTo(0, 0); main.current?.focus({ preventScroll: true });
  }, [location.pathname, title]);
  function reportView(record: CoordinatorDemoReport) {
    return <article className="sdp-card sdp-report">
      <div className="sdp-section-heading"><h2><Icon name="history"/>Completed visit report</h2><span className="sdp-status">Submitted · Demo</span></div>
      <h3>{residentFor(record.residentId).name}</h3><p className="sdp-muted">{record.title} · {residentFor(record.residentId).area}</p>
      <dl className="sdp-facts"><div><dt>Responder</dt><dd>{record.responder}</dd></div><div><dt>Submitted</dt><dd>{record.completion} · 16 Oct 2026</dd></div></dl>
      <div className={`sdp-outcome ${record.condition === 'needs-assistance' ? 'sdp-followup' : ''}`}><span>Recorded outcome</span><strong>{record.condition === 'safe' ? 'Safe' : record.condition === 'needs-assistance' ? 'Needs further assistance' : 'Visit completed'}</strong><p>{record.outcome}</p></div>
      {record.notes && <div className="sdp-notes"><h4>Visit notes</h4><p>{record.notes}</p></div>}
      <p className="sdp-muted">{record.resolved ? 'Incident resolved in the demonstration.' : 'Visit complete · incident open for coordinator follow-up.'} This is a simulated visit record, not a verified clinical assessment.</p>
      <Link className="sdp-text-link" to="/coordinator/reports">← All visit reports</Link>
    </article>;
  }
  function residentCard(record: IncidentRecord) {
    const resident = residentFor(record.residentId);
    return <article className="sdp-card"><div className="sdp-section-heading"><h2>Resident & Incident</h2><span className={`sdp-status ${record.group !== 'Resolved' && record.priority === 'High' ? 'sdp-urgent' : ''}`}>{record.group === 'Resolved' ? 'Resolved' : `${record.priority} Priority`}</span></div>
      <div className="sdp-person">{resident.id === 'aisha' ? <Avatar/> : <span className="sdp-person-initial">{resident.name.split(' ').at(-1)?.[0]}</span>}<div><h3>{resident.name}</h3><p>{resident.area} · City of Elmina</p><small>Resident information is read-only</small></div></div>
      <div className="sdp-incident-note"><Icon name="alert"/><div><strong>{record.title}</strong><p>Detected {record.detected}{record.requested ? ` · Assistance requested ${record.requested}` : ''}</p></div></div>
      <dl className="sdp-facts"><div><dt>Current status</dt><dd>{record.status}</dd></div><div><dt>Assigned responder</dt><dd>{record.responder ?? 'Awaiting assignment'}</dd></div></dl>
      <Link className="sdp-button" to={`/coordinator/progress/${record.id}`}>View Responder Progress <Icon name="arrow"/></Link>
      {reports.some(report => report.id === record.id) && <Link className="sdp-button secondary" to={`/coordinator/reports/${record.id}`}>View Visit Report</Link>}
    </article>;
  }
  function progressView(record: IncidentRecord) {
    const resident = residentFor(record.residentId); const isAisha = record.id === incidentId;
    const milestones = responderMilestones(state);
    return <><article className="sdp-card"><div className="sdp-section-heading"><h2><Icon name="people"/>Assigned responder</h2><span className="sdp-status">{record.status}</span></div>
      <div className="sdp-person">{record.responder ? <ResponderPortrait name={record.responder}/> : <span className="sdp-person-initial"><Icon name="clock"/></span>}<div><h3>{record.responder ?? 'Awaiting assignment'}</h3><p>Assisting {resident.name}</p><small>{resident.area} · City of Elmina</small></div></div>
      {isAisha ? <ol className="sdp-milestones" aria-label="Confirmed responder milestones">{milestones.map((step, index) => <li key={step.id} className={step.confirmed ? 'confirmed' : ''}><span><Icon name={step.confirmed ? 'check' : 'clock'}/></span><strong>{step.label}</strong><p>{step.confirmed ? step.time : 'Pending'}</p>{index < milestones.length - 1 && <i/>}</li>)}</ol> : <dl className="sdp-facts"><div><dt>Recorded status</dt><dd>{record.status}</dd></div><div><dt>Departure</dt><dd>{record.departure ?? 'Not recorded'}</dd></div></dl>}
      <p className="sdp-muted">{isAisha ? state.escalated ? 'Coordinator follow-up is required. The incident remains open.' : state.stage === 'completed' ? 'The visit is complete. The submitted report is available below.' : 'Only confirmed updates are shown. Later steps remain pending.' : 'Other milestone times are not recorded for this reference case.'}</p>
      {reports.some(report => report.id === record.id) ? <Link className="sdp-button" to={`/coordinator/reports/${record.id}`}>View Completed Visit Report <Icon name="arrow"/></Link> : <div className="sdp-report-pending"><Icon name="history"/>Visit report pending · available after submission</div>}
    </article>{isAisha && <details className="sdp-audit"><summary>View full incident timeline</summary><Timeline state={state}/></details>}</>;
  }
  let content;
  if (reportPage) content = id ? report ? reportView(report) : <NotFound subject="Submitted report" back="/coordinator/reports"/> : <div className="sdp-report-grid">{reports.map(record => <article className="sdp-card sdp-report-preview" key={record.id}><span className="sdp-status">Visit completed</span><h2>{residentFor(record.residentId).name}</h2><p className="sdp-muted">{record.title}</p><dl className="sdp-facts"><div><dt>Responder</dt><dd>{record.responder}</dd></div><div><dt>Submitted</dt><dd>{record.completion}</dd></div></dl><p>{record.condition === 'needs-assistance' ? 'Needs further assistance · follow-up required' : record.outcome}</p><Link className="sdp-button secondary" to={`/coordinator/reports/${record.id}`}>Read {residentFor(record.residentId).name} Report <Icon name="arrow"/></Link></article>)}{reports.length === 0 && <article className="sdp-card"><h2>No completed visit reports yet</h2><p>Reports appear here after a responder submits the visit outcome.</p></article>}</div>;
  else if (progressPage) content = selected ? <div className="sdp-progress-layout"><div>{progressView(selected)}</div><aside className="sdp-card sdp-visit-context"><h2>Resident</h2><h3>{residentFor(selected.residentId).name}</h3><p className="sdp-muted">{residentFor(selected.residentId).area} · City of Elmina</p><p>{selected.title}</p><Link className="sdp-text-link" to={incidentPath(selected.id)}>View Incident Details →</Link></aside></div> : <article className="sdp-card"><h2>No active responder assignment</h2><p>Select an incident scenario below to demonstrate progress.</p></article>;
  else if ((section === 'incidents') && id) content = selected ? <div className="sdp-detail-layout">{residentCard(selected)}<div>{progressView(selected)}</div></div> : <NotFound subject="Incident" back="/coordinator"/>;
  else if (section === '' || section === 'incidents') content = <><div className="sdp-intro-note"><Icon name="shield"/><p><strong>{incidents.filter(record => record.group !== 'Resolved').length} active incidents</strong><span>Review a resident’s incident, follow their responder and read the submitted outcome.</span></p></div><IncidentsDirectory state={state}/></>;
  else content = <NotFound subject="Page" back="/coordinator"/>;
  const nextLabel = state.stage === 'assigned' ? `Simulate ${state.responder} Accepting` : state.stage === 'accepted' ? 'Confirm Demo Departure' : state.stage === 'on-way' ? 'Confirm Demo Arrival' : state.stage === 'arrived' ? 'Record Resident Check' : state.stage === 'checked' ? 'Record Completed Visit' : 'Next Demo Update';
  return <div className="sdp-demo">
    <header className="sdp-header"><Link to="/coordinator" aria-label="FamilyCare Response Centre"><Brand/></Link><span className="sdp-powered">Powered by <strong>Sime Darby Property</strong></span><div className="sdp-account"><span>SR</span><div><strong>Siti Rahman</strong><small>SDP Coordinator</small></div></div></header>
    <Botanical position="top"/>
    <main ref={main} tabIndex={-1} className="sdp-main"><div className="sdp-heading"><div><span className="sdp-eyebrow">FamilyCare · City of Elmina</span><h1>{title}</h1><p>Resident incidents, responder progress and visit outcomes.</p></div><span className="sdp-demo-badge"><i/>{liveMode ? 'Live Mode · read-only' : 'Demo Mode · no backend required'}</span></div>
      <nav className="sdp-tabs" aria-label="Main coordinator features">{coordinatorDemoTabs.map((tab, index) => <Link key={tab.to} to={tab.to} aria-current={index === (reportPage ? 2 : progressPage ? 1 : 0) ? 'page' : undefined}><Icon name={tab.icon}/>{tab.label}</Link>)}</nav>
      {!liveMode && progressPage && incidents.length > 0 && <label className="sdp-incident-picker">Incident<select value={selected?.id ?? ''} onChange={event => navigate(`/coordinator/progress/${event.target.value}`)}>{!selected && <option value="">Choose an incident</option>}{incidents.map(record => <option key={record.id} value={record.id}>{residentFor(record.residentId).name} · {record.title}</option>)}</select></label>}
      <DashboardModeControl/>
      {liveMode ? <LiveIncidentPanel/> : content}
      {!liveMode && <section className="sdp-controls" aria-label="Coordinator demo controls"><div><strong>Demo controls</strong><p>Simulate responder updates for the presentation.</p></div><label>Scenario<select aria-label="Coordinator demo scenario" value={state.stage} onChange={event => dispatch({ type: 'select', stage: event.target.value as Stage })}>{steps.map(([stage, label]) => <option key={stage} value={stage}>{label}</option>)}</select></label><button className="sdp-button" disabled={state.stage === 'completed' || state.escalated || matchingFailed} onClick={() => dispatch({ type: 'advance' })}>{nextLabel}</button><button className="sdp-reset" onClick={() => dispatch({ type: 'select', stage: 'requested' })}>Reset demo</button><span className="sdp-live-status" role="status">{statusLabel(state)} · {currentTime(state)}</span></section>}
      {!liveMode && <details className="sdp-advanced"><summary>Advanced features</summary><p>Existing matching, maps, reassignment, escalation, directories and settings remain available in the full Response Centre.</p><Link className="sdp-text-link" to="/coordinator?advanced=1">Open full coordinator interface →</Link><Link className="sdp-text-link" to="/coordinator/responders">Responder directory →</Link><Link className="sdp-text-link" to="/coordinator/residents">Resident directory →</Link><Link className="sdp-text-link" to="/coordinator/settings">Settings →</Link></details>}
      <footer className="sdp-footer"><strong>FamilyCare · A Safer Home. A More Connected Tomorrow.</strong><span>{liveMode ? 'Live Mode · backend incident records · no live dispatch actions' : '16 October 2026 · All incidents and updates are demonstration data.'}</span></footer>
    </main><div className="sdp-garden"><Botanical position="bottom"/></div>
  </div>;
}
