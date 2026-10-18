import type { IconName } from '../components/Icon';

export const DEMO_DATE = '16 October 2026';
export const FALL_ID = 'fall-2026-10-16';
export const UNUSUAL_ID = 'unusual-2026-10-16';
export type Tone = 'green' | 'red' | 'orange' | 'blue' | 'muted';
export type Scenario = 'normal' | 'fall' | 'unusual' | 'requested' | 'assigned' | 'on-way' | 'arrived' | 'checked' | 'completed';
export interface Activity {
  id: string;
  title: string;
  description: string;
  time: string;
  minutes: number;
  date: 'today' | 'yesterday';
  icon: IconName;
  tone: Tone;
  category: 'check-in' | 'medication' | 'monitoring' | 'incident';
  incidentId?: string;
  status?: string;
}
export interface ScenarioConfig {
  id: Scenario;
  label: string;
  status: string;
  description: string;
  time: string;
  tone: Tone;
  icon: IconName;
  // The last event that has happened. Never display later events as completed.
  stage: number;
}
export const scenarios: ScenarioConfig[] = [
  { id: 'normal', label: 'Normal monitoring', status: 'Safe', description: 'Everything looks good at Puan Aisha’s home.', time: 'Last updated just now', tone: 'green', icon: 'check', stage: -1 },
  { id: 'fall', label: 'Possible fall detected', status: 'Possible Fall Detected', description: 'Puan Aisha hasn’t responded. We’re still waiting for a response.', time: '10:32 AM', tone: 'red', icon: 'alert', stage: 1 },
  { id: 'unusual', label: 'Unusual activity detected', status: 'Unusual Activity Detected', description: 'Unusual activity was detected at Puan Aisha’s home.', time: '2:18 PM', tone: 'orange', icon: 'home', stage: 1 },
  { id: 'requested', label: 'Assistance requested', status: 'Assistance Requested', description: 'No response after 15 minutes. Assistance has been requested.', time: '10:47 AM', tone: 'orange', icon: 'people', stage: 2 },
  { id: 'assigned', label: 'Responder assigned', status: 'Responder Assigned', description: 'Daniel Lim has been assigned to assist Puan Aisha.', time: '10:48 AM', tone: 'orange', icon: 'profile', stage: 3 },
  { id: 'on-way', label: 'Responder on the way', status: 'Responder on the way', description: 'Daniel Lim is travelling to Puan Aisha’s home.', time: '10:50 AM', tone: 'blue', icon: 'car', stage: 4 },
  { id: 'arrived', label: 'Responder arrived', status: 'Responder arrived', description: 'Daniel Lim has arrived at Puan Aisha’s home.', time: '10:58 AM', tone: 'green', icon: 'home', stage: 5 },
  { id: 'checked', label: 'Resident checked', status: 'Safe and well', description: 'Daniel Lim has checked on Puan Aisha. She is safe and well.', time: '11:03 AM', tone: 'green', icon: 'check', stage: 6 },
  { id: 'completed', label: 'Visit completed', status: 'Safe and well', description: 'Daniel Lim has completed the visit. Puan Aisha is safe.', time: '11:20 AM', tone: 'green', icon: 'check', stage: 7 },
];
export function getScenario(id: Scenario) {
  return scenarios.find(scenario => scenario.id === id)!;
}
export const routineActivities: Activity[] = [
  { id: 'check-in', title: 'Morning check-in completed', description: 'Puan Aisha responded to Home Companion.', time: '9:00 AM', minutes: 540, date: 'today', icon: 'message', tone: 'green', category: 'check-in', status: 'Completed' },
  { id: 'medication', title: 'Medication reminder acknowledged', description: 'Puan Aisha confirmed her medication reminder.', time: '8:30 AM', minutes: 510, date: 'today', icon: 'pill', tone: 'green', category: 'medication', status: 'Completed' },
  { id: 'connected', title: 'Home Companion connected', description: 'Monitoring is active and receiving updates.', time: '8:00 AM', minutes: 480, date: 'today', icon: 'home', tone: 'green', category: 'monitoring', status: 'Connected' },
];
export const yesterdayActivities: Activity[] = [
  { ...routineActivities[0], id: 'yesterday-check-in', title: 'Evening check-in completed', time: '6:00 PM', minutes: 1080, date: 'yesterday' },
  { ...routineActivities[1], id: 'yesterday-medication', date: 'yesterday' },
];
export const fallEvents: Activity[] = [
  { id: 'fall-detected', title: 'Possible fall detected', description: 'Home Companion initiates a check-in.', time: '10:32 AM', minutes: 632, icon: 'alert', tone: 'red' },
  { id: 'resident-check-in', title: 'Resident check-in started', description: 'Puan Aisha has not responded. We’re checking on her wellbeing.', time: '10:32 AM', minutes: 632, icon: 'hourglass', tone: 'muted' },
  { id: 'assistance-requested', title: 'Assistance requested', description: 'No response after 15 minutes. Assistance has been requested.', time: '10:47 AM', minutes: 647, icon: 'people', tone: 'orange' },
  { id: 'responder-assigned', title: 'Responder assigned', description: 'Daniel Lim has been assigned to assist Puan Aisha.', time: '10:48 AM', minutes: 648, icon: 'profile', tone: 'orange' },
  { id: 'responder-on-way', title: 'Responder on the way', description: 'Daniel Lim is travelling to Puan Aisha’s home.', time: '10:50 AM', minutes: 650, icon: 'car', tone: 'blue' },
  { id: 'responder-arrived', title: 'Responder arrived', description: 'Daniel Lim has arrived at Puan Aisha’s home.', time: '10:58 AM', minutes: 658, icon: 'home', tone: 'green' },
  { id: 'resident-checked', title: 'Resident checked', description: 'Daniel Lim confirmed Puan Aisha is safe and well.', time: '11:03 AM', minutes: 663, icon: 'check', tone: 'green' },
  { id: 'visit-completed', title: 'Visit completed', description: 'The visit is complete. No further action is required in this demonstration.', time: '11:20 AM', minutes: 680, icon: 'history', tone: 'green' },
].map(event => ({ ...event, date: 'today', category: 'incident', incidentId: FALL_ID }) as Activity);
export const unusualEvents: Activity[] = [
  { id: 'unusual-detected', title: 'Unusual activity detected', description: 'No movement detected for 4 hours at Puan Aisha’s home.', time: '2:18 PM', minutes: 858, date: 'today', icon: 'home', tone: 'orange', category: 'incident', incidentId: UNUSUAL_ID, status: 'Checking on Puan Aisha' },
  { id: 'unusual-check-in', title: 'Resident check-in started', description: 'We’re checking on Puan Aisha’s wellbeing.', time: '2:18 PM', minutes: 858, date: 'today', icon: 'hourglass', tone: 'muted', category: 'incident', incidentId: UNUSUAL_ID },
];
export function getIncidentEvents(scenario: Scenario): Activity[] {
  if (scenario === 'normal') return [];
  if (scenario === 'unusual') return unusualEvents;
  return fallEvents.slice(0, getScenario(scenario).stage + 1);
}
export function getTodayActivities(scenario: Scenario) {
  // Reverse the events before sorting so equal timestamps retain their actual order.
  return [...getIncidentEvents(scenario)].reverse().concat(routineActivities).sort((a, b) => b.minutes - a.minutes);
}
export function activityPath(activity: Activity) {
  return activity.incidentId ? `/incidents/${activity.incidentId}` : `/activities/${activity.id}`;
}
export function incidentPath(scenario: Scenario) {
  return `/incidents/${scenario === 'unusual' ? UNUSUAL_ID : FALL_ID}`;
}
