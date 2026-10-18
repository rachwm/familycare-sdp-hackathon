import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createFallSimulation, getFallIncident, submitFallResponse } from '../src/pages/fallApi.ts';

// These tests mock HTTP only; no incident is created on a real backend.
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
afterEach(() => { globalThis.fetch = originalFetch; });
process.once('exit', () => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

const pending = {
  event_id: 'fall-test', status: 'awaiting_resident_response',
  timestamp: '2026-10-18T08:00:00+08:00', simulation: true,
  resident_response: null, requires_responder: false,
};
const okay = { ...pending, status: 'resolved', resident_response: 'resident_okay' };
const help = { ...pending, status: 'resident_needs_help', resident_response: 'resident_needs_help', requires_responder: true };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('fall simulator sends the agreed payload and uses the returned event ID', async () => {
  globalThis.fetch = async (input, options) => {
    assert.equal(new URL(String(input)).pathname, '/api/simulator/fall');
    assert.equal(options?.method, 'POST');
    assert.deepEqual(JSON.parse(String(options?.body)), { scenario: 'fall', resident_id: 'resident-01', location: 'living_room' });
    return json({ event_created: true, event: pending });
  };
  assert.equal((await createFallSimulation()).event_id, 'fall-test');
});

test('unconfirmed incident creation is rejected', async () => {
  globalThis.fetch = async () => json({ event_created: false, event: null });
  await assert.rejects(createFallSimulation(), /did not confirm/);
});

test('okay, help and timeout use the resident-response endpoint and exact response values', async () => {
  for (const response of ['resident_okay', 'resident_needs_help', 'timeout'] as const) {
    globalThis.fetch = async (input, options) => {
      if (options?.method === 'GET') return json(pending);
      assert.equal(new URL(String(input)).pathname, '/api/incidents/fall-test/response');
      assert.deepEqual(JSON.parse(String(options?.body)), { response });
      const event = response === 'resident_okay' ? okay : response === 'resident_needs_help' ? help : { ...help, status: 'no_response', resident_response: 'timeout' };
      return json({ accepted: true, event });
    };
    assert.equal((await submitFallResponse('fall-test', response)).resident_response, response);
  }
});

test('a previously handled incident is shown without posting another response', async () => {
  let requests = 0;
  globalThis.fetch = async (_input, options) => { requests++; assert.equal(options?.method, 'GET'); return json(okay); };
  assert.equal((await submitFallResponse('fall-test', 'resident_needs_help')).status, 'resolved');
  assert.equal(requests, 1);
});

test('a lost response acknowledgement is reconciled with the saved backend state', async () => {
  let saved = false;
  globalThis.fetch = async (_input, options) => {
    if (options?.method === 'POST') { saved = true; throw new TypeError('Network disconnected after saving'); }
    return json(saved ? okay : pending);
  };
  assert.equal((await submitFallResponse('fall-test', 'resident_okay')).status, 'resolved');
});

test('a competing response displays the backend result after a 409 conflict', async () => {
  let changed = false;
  globalThis.fetch = async (_input, options) => {
    if (options?.method === 'POST') { changed = true; return json({ detail: 'Already handled' }, 409); }
    return json(changed ? help : pending);
  };
  assert.equal((await submitFallResponse('fall-test', 'resident_okay')).resident_response, 'resident_needs_help');
});

test('a genuine response failure remains an error instead of claiming success', async () => {
  globalThis.fetch = async (_input, options) => options?.method === 'POST' ? json({ detail: 'Service unavailable' }, 503) : json(pending);
  await assert.rejects(submitFallResponse('fall-test', 'resident_okay'), /Service unavailable/);
});

test('invalid incident data and unavailable backend produce useful errors', async () => {
  globalThis.fetch = async () => json({ event_id: 'bad' });
  await assert.rejects(getFallIncident('bad'), /unexpected incident format/);
  globalThis.fetch = async () => { throw new TypeError('Connection refused'); };
  await assert.rejects(getFallIncident('bad'), /Could not connect to the backend/);
});
