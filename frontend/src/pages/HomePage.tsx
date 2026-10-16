import { Link } from 'react-router-dom';
import { ActivityCard } from '../components/ActivityCard';
import { Icon } from '../components/Icon';
import { ResidentCard } from '../components/ResidentCard';
import { getScenario, getTodayActivities, type Scenario } from '../data/mockData';
export function HomePage({ scenario }: { scenario: Scenario }) {
  const state = getScenario(scenario);
  // The reference shows the latest incident followed by the morning updates.
  const activities = getTodayActivities(scenario).filter(activity => activity.id !== 'resident-check-in' && activity.id !== 'unusual-check-in');
  return <>
    <section className="greeting"><p>Good morning,</p><h1>Nur Aisha</h1><span>Stay connected with your loved ones.</span></section>
    <p className="sr-only" role="status">{state.status}. {state.description}</p>
    <ResidentCard scenario={scenario} />
    <section className="recent-activity" aria-labelledby="activity-heading">
      <div className="section-heading"><h2 id="activity-heading">Recent Activity</h2><Link className="text-link" to="/history">See All<Icon name="chevron" /></Link></div>
      <div className="activity-list">{activities.slice(0, scenario === 'completed' ? 5 : 3).map(activity => <ActivityCard key={activity.id} activity={activity} />)}</div>
    </section>
  </>;
}
