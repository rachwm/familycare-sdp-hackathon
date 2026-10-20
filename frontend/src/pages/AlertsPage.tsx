import { familyConfig, useFamilyDemo } from '../coordinator/familyBridge';
import { useSearchParams } from 'react-router-dom';
import { ActivityCard } from '../components/ActivityCard';
import { Filters } from '../components/Filters';
import { PageHeading } from '../components/PageHeading';
import { Icon } from '../components/Icon';
import type { Scenario } from '../data/mockData';
import { getSafetyAlerts, safetyAlertFilters, type SafetyAlertFilter } from '../data/safetyAlerts';
import { useLive } from '../data/liveContext';
import { displayDate, toLiveActivity } from '../data/liveIncidents';
import { LiveNotice } from '../components/LiveNotice';
export function AlertsPage({ scenario }: { scenario: Scenario }) {
  const demo = useFamilyDemo();
  const live = useLive();
  const config = familyConfig(scenario, demo);
  const [params, setParams] = useSearchParams();
  const filter = safetyAlertFilters.find(value => value === params.get('filter')) ?? 'All';
  const setFilter = (value: SafetyAlertFilter) => setParams(value === 'All' ? {} : { filter: value }, { replace: true });
  const adapt = (alert: ReturnType<typeof getSafetyAlerts>[number]) => demo ? {...alert, description: config.description, status: config.status} : alert;
  const alerts = getSafetyAlerts(scenario).map(adapt);
  const filtered = getSafetyAlerts(scenario, filter).map(adapt);
  const groups = [
    { title: 'Active alerts', alerts: filtered.filter(alert => !alert.resolved) },
    { title: 'Resolved alerts', alerts: filtered.filter(alert => alert.resolved) },
  ];
  if (live.mode === 'live') {
    const filteredIncidents = live.incidents.filter(incident =>
      filter === 'All'
      || (filter === 'Falls' && incident.event_type === 'possible_fall')
      || (filter === 'Activity Anomaly' && incident.event_type === 'unusual_activity'));
    const active = filteredIncidents.filter(incident => incident.status !== 'resolved');
    const resolved = filteredIncidents.filter(incident => incident.status === 'resolved');
    return <><PageHeading title="Alerts" subtitle="Stay informed about important updates for your loved ones." />
      <Filters options={safetyAlertFilters} selected={filter} onSelect={setFilter} label="Filter alerts" />
      <div className="activity-list alerts-list" aria-live="polite"><LiveNotice empty={!live.incidents.length && !live.loading && !live.error} />
        {filteredIncidents.length > 0 && !active.length && <p className="alerts-clear"><Icon name="check" />No active safety alerts</p>}
        {[{ title: 'Active alerts', items: active }, { title: 'Resolved alerts', items: resolved }].map(group => group.items.length > 0 && <section className="alerts-group" key={group.title} aria-label={group.title}><h2>{group.title}</h2><div className="activity-list">{group.items.map(incident => <ActivityCard key={incident.event_id} activity={toLiveActivity(incident)} statusIcon={incident.status === 'resolved' ? 'check' : 'clock'} timeLabel={displayDate(incident.timestamp)} showDay={false} expanded />)}</div></section>)}
        {!filteredIncidents.length && live.incidents.length > 0 && <div className="empty-state"><h2>No matching safety alerts</h2><p>No live incidents match this filter.</p></div>}
      </div></>;
  }
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
        <h2>{alerts.length ? `No ${filter === 'Falls' ? 'fall' : 'activity anomaly'} alerts` : 'No safety alerts'}</h2>
        <p>{alerts.length ? 'No safety incidents match this filter.' : "Everything looks good at Puan Aisha's home. You'll be notified if FamilyCare detects something unusual."}</p>
      </div>}
    </div>
  </>;
}
