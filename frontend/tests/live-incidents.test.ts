import test from 'node:test';
import assert from 'node:assert/strict';
import { familyIncidents, fetchLiveIncidents, incidentDescription, incidentLabel, toLiveActivity, type LiveIncident } from '../src/data/liveIncidents.ts';

const base: LiveIncident = {
  event_id: 'fall-real-001', event_type: 'possible_fall', resident_id: 'resident-01',
  location: 'living_room', status: 'awaiting_resident_response', severity: 'warning',
  timestamp: '2026-10-17T10:32:00+08:00', resident_response: null,
  response_timestamp: null, requires_responder: false, responder_status: 'not_requested',
  responder_request_timestamp: null, resolution_timestamp: null, simulation: false,
};

test('live fetch uses the contract endpoint and keeps real IDs and timestamps', async () => {
  let requested = '';
  const older = { ...base, event_id: 'fall-older', timestamp: '2026-10-16T10:30:00+08:00' };
  const request = async (input: RequestInfo | URL) => {
    requested = String(input);
    return { ok: true, json: async () => [older, base] } as Response;
  };
  const incidents = await fetchLiveIncidents(undefined, request as typeof fetch);
  assert.equal(requested, '/api/incidents');
  assert.deepEqual(incidents.map(item => item.event_id), ['fall-real-001', 'fall-older']);
  assert.equal(toLiveActivity(incidents[0]).incidentId, 'fall-real-001');
  assert.equal(toLiveActivity(incidents[0]).time, '10:32 AM');
});

test('live statuses describe backend state without invented assignment', () => {
  assert.equal(incidentLabel(base), 'Awaiting resident response');
  const escalated = { ...base, status: 'no_response' as const, responder_status: 'requested' as const };
  assert.equal(incidentLabel(escalated), 'No response');
  assert.match(incidentDescription(escalated), /did not respond/);
  assert.doesNotMatch(incidentDescription(escalated), /assigned|arrived/i);
});

test('bad live response is rejected instead of becoming demo data', async () => {
  const request = async () => ({ ok: true, json: async () => [{ event_id: 'x', status: 'assigned' }] }) as Response;
  await assert.rejects(fetchLiveIncidents(undefined, request as typeof fetch), /Unexpected incident response/);
});

test('empty backend list stays empty and does not fall back to demo incidents', async () => {
  const request = async () => ({ ok: true, json: async () => [] }) as Response;
  assert.deepEqual(await fetchLiveIncidents(undefined, request as typeof fetch), []);
});

test('Family Dashboard only displays the linked resident’s incidents', () => {
  assert.deepEqual(familyIncidents([{ ...base, resident_id: 'resident-02' }, base]), [base]);
});

test('activity anomalies remain distinct from falls in live activity', async () => {
  const anomaly: LiveIncident = {
    ...base,
    event_id: 'routine-001',
    event_type: 'unusual_activity',
    anomaly_kind: 'inactivity',
    simulation: true,
  };
  const request = async () => ({ ok: true, json: async () => [anomaly] }) as Response;
  const [saved] = await fetchLiveIncidents(undefined, request as typeof fetch);
  assert.equal(saved.event_type, 'unusual_activity');
  assert.equal(toLiveActivity(saved).title, 'Activity anomaly detected');
});
