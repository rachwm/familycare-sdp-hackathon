import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createActivityAnomalySimulation } from '../src/pages/activityApi.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
afterEach(() => { globalThis.fetch = originalFetch; });
process.once('exit', () => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const anomaly = {
  incident_id: 'utility-test', timestamp: '2026-10-18T13:00:00+08:00',
  is_anomaly: true, confidence: 0.9, reason: 'Heuristic safety boundary exceeded',
  metrics: { power_kw: 0.2, water_lpm: 8.5, inactivity_mins: 60, z_score: 1.2 },
  resident_state: 'HOME',
};

test('the unified activity anomaly sends combined home-sensor evidence', async () => {
  globalThis.fetch = async (input, options) => {
    assert.equal(new URL(String(input), 'http://local.test').pathname, '/utility-anomaly');
    assert.equal(options?.method, 'POST');
    const body = JSON.parse(String(options?.body));
    assert.equal(body.resident_state, 'HOME');
    assert.equal(body.simulation, true);
    assert.equal(body.inactivity_mins, 180);
    assert.equal(typeof body.power_kw, 'number');
    assert.equal(typeof body.water_lpm, 'number');
    assert.equal(typeof body.door_transitions_15m, 'number');
    assert.equal('anomaly_kind' in body, false);
    return json(anomaly);
  };
  assert.equal((await createActivityAnomalySimulation()).is_anomaly, true);
});

test('simulator rejects normal or malformed anomaly responses', async () => {
  globalThis.fetch = async () => json({ ...anomaly, is_anomaly: false });
  await assert.rejects(createActivityAnomalySimulation(), /did not classify/);
  globalThis.fetch = async () => json({ incident_id: 'bad' });
  await assert.rejects(createActivityAnomalySimulation(), /unexpected activity-anomaly result/);
});
