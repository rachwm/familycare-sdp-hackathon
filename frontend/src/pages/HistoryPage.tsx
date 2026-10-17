import { useSearchParams } from 'react-router-dom';
import { ActivityCard } from '../components/ActivityCard';
import { Filters } from '../components/Filters';
import { PageHeading } from '../components/PageHeading';
import { getTodayActivities, yesterdayActivities, type Activity, type Scenario } from '../data/mockData';
const filters = ['All', 'Check-ins', 'Medication'] as const;
export function HistoryPage({ scenario }: { scenario: Scenario }) {
  const [params, setParams] = useSearchParams();
  const filter = filters.find(value => value === params.get('filter')) ?? 'All';
  const setFilter = (value: typeof filters[number]) => setParams(value === 'All' ? {} : { filter: value }, { replace: true });
  const matches = (activity: Activity) => filter === 'All' || (filter === 'Check-ins' && activity.category === 'check-in') || (filter === 'Medication' && activity.category === 'medication');
  const groups = [
    { label: 'Today, 16 Oct 2026', activities: getTodayActivities(scenario).filter(matches) },
    { label: 'Yesterday, 15 Oct 2026', activities: yesterdayActivities.filter(matches) },
  ];
  return <>
    <PageHeading title="History" subtitle="View past activities and updates for your loved one." />
    <Filters options={filters} selected={filter} onSelect={setFilter} label="Filter history" />
    <div aria-live="polite">{groups.map(group => group.activities.length > 0 && <section className="history-group" key={group.label}>
      <h2>{group.label}</h2><div className="activity-list">{group.activities.map(activity => <ActivityCard key={activity.id} activity={activity} expanded showDay={false} />)}</div>
    </section>)}
    {!groups.some(group => group.activities.length) && <div className="empty-state"><h2>No recorded activities</h2><p>No activities match this filter.</p></div>}</div>
  </>;
}
