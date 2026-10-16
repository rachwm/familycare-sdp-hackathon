import { useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Icon } from '../components/Icon';
import { PageHeading } from '../components/PageHeading';
import { ResidentCard } from '../components/ResidentCard';
import { DEMO_DATE, FALL_ID, UNUSUAL_ID, getIncidentEvents, getScenario, type Scenario } from '../data/mockData';

export function IncidentPage({ scenario }: { scenario: Scenario }) {
  const { incidentId } = useParams();
  const events = getIncidentEvents(scenario);
  const availableId = scenario === 'unusual' ? UNUSUAL_ID : FALL_ID;
  const available = events.length > 0 && incidentId === availableId;
  const state = getScenario(scenario);
  const completed = scenario === 'completed';
  const isVisit = ['arrived', 'checked', 'completed'].includes(scenario);
  return <>
    <BackButton />
    <PageHeading title={completed ? 'Visit Summary' : isVisit ? 'Visit Details' : 'Incident Details'} subtitle={completed ? 'Details of the response and visit.' : 'Full details and updates on this incident.'} />
    {!available ? <div className="empty-state"><h2>No incident in this scenario</h2><p>This incident has not occurred in the selected demonstration. Choose an incident scenario using the development controls, or go back.</p></div> : <>
      <ResidentCard scenario={scenario} detail />
      <section className="detail-section"><h2>{isVisit ? 'Visit Details' : 'Incident Summary'}</h2><div className="white-card"><dl className="summary-grid"><dt>Incident Type</dt><dd>{scenario === 'unusual' ? 'Unusual Activity Detected' : 'Possible Fall Detected'}</dd><dt>Date & Time</dt><dd>{DEMO_DATE}, {scenario === 'unusual' ? '2:18 PM' : '10:32 AM'}</dd><dt>Location</dt><dd>Puan Aisha’s home</dd></dl></div></section>
      {state.stage >= 3 && scenario !== 'unusual' && <section className="detail-section"><h2>Responder Details</h2><div className="responder-card white-card"><span className="initial-avatar">DL</span><div><h3>Daniel Lim</h3><p>Home Companion · Demo responder</p><p>{completed ? 'Completed visit at 11:20 AM' : state.stage >= 5 ? 'Arrived at 10:58 AM' : state.stage >= 4 ? 'On the way since 10:50 AM' : 'Assigned at 10:47 AM'}</p></div></div></section>}
      <section className="detail-section"><h2>Response Timeline</h2><ol className="timeline white-card">{events.map((event, index) => <li key={event.id} className={`tone-${event.tone}`} data-event={event.id}>
        <span className="timeline-icon"><Icon name={event.icon} /></span><div className="timeline-copy"><h3>{event.title}</h3><p>{event.description}</p></div><time dateTime={`2026-10-16T${String(Math.floor(event.minutes / 60)).padStart(2, '0')}:${String(event.minutes % 60).padStart(2, '0')}:00+08:00`}><span>16 Oct 2026</span>{event.time}</time><span className="sr-only">Event {index + 1} of {events.length}</span>
      </li>)}</ol></section>
      <aside className="next-card"><span className="activity-icon"><Icon name={completed ? 'history' : 'clock'} /></span><div><h2>{completed ? 'Outcome' : 'What happens next?'}</h2><p>{nextMessage(scenario)}</p></div></aside>
      <p className="mock-note">Demonstration data · No live monitoring or dispatch</p>
    </>}
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
