import { FALL_ID, UNUSUAL_ID, getIncidentEvents, getScenario, type Activity, type Scenario } from './mockData.ts';
import type { IconName } from '../components/Icon';

export const safetyAlertFilters = ['All', 'Falls', 'Activity Anomaly'] as const;
export type SafetyAlertFilter = typeof safetyAlertFilters[number];
export interface SafetyAlert extends Activity { statusIcon: IconName; resolved: boolean }

// Detection events identify incidents; later response events update their status.
// Home and History continue to use the complete activity stream unchanged.
export function getSafetyAlerts(scenario: Scenario, filter: SafetyAlertFilter = 'All'): SafetyAlert[] {
  const state = getScenario(scenario);
  return getIncidentEvents(scenario)
    .filter(event => event.id === 'fall-detected' || event.id === 'unusual-detected')
    .filter(event => filter === 'All' || event.incidentId === (filter === 'Falls' ? FALL_ID : UNUSUAL_ID))
    .map(event => ({
      ...event,
      id: event.incidentId!,
      description: scenario === 'unusual' ? event.description : state.description,
      tone: state.tone,
      status: scenario === 'fall' ? 'Awaiting response' : scenario === 'unusual' ? 'Checking on Puan Aisha' : state.label,
      statusIcon: scenario === 'fall' || scenario === 'unusual' ? 'clock' : state.icon,
      resolved: scenario === 'completed',
    }));
}
