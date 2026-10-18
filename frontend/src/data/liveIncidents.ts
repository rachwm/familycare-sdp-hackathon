import type { Activity, Tone } from './mockData';

export type IncidentStatus = 'awaiting_resident_response' | 'resident_needs_help' | 'no_response' | 'resolved';
export const FAMILY_RESIDENT_ID = 'resident-01';
export interface LiveIncident {
  event_id: string;
  event_type: 'possible_fall';
  resident_id: string;
  location: string;
  status: IncidentStatus;
  severity: 'warning' | 'critical';
  timestamp: string;
  resident_response: 'resident_okay' | 'resident_needs_help' | 'timeout' | null;
  response_timestamp: string | null;
  requires_responder: boolean;
  responder_status: 'not_requested' | 'requested' | 'resolved';
  responder_request_timestamp: string | null;
  resolution_timestamp: string | null;
  simulation: boolean;
}

const statuses: IncidentStatus[] = ['awaiting_resident_response', 'resident_needs_help', 'no_response', 'resolved'];
const validDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const optionalDate = (value: unknown) => value === null || validDate(value);
export function isLiveIncident(value: unknown): value is LiveIncident {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.event_id === 'string' && item.event_type === 'possible_fall'
    && typeof item.resident_id === 'string' && typeof item.location === 'string'
    && statuses.includes(item.status as IncidentStatus) && validDate(item.timestamp)
    && ['warning', 'critical'].includes(item.severity as string)
    && [null, 'resident_okay', 'resident_needs_help', 'timeout'].includes(item.resident_response as string | null)
    && ['not_requested', 'requested', 'resolved'].includes(item.responder_status as string)
    && optionalDate(item.response_timestamp) && optionalDate(item.responder_request_timestamp)
    && optionalDate(item.resolution_timestamp) && typeof item.simulation === 'boolean';
}

export function incidentLabel(incident: LiveIncident) {
  if (incident.status === 'resolved') return 'Resolved';
  if (incident.status === 'resident_needs_help') return 'Resident needs help';
  if (incident.status === 'no_response') return 'No response';
  return 'Awaiting resident response';
}
export function incidentTone(incident: LiveIncident): Tone {
  return incident.status === 'resolved' ? 'green' : incident.status === 'awaiting_resident_response' ? 'orange' : 'red';
}
export function incidentDescription(incident: LiveIncident) {
  if (incident.status === 'resolved') return incident.resident_response === 'resident_okay'
    ? 'Puan Aisha confirmed she is okay.' : 'The incident has been resolved.';
  if (incident.status === 'resident_needs_help') return 'Puan Aisha requested help.';
  if (incident.status === 'no_response') return 'Puan Aisha did not respond to the check-in.';
  return 'Waiting for Puan Aisha to respond to the check-in.';
}
export function displayDate(timestamp: string) {
  return new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp));
}
export function displayTime(timestamp: string) {
  return new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(timestamp)).replace(/\b(am|pm)\b/gi, value => value.toUpperCase());
}
export function toLiveActivity(incident: LiveIncident): Activity {
  return {
    id: incident.event_id, incidentId: incident.event_id, title: 'Possible fall detected',
    description: `${incidentDescription(incident)}${incident.simulation ? ' Backend simulation.' : ''}`, time: displayTime(incident.timestamp),
    minutes: 0, date: 'today', icon: 'alert', tone: incidentTone(incident),
    category: 'incident', status: incidentLabel(incident),
  };
}
export function sortIncidents(incidents: LiveIncident[]) {
  return [...incidents].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}
export function familyIncidents(incidents: LiveIncident[]) {
  return incidents.filter(incident => incident.resident_id === FAMILY_RESIDENT_ID);
}

export async function fetchLiveIncidents(signal?: AbortSignal, request: typeof fetch = fetch, baseUrl = '') {
  const response = await request(`${baseUrl.replace(/\/$/, '')}/api/incidents`, { signal });
  if (!response.ok) throw new Error(`Incident request failed: ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isLiveIncident)) throw new Error('Unexpected incident response');
  return sortIncidents(data);
}

// Uses the same contract validation as the Family Dashboard list request.
export async function fetchLiveIncident(eventId: string, signal?: AbortSignal, request: typeof fetch = fetch, baseUrl = '') {
  const response = await request(`${baseUrl.replace(/\/$/, '')}/api/incidents/${encodeURIComponent(eventId)}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Incident request failed: ${response.status}`);
  const data: unknown = await response.json();
  if (!isLiveIncident(data) || data.event_id !== eventId) throw new Error('Unexpected incident response');
  return data;
}
