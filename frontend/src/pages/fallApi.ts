export type ResidentResponse = 'resident_okay' | 'resident_needs_help' | 'timeout';
export type IncidentStatus = 'awaiting_resident_response' | 'resolved' | 'resident_needs_help' | 'no_response';

export interface FallIncident {
  event_id: string;
  status: IncidentStatus;
  timestamp: string;
  simulation: boolean;
  resident_response: ResidentResponse | null;
  requires_responder: boolean;
}

export class FallApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'FallApiError';
    this.status = status;
  }
}

const baseUrl = (
  import.meta.env?.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000'
).replace(/\/$/, '');

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readIncident(value: unknown): FallIncident {
  const statuses = ['awaiting_resident_response', 'resolved', 'resident_needs_help', 'no_response'];
  const responses = ['resident_okay', 'resident_needs_help', 'timeout'];
  if (!record(value) || typeof value.event_id !== 'string' || !value.event_id ||
      typeof value.status !== 'string' || !statuses.includes(value.status) ||
      typeof value.timestamp !== 'string' || !Number.isFinite(Date.parse(value.timestamp)) ||
      typeof value.simulation !== 'boolean' || typeof value.requires_responder !== 'boolean' ||
      !(value.resident_response === null || (typeof value.resident_response === 'string' && responses.includes(value.resident_response)))) {
    throw new FallApiError('The backend returned an unexpected incident format.');
  }
  return value as unknown as FallIncident;
}

async function request(path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = window.setTimeout(abort, 12_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = record(data) && typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}).`;
      throw new FallApiError(detail, response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof FallApiError) throw error;
    if (signal?.aborted) throw error;
    throw new FallApiError(controller.signal.aborted ? 'The backend took too long to respond.' : 'Could not connect to the backend. Check that it is running.');
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export async function createFallSimulation(): Promise<FallIncident> {
  const data = await request('/api/simulator/fall', { scenario: 'fall', resident_id: 'resident-01', location: 'living_room' });
  if (!record(data) || data.event_created !== true) throw new FallApiError('The backend did not confirm a new fall incident.');
  const event = readIncident(data.event);
  if (!event.simulation || event.status !== 'awaiting_resident_response') throw new FallApiError('The backend did not return an active simulated fall.');
  return event;
}

export async function getFallIncident(eventId: string, signal?: AbortSignal): Promise<FallIncident> {
  return readIncident(await request(`/api/fall-events/${encodeURIComponent(eventId)}`, undefined, signal));
}

export async function submitFallResponse(eventId: string, response: ResidentResponse, signal?: AbortSignal): Promise<FallIncident> {
  // Reconcile first: a previous request may have succeeded even if its reply was lost.
  const current = await getFallIncident(eventId, signal);
  if (current.status !== 'awaiting_resident_response') return current;
  try {
    const data = await request(`/api/fall-events/${encodeURIComponent(eventId)}/response`, { response }, signal);
    if (!record(data) || data.accepted !== true) throw new FallApiError('The backend did not confirm your response.');
    const event = readIncident(data.event);
    if (event.status === 'awaiting_resident_response') throw new FallApiError('Your response has not been confirmed.');
    return event;
  } catch (error) {
    if (signal?.aborted) throw error;
    // A competing response or lost acknowledgement must display the stored result.
    try {
      const saved = await getFallIncident(eventId, signal);
      if (saved.status !== 'awaiting_resident_response') return saved;
    } catch { /* Preserve the original failure so the resident can retry. */ }
    throw error;
  }
}
