import { useSearchParams } from 'react-router-dom';
import { ActivityCard } from '../components/ActivityCard';
import { Filters } from '../components/Filters';
import { PageHeading } from '../components/PageHeading';
import { Icon } from '../components/Icon';
import type { Scenario } from '../data/mockData';
import { getSafetyAlerts, safetyAlertFilters, type SafetyAlertFilter } from '../data/safetyAlerts';
export function AlertsPage({ scenario }: { scenario: Scenario }) {
  const [params, setParams] = useSearchParams();
  const filter = safetyAlertFilters.find(value => value === params.get('filter')) ?? 'All';
  const setFilter = (value: SafetyAlertFilter) => setParams(value === 'All' ? {} : { filter: value }, { replace: true });
  const alerts = getSafetyAlerts(scenario);
  const filtered = getSafetyAlerts(scenario, filter);
  const groups = [
    { title: 'Active alerts', alerts: filtered.filter(alert => !alert.resolved) },
    { title: 'Resolved alerts', alerts: filtered.filter(alert => alert.resolved) },
  ];
  return <>
    <PageHeading title="Alerts" subtitle="Stay informed about important updates for your loved ones." />
    <Filters options={safetyAlertFilters} selected={filter} onSelect={setFilter} label="Filter alerts" />
    <div className="activity-list alerts-list" aria-live="polite">
      {filtered.length > 0 && alerts.every(alert => alert.resolved) && <p className="alerts-clear"><Icon name="check" />No active safety alerts</p>}
      {groups.map(group => group.alerts.length > 0 && <section className="alerts-group" key={group.title} aria-label={group.title}>
        <h2>{group.title}</h2>
        <div className="activity-list">{group.alerts.map(activity => <ActivityCard key={activity.id} activity={activity} statusIcon={activity.statusIcon} timeLabel="Detected" expanded />)}</div>
      </section>)}
      {!filtered.length && <div className="empty-state">
        <h2>{alerts.length ? `No ${filter === 'Falls' ? 'fall' : 'unusual activity'} alerts` : 'No safety alerts'}</h2>
        <p>{alerts.length ? 'No safety incidents match this filter.' : "Everything looks good at Puan Aisha's home. You'll be notified if FamilyCare detects something unusual."}</p>
      </div>}
    </div>
  </>;
}
