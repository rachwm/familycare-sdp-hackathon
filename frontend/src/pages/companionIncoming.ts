/** Select actionable resident safety incidents without relying on family dashboard demo state. */
export const COMPANION_RESIDENT_ID = 'resident-01';

interface PendingCompanionIncident {
  event_id: string;
  event_type: 'possible_fall' | 'unusual_activity';
  resident_id: string;
  status: 'awaiting_resident_response';
  timestamp: string;
}

function isPendingCompanionIncident(value: unknown): value is PendingCompanionIncident {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.event_id === 'string' && item.event_id.length > 0
    && item.resident_id === COMPANION_RESIDENT_ID
    && item.status === 'awaiting_resident_response'
    && (item.event_type === 'possible_fall' || item.event_type === 'unusual_activity')
    && typeof item.timestamp === 'string'
    && Number.isFinite(Date.parse(item.timestamp));
}

/** Read the newest outstanding safety check-in from the backend incident list. */
export function latestPendingCompanionIncidentId(incidents: unknown): string | null {
  if (!Array.isArray(incidents)) return null;
  const latest = incidents.filter(isPendingCompanionIncident)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
  return latest?.event_id ?? null;
}

/** WebSocket payloads use { type: "INCIDENT_CREATED", data: incident }. */
export function incomingCompanionIncidentId(event: { type: string; data: unknown }): string | null {
  return event.type === 'INCIDENT_CREATED' && isPendingCompanionIncident(event.data)
    ? event.data.event_id
    : null;
}
