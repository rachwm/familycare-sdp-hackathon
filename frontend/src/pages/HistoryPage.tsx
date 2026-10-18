import { familyActivities, useFamilyDemo } from '../coordinator/familyBridge';
import { useSearchParams } from 'react-router-dom';
import { ActivityCard } from '../components/ActivityCard';
import { Filters } from '../components/Filters';
import { PageHeading } from '../components/PageHeading';
import { yesterdayActivities, type Activity, type Scenario } from '../data/mockData';
import { useLive } from '../data/liveContext';
import { displayDate, toLiveActivity } from '../data/liveIncidents';
import { LiveNotice } from '../components/LiveNotice';
const filters = ['All', 'Check-ins', 'Medication'] as const;
export function HistoryPage({ scenario }: { scenario: Scenario }) {
  const demo = useFamilyDemo();
  const live = useLive();
  const [params, setParams] = useSearchParams();
  const filter = filters.find(value => value === params.get('filter')) ?? 'All';
  const setFilter = (value: typeof filters[number]) => setParams(value === 'All' ? {} : { filter: value }, { replace: true });
  const matches = (activity: Activity) => filter === 'All' || (filter === 'Check-ins' && activity.category === 'check-in') || (filter === 'Medication' && activity.category === 'medication');
  const groups = [
    { label: 'Today, 16 Oct 2026', activities: familyActivities(scenario, demo).filter(matches) },
    { label: 'Yesterday, 15 Oct 2026', activities: yesterdayActivities.filter(matches) },
  ];
  if (live.mode === 'live') {
    const byDate = new Map<string, typeof live.incidents>();
    if (filter === 'All') for (const incident of live.incidents) {
      const date = displayDate(incident.timestamp);
      byDate.set(date, [...(byDate.get(date) ?? []), incident]);
    }
    return <><PageHeading title="History" subtitle="View past activities and updates for your loved one." />
      <Filters options={filters} selected={filter} onSelect={setFilter} label="Filter history" />
      <div aria-live="polite"><LiveNotice empty={!live.incidents.length && !live.loading && !live.error} />
        {[...byDate].map(([date, incidents]) => <section className="history-group" key={date}><h2>{date}</h2><div className="activity-list">{incidents.map(incident => <ActivityCard key={incident.event_id} activity={toLiveActivity(incident)} expanded showDay={false} />)}</div></section>)}
        {!byDate.size && live.incidents.length > 0 && <div className="empty-state"><h2>No recorded activities</h2><p>No live activities match this filter.</p></div>}
      </div></>;
  }
  return <>
    <PageHeading title="History" subtitle="View past activities and updates for your loved one." />
    <Filters options={filters} selected={filter} onSelect={setFilter} label="Filter history" />
    <div aria-live="polite">{groups.map(group => group.activities.length > 0 && <section className="history-group" key={group.label}>
      <h2>{group.label}</h2><div className="activity-list">{group.activities.map(activity => <ActivityCard key={activity.id} activity={activity} expanded showDay={false} />)}</div>
    </section>)}
    {!groups.some(group => group.activities.length) && <div className="empty-state"><h2>No recorded activities</h2><p>No activities match this filter.</p></div>}</div>
  </>;
}
