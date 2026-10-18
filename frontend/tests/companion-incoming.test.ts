import assert from 'node:assert/strict';
import { test } from 'node:test';
import { incomingCompanionIncidentId, latestPendingCompanionIncidentId } from '../src/pages/companionIncoming.ts';

const pending = {
  event_id: 'live-anomaly-1',
  event_type: 'unusual_activity',
  resident_id: 'resident-01',
  status: 'awaiting_resident_response',
  timestamp: '2026-10-18T16:00:00+08:00',
};
test('opens a matching new unusual-activity incident from websocket', () => {
  assert.equal(incomingCompanionIncidentId({ type: 'INCIDENT_CREATED', data: pending }), pending.event_id);
  assert.equal(incomingCompanionIncidentId({ type: 'INCIDENT_UPDATED', data: pending }), null);
  assert.equal(incomingCompanionIncidentId({ type: 'INCIDENT_CREATED', data: { ...pending, resident_id: 'another-resident' } }), null);
});
test('fallback chooses latest awaiting check-in and ignores resolved or unrelated incidents', () => {
  assert.equal(latestPendingCompanionIncidentId([
    { ...pending, event_id: 'resolved', status: 'resolved', timestamp: '2026-10-18T18:00:00+08:00' },
    { ...pending, event_id: 'older', timestamp: '2026-10-18T15:00:00+08:00' },
    pending,
    { ...pending, event_id: 'other', resident_id: 'another-resident' },
  ]), pending.event_id);
  assert.equal(latestPendingCompanionIncidentId([]), null);
  assert.equal(latestPendingCompanionIncidentId({ bad: true }), null);
});
