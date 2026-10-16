import { useSearchParams } from 'react-router-dom';
import { ActivityCard } from '../components/ActivityCard';
import { Filters } from '../components/Filters';
import { PageHeading } from '../components/PageHeading';
import { UNUSUAL_ID, getTodayActivities, type Scenario } from '../data/mockData';
const filters = ['All', 'Unusual Activity', 'Updates'] as const;
export function AlertsPage({ scenario }: { scenario: Scenario }) {
  const [params, setParams] = useSearchParams();
  const filter = filters.find(value => value === params.get('filter')) ?? 'All';
  const setFilter = (value: typeof filters[number]) => setParams(value === 'All' ? {} : { filter: value }, { replace: true });
  const alerts = getTodayActivities(scenario).filter(activity => activity.category !== 'monitoring' && !['resident-check-in', 'unusual-check-in'].includes(activity.id));
  const filtered = alerts.filter(activity => filter === 'All' || (filter === 'Unusual Activity' ? activity.incidentId === UNUSUAL_ID : activity.category !== 'incident' || !['fall-detected', 'unusual-detected'].includes(activity.id)));
  return <>
    <PageHeading title="Alerts" subtitle="Stay informed about important updates for your loved ones." />
    <Filters options={filters} selected={filter} onSelect={setFilter} label="Filter alerts" />
    <div className="activity-list alerts-list" aria-live="polite">
      {filtered.map(activity => <ActivityCard key={activity.id} activity={activity} expanded />)}
      {!filtered.length && <div className="empty-state"><h2>No unusual activity alerts</h2><p>There are no unusual activity alerts in this demonstration state.</p></div>}
    </div>
  </>;
}
