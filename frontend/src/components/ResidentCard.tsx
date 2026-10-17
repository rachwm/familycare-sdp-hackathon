import { familyConfig, useFamilyDemo } from '../coordinator/familyBridge';
import { Link } from 'react-router-dom';
import { incidentPath, type Scenario } from '../data/mockData';
import { useLive } from '../data/liveContext';
import { displayDate, displayTime, incidentDescription, incidentLabel, incidentTone, type LiveIncident } from '../data/liveIncidents';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
export function ResidentCard({ scenario, detail = false, liveIncident }: { scenario: Scenario; detail?: boolean; liveIncident?: LiveIncident }) {
  const live = useLive();
  const familyDemo = useFamilyDemo();
  if (live.mode === 'live') {
    const incident = liveIncident ?? live.incidents.find(item => item.status !== 'resolved') ?? live.incidents[0];
    const tone = incident ? incidentTone(incident) : live.error ? 'orange' : 'green';
    return <section className={`resident-card tone-${tone}${!incident ? ' resident-card--normal' : ''}`} aria-label="Linked resident status">
      <div className="resident-summary"><Avatar /><div className="resident-copy"><h2>Puan Aisha</h2>
        <span className={`status-pill tone-${tone}`}><span className="status-symbol"><Icon name={incident ? incident.status === 'resolved' ? 'check' : 'alert' : live.error ? 'alert' : 'check'} /></span>{incident ? incidentLabel(incident) : live.error ? 'Connection unavailable' : live.loading ? 'Checking incidents' : 'No incidents'}</span>
        <p>{incident ? `${incidentDescription(incident)}${incident.simulation ? ' Backend simulation.' : ''}` : live.error ? 'Unable to reach the backend.' : live.loading ? 'Checking for incidents…' : 'No fall incidents recorded.'}</p>
        {incident && <span className="timestamp"><Icon name="clock" />{displayDate(incident.timestamp)}, {displayTime(incident.timestamp)}</span>}
      </div></div>
      {incident && !detail && <Link className="incident-button" to={`/incidents/${encodeURIComponent(incident.event_id)}`}>View Incident Details<Icon name="arrow" /></Link>}
    </section>;
  }
  const state = familyConfig(scenario, familyDemo);
  const normal = scenario === 'normal';
  const path = normal ? '/resident' : incidentPath(scenario);
  const content = <>
    <Avatar /><div className="resident-copy"><h2>Puan Aisha</h2>
      <span className={`status-pill tone-${state.tone}`}><span className="status-symbol"><Icon name={state.icon} /></span>{state.status}</span>
      <p>{state.description}</p><span className="timestamp"><Icon name="clock" />{normal ? state.time : `Today, ${state.time}`}</span>
    </div>
  </>;
  return <section className={`resident-card tone-${state.tone}${normal ? ' resident-card--normal' : ''}`} aria-label="Linked resident status">
    <div className="resident-summary">{content}</div>
    {!normal && !detail && <Link className="incident-button" to={path}>{scenario === 'completed' ? 'View Visit Summary' : 'View Incident Details'}<Icon name="arrow" /></Link>}
    {scenario === 'unusual' && detail && <div className="resident-note"><Icon name="home" /><span><strong>No movement detected</strong><br />for 4 hours.</span></div>}
  </section>;
}
