import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createUtilitySimulation } from '../src/pages/utilityApi.ts';

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

test('inactivity and utility simulator scenarios call the anomaly backend', async () => {
  for (const kind of ['inactivity', 'utility'] as const) {
    globalThis.fetch = async (input, options) => {
      assert.equal(new URL(String(input)).pathname, '/utility-anomaly');
      assert.equal(options?.method, 'POST');
      const body = JSON.parse(String(options?.body));
      assert.equal(body.resident_state, 'HOME');
      assert.equal(body.simulation, true);
      assert.equal(body.anomaly_kind, kind);
      if (kind === 'inactivity') assert.equal(body.inactivity_mins, 180);
      else assert.equal(body.water_lpm, 8.5);
      return json(anomaly);
    };
    assert.equal((await createUtilitySimulation(kind)).is_anomaly, true);
  }
});

test('simulator rejects normal or malformed anomaly responses', async () => {
  globalThis.fetch = async () => json({ ...anomaly, is_anomaly: false });
  await assert.rejects(createUtilitySimulation('utility'), /did not classify/);
  globalThis.fetch = async () => json({ incident_id: 'bad' });
  await assert.rejects(createUtilitySimulation('inactivity'), /unexpected anomaly result/);
});
