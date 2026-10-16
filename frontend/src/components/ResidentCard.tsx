import { Link } from 'react-router-dom';
import { getScenario, incidentPath, type Scenario } from '../data/mockData';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
export function ResidentCard({ scenario, detail = false }: { scenario: Scenario; detail?: boolean }) {
  const state = getScenario(scenario);
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
