import { familyActivities, familyConfig, useFamilyDemo } from '../coordinator/familyBridge';
import { Link } from 'react-router-dom';
import { ActivityCard } from '../components/ActivityCard';
import { Icon } from '../components/Icon';
import { ResidentCard } from '../components/ResidentCard';
import { LiveNotice } from '../components/LiveNotice';
import { useLive } from '../data/liveContext';
import { displayDate, toLiveActivity } from '../data/liveIncidents';
import { type Scenario } from '../data/mockData';
export function HomePage({ scenario }: { scenario: Scenario }) {
  const demo = useFamilyDemo();
  const live = useLive();
  const state = familyConfig(scenario, demo);
  // The reference shows the latest incident followed by the morning updates.
  const activities = live.mode === 'live' ? live.incidents.map(toLiveActivity) : familyActivities(scenario, demo).filter(activity => activity.id !== 'resident-check-in' && activity.id !== 'unusual-check-in');
  return <>
    <section className="greeting"><p>Good morning,</p><h1>Nur Aisha</h1><span>Stay connected with your loved ones.</span></section>
    {live.mode === 'demo' && <p className="sr-only" role="status">{state.status}. {state.description}</p>}
    <ResidentCard scenario={scenario} />
    {live.mode === 'live' && <LiveNotice empty={!live.incidents.length && !live.loading && !live.error} />}
    <section className="recent-activity" aria-labelledby="activity-heading">
      <div className="section-heading"><h2 id="activity-heading">Recent Activity</h2><Link className="text-link" to="/history">See All<Icon name="chevron" /></Link></div>
      <div className="activity-list">{activities.slice(0, live.mode === 'live' ? 3 : scenario === 'completed' ? 5 : 3).map(activity => <ActivityCard key={activity.id} activity={activity} showDay={live.mode !== 'live'} timeLabel={live.mode === 'live' ? displayDate(live.incidents.find(item => item.event_id === activity.id)!.timestamp) : undefined} />)}</div>
    </section>
  </>;
}
