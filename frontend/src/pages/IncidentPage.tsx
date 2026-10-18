import type { DemoState } from '../coordinator/demo';
import { familyDisplayText, familyEvents } from '../coordinator/familyBridge';
import { useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Icon } from '../components/Icon';
import { PageHeading } from '../components/PageHeading';
import { ResidentCard } from '../components/ResidentCard';
import { DEMO_DATE, FALL_ID, UNUSUAL_ID, getIncidentEvents, getScenario, type Scenario } from '../data/mockData';
import { useLive } from '../data/liveContext';
import { displayDate, displayTime, incidentDescription, incidentLabel, type LiveIncident } from '../data/liveIncidents';
import { LiveNotice } from '../components/LiveNotice';

export function IncidentPage({ scenario, sharedDemo }: { scenario: Scenario; sharedDemo?: DemoState }) {
  const { incidentId } = useParams();
  const live = useLive();
  const events = sharedDemo ? familyEvents(sharedDemo) : getIncidentEvents(scenario);
  const availableId = scenario === 'unusual' ? UNUSUAL_ID : FALL_ID;
  const available = events.length > 0 && incidentId === availableId;
  const state = getScenario(scenario);
  const completed = scenario === 'completed';
  const isVisit = ['arrived', 'checked', 'completed'].includes(scenario);
  if (live.mode === 'live') {
    const incident = live.incidents.find(item => item.event_id === incidentId);
    return <><BackButton /><PageHeading title="Incident Details" subtitle="Full details and updates on this incident." />
      <LiveNotice />
      {incident ? <LiveIncidentDetails incident={incident} /> : !live.loading && !live.error && <div className="empty-state"><h2>Incident unavailable</h2><p>This incident is not in the current backend response.</p></div>}
    </>;
  }
  return <>
    <BackButton />
    <PageHeading title={completed ? 'Visit Summary' : isVisit ? 'Visit Details' : 'Incident Details'} subtitle={completed ? 'Details of the response and visit.' : 'Full details and updates on this incident.'} />
    {!available ? <div className="empty-state"><h2>No incident in this scenario</h2><p>This incident has not occurred in the selected demonstration. Choose an incident scenario using the development controls, or go back.</p></div> : <>
      <ResidentCard scenario={scenario} detail />
      <section className="detail-section"><h2>{isVisit ? 'Visit Details' : 'Incident Summary'}</h2><div className="white-card"><dl className="summary-grid"><dt>Incident Type</dt><dd>{scenario === 'unusual' ? 'Activity Anomaly Detected' : 'Possible Fall Detected'}</dd><dt>Date & Time</dt><dd>{DEMO_DATE}, {scenario === 'unusual' ? '2:18 PM' : '10:32 AM'}</dd><dt>Location</dt><dd>Puan Aisha’s home</dd></dl></div></section>
      {state.stage >= 3 && scenario !== 'unusual' && <section className="detail-section"><h2>Responder Details</h2><div className="responder-card white-card"><span className="initial-avatar">DL</span><div><h3>{sharedDemo?.responder ?? 'Daniel Lim'}</h3><p>Home Companion · Demo responder</p><p>{sharedDemo ? familyDisplayText(sharedDemo.events.at(-1)?.description ?? '') : completed ? 'Completed visit at 11:20 AM' : state.stage >= 5 ? 'Arrived at 10:58 AM' : state.stage >= 4 ? 'On the way since 10:50 AM' : 'Assigned at 10:48 AM'}</p></div></div></section>}
      <section className="detail-section"><h2>Response Timeline</h2><ol className="timeline white-card">{events.map((event, index) => <li key={event.id} className={`tone-${event.tone}`} data-event={event.id}>
        <span className="timeline-icon"><Icon name={event.icon} /></span><div className="timeline-copy"><h3>{event.title}</h3><p>{event.description}</p></div><time dateTime={`2026-10-16T${String(Math.floor(event.minutes / 60)).padStart(2, '0')}:${String(event.minutes % 60).padStart(2, '0')}:00+08:00`}><span>16 Oct 2026</span>{event.time}</time><span className="sr-only">Event {index + 1} of {events.length}</span>
      </li>)}</ol></section>
      <aside className="next-card"><span className="activity-icon"><Icon name={completed ? 'history' : 'clock'} /></span><div><h2>{completed ? 'Outcome' : 'What happens next?'}</h2><p>{sharedDemo ? (sharedDemo.escalated ? 'Urgent support review is pending.' : sharedDemo.stage === 'matching' ? 'Matching will offer the next eligible available responder. No new journey has started.' : sharedDemo.stage === 'completed' ? 'The visit report is submitted. The recorded demo outcome is available in this timeline.' : 'Updates will appear after the responder confirms each milestone.') : nextMessage(scenario)}</p></div></aside>
      <p className="mock-note">Demonstration data · No live monitoring or dispatch</p>
    </>}
  </>;
}
function LiveIncidentDetails({ incident }: { incident: LiveIncident }) {
  const incidentType = incident.event_type === 'possible_fall'
    ? 'Possible Fall Detected'
    : 'Activity Anomaly Detected';
  const milestones = [
    { key: 'detected', title: incidentType, description: `${incidentType} and recorded by the backend.`, timestamp: incident.timestamp, icon: 'alert' as const },
    ...(incident.response_timestamp ? [{ key: 'response', title: incident.resident_response === 'resident_okay' ? 'Resident confirmed okay' : incident.resident_response === 'resident_needs_help' ? 'Resident requested help' : 'No resident response', description: incident.resident_response === 'resident_okay' ? 'Puan Aisha confirmed she is okay.' : incident.resident_response === 'resident_needs_help' ? 'Puan Aisha requested help.' : 'The resident check-in timed out.', timestamp: incident.response_timestamp, icon: 'message' as const }] : []),
    ...(incident.responder_request_timestamp ? [{ key: 'requested', title: 'Responder requested', description: 'A responder request was recorded. Responder request recorded.', timestamp: incident.responder_request_timestamp, icon: 'people' as const }] : []),
    ...(incident.resolution_timestamp ? [{ key: 'resolved', title: 'Incident resolved', description: 'Resolution was recorded by the backend.', timestamp: incident.resolution_timestamp, icon: 'check' as const }] : []),
  ];
  return <><ResidentCard scenario="normal" detail liveIncident={incident} />
    <section className="detail-section"><h2>Incident Summary</h2><div className="white-card"><dl className="summary-grid"><dt>Incident ID</dt><dd>{incident.event_id}</dd><dt>Incident Type</dt><dd>{incidentType}</dd><dt>Status</dt><dd>{incidentLabel(incident)}</dd><dt>Date & Time</dt><dd><time dateTime={incident.timestamp}>{displayDate(incident.timestamp)}, {displayTime(incident.timestamp)}</time></dd><dt>Location</dt><dd>{incident.location.replace(/_/g, ' ')}</dd><dt>Responder status</dt><dd>{incident.responder_status === 'requested' ? 'Requested' : incident.responder_status.replace(/_/g, ' ')}</dd><dt>Simulation</dt><dd>{incident.simulation ? 'Yes' : 'No'}</dd></dl></div></section>
    {incident.responder_name && <section className="detail-section"><h2>Responder Details</h2><div className="white-card"><h3>{incident.responder_name}</h3><p>{incident.responder_status.replace(/_/g, ' ')}</p></div></section>}
    {incident.visit_report && <section className="detail-section"><h2>Visit Report</h2><div className="white-card"><p>Resident condition: {incident.visit_report.resident_condition.replace(/_/g, ' ')}</p><p>{incident.visit_report.summary}</p><p>{incident.visit_report.action_taken}</p><p>{incident.status === 'resolved' ? 'Incident resolved' : 'Further assistance required'}</p></div></section>}
    <section className="detail-section"><h2>Response Timeline</h2><ol className="timeline white-card">{milestones.map((event, index) => <li key={event.key} className={event.key === 'resolved' ? 'tone-green' : 'tone-orange'}><span className="timeline-icon"><Icon name={event.icon} /></span><div className="timeline-copy"><h3>{event.title}</h3><p>{event.description}</p></div><time dateTime={event.timestamp}><span>{displayDate(event.timestamp)}</span>{displayTime(event.timestamp)}</time><span className="sr-only">Event {index + 1} of {milestones.length}</span></li>)}</ol></section>
    <aside className="next-card"><span className="activity-icon"><Icon name={incident.status === 'resolved' ? 'check' : 'clock'} /></span><div><h2>Current status</h2><p>{incidentDescription(incident)}{incident.responder_status === 'requested' ? ' A responder has been requested.' : ''}</p></div></aside>
    <p className="mock-note">Live backend data · Updated every 3 seconds</p>
  </>;
}
function nextMessage(scenario: Scenario) {
  switch (scenario) {
    case 'fall': return 'We’re waiting for Puan Aisha’s response. In this demonstration, assistance is requested after 15 minutes without a response.';
    case 'unusual': return 'We’re checking on Puan Aisha’s wellbeing. Updates will appear here as the demonstration progresses.';
    case 'requested': return 'A responder will be assigned. You will see an update when a responder is on the way.';
    case 'assigned': return 'A responder has been appointed. You will be notified when they begin travelling.';
    case 'on-way': return 'Daniel Lim is on the way to Puan Aisha’s home. You will be notified when he arrives.';
    case 'arrived': return 'Daniel Lim will complete an in-person check on Puan Aisha.';
    case 'checked': return 'Puan Aisha is safe and well. The responder is preparing the visit summary.';
    case 'completed': return 'Puan Aisha is safe and well. No further action is required at this time.';
    default: return '';
  }
}
