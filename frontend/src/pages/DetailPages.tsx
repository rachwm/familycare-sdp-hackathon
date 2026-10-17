import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BackButton } from '../components/BackButton';
import { Icon } from '../components/Icon';
import { PageHeading } from '../components/PageHeading';
import { ResidentCard } from '../components/ResidentCard';
import { getScenario, getTodayActivities, incidentPath, yesterdayActivities, type Scenario } from '../data/mockData';
import { useLive } from '../data/liveContext';
import { incidentLabel } from '../data/liveIncidents';

export function ActivityPage({ scenario }: { scenario: Scenario }) {
  const { activityId } = useParams();
  const activity = [...getTodayActivities(scenario), ...yesterdayActivities].find(item => item.id === activityId);
  return <><BackButton /><PageHeading title="Activity Details" subtitle="Recorded updates for your loved one." />
    {activity ? <><div className={`activity-detail white-card tone-${activity.tone}`}><span className="activity-icon"><Icon name={activity.icon} /></span><h2>{activity.title}</h2><p>{activity.description}</p><span className="small-status"><Icon name="check" />{activity.status ?? 'Recorded'}</span></div><section className="detail-section"><h2>Activity Summary</h2><dl className="white-card summary-grid"><dt>Resident</dt><dd>Puan Aisha</dd><dt>Date</dt><dd>{activity.date === 'today' ? '16 October 2026' : '15 October 2026'}</dd><dt>Time</dt><dd>{activity.time}</dd><dt>Source</dt><dd>Home Companion · Demo data</dd></dl></section><Link className="outline-link" to="/resident">View linked resident<Icon name="chevron" /></Link></> : <div className="empty-state"><h2>Activity unavailable</h2><p>This activity is not recorded in the selected demonstration state.</p></div>}
  </>;
}
export function ResidentPage({ scenario }: { scenario: Scenario }) {
  const state = getScenario(scenario);
  const live = useLive();
  const incident = live.incidents.find(item => item.status !== 'resolved') ?? live.incidents[0];
  return <><BackButton /><PageHeading title="Linked Resident" subtitle="Stay connected with your loved one." /><ResidentCard scenario={scenario} detail />
    <section className="detail-section"><h2>Connection Details</h2><dl className="white-card summary-grid"><dt>Resident</dt><dd>Puan Aisha</dd><dt>Family member</dt><dd>Sarah · Daughter</dd>{live.mode === 'demo' && <><dt>Connection</dt><dd className="connected">Connected</dd><dt>Home Companion</dt><dd>Monitoring active</dd></>}<dt>Current status</dt><dd>{live.mode === 'live' ? incident ? incidentLabel(incident) : live.error ? 'Backend unavailable' : 'No incidents recorded' : state.status}</dd></dl></section>
    {live.mode === 'live' ? incident && <Link className="outline-link" to={`/incidents/${encodeURIComponent(incident.event_id)}`}>View incident details<Icon name="arrow" /></Link> : scenario !== 'normal' && <Link className="outline-link" to={incidentPath(scenario)}>View {scenario === 'completed' ? 'visit summary' : 'incident details'}<Icon name="arrow" /></Link>}
    <p className="mock-note">{live.mode === 'live' ? 'Incident status is provided by the backend.' : 'Only approved demonstration details are shown.'}</p>
  </>;
}
const settings = {
  personal: { title: 'Personal Information', subtitle: 'Your FamilyCare account details.' },
  contacts: { title: 'Emergency Contacts', subtitle: 'People connected to your care.' },
  privacy: { title: 'Privacy & Security', subtitle: 'How this demonstration handles your data.' },
  support: { title: 'Help & Support', subtitle: 'Using your FamilyCare dashboard.' },
};
export function SettingsPage() {
  const live = useLive();
  const { section } = useParams();
  const key = section as keyof typeof settings;
  const setting = settings[key];
  if (!setting) return <NotFoundPage />;
  return <><BackButton /><PageHeading title={setting.title} subtitle={setting.subtitle} /><div className="white-card settings-detail">
    {key === 'personal' && <><div className="profile-card"><Avatar person="account" /><div><h2>Sarah</h2><p>Daughter · Family Member</p></div></div><dl className="summary-grid"><dt>Account holder</dt><dd>Sarah</dd><dt>Linked resident</dt><dd>Puan Aisha</dd></dl><p>No email, phone number or address has been provided. Account editing will be available after authentication is integrated.</p></>}
    {key === 'contacts' && <><Icon name="people" /><h2>No emergency contacts configured</h2><p>Contact details have not been provided for this demonstration. This page does not place calls or dispatch assistance.</p><Link className="text-link" to="/resident">View linked resident<Icon name="chevron" /></Link></>}
    {key === 'privacy' && <><Icon name="shield" /><h2>Demonstration only</h2><p>Demo Mode uses local fixtures. Your selected scenario and data mode are stored in this browser tab’s session storage.</p><p>Live Mode reads incident updates from the FamilyCare backend. No personal contact details or medical diagnosis are collected by this frontend.</p></>}
    {key === 'support' && <><Icon name="help" /><h2>Find your way around</h2><p>Use Home for current status, Alerts for updates, History for dated records and Profile for your connected care.</p><p>Tap an activity or View Incident Details to open its full page. Use Back to return to where you came from.</p><p>In development, scroll below the page to Demo scenarios. Select a state to explore the response timeline. Every event uses 16 October 2026.</p></>}
  </div></>;
}
export function NotFoundPage() {
  return <><BackButton /><PageHeading title="Page not found" subtitle="This page is not part of the FamilyCare demonstration." /><Link className="outline-link" to="/">Return to Home<Icon name="arrow" /></Link></>;
}
