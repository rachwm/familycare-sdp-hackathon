import { incidentId, type DemoState } from './demo.ts';
import { getIncidents, getReports, type IncidentRecord } from './records.ts';

export const coordinatorDemoTabs = [
  { label: 'Incidents', to: '/coordinator', icon: 'alert' },
  { label: 'Responder Progress', to: '/coordinator/progress', icon: 'people' },
  { label: 'Visit Reports', to: '/coordinator/reports', icon: 'history' },
] as const;
export function useAdvancedCoordinator(path: string, search: string) {
  return new URLSearchParams(search).get('advanced') === '1'
    || /^\/coordinator\/(responders|residents|settings)(\/|$)/.test(path);
}
export function responderMilestones(state: DemoState) {
  const assignedAt = state.events.map(event => event.id === 'assigned' || event.id.startsWith('assigned-')).lastIndexOf(true);
  const currentEvents = state.responder && assignedAt >= 0 ? state.events.slice(assignedAt) : [];
  return [
    ['assigned', 'Assigned'], ['accepted', 'Accepted'], ['on-way', 'On the Way'], ['arrived', 'Arrived'],
  ].map(([id, label]) => {
    const event = currentEvents.find(event => event.id === id || event.id.startsWith(`${id}-`));
    return { id, label, confirmed: !!event, time: event?.time };
  });
}
export interface CoordinatorDemoReport extends IncidentRecord { condition?: 'safe' | 'needs-assistance'; notes?: string; resolved: boolean }
export function coordinatorDemoReports(state: DemoState): CoordinatorDemoReport[] {
  const reports: CoordinatorDemoReport[] = getReports(state).map(report => ({ ...report, resolved: true }));
  if (!state.visitReport) return reports;
  const incident = getIncidents(state).find(record => record.id === incidentId);
  if (!incident) return reports;
  const report = state.visitReport;
  const updated: CoordinatorDemoReport = {
    ...incident, completion: report.submittedAt, condition: report.condition, notes: report.notes,
    resolved: state.stage === 'completed',
    outcome: report.condition === 'safe' ? 'Daniel Lim recorded the resident as Safe and completed the visit.' : 'Daniel Lim recorded Needs further assistance. The visit report is submitted; the incident remains open for follow-up.',
  };
  return [updated, ...reports.filter(item => item.id !== incidentId)];
}
