import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { resetDemoData } from '../src/pages/simulatorApi.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
afterEach(() => { globalThis.fetch = originalFetch; });
process.once('exit', () => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('demo reset uses the simulator endpoint and validates the confirmation', async () => {
  globalThis.fetch = async (input, options) => {
    assert.equal(new URL(String(input), 'http://local.test').pathname, '/api/simulator/reset');
    assert.equal(options?.method, 'POST');
    return json({ status: 'reset', incidents_cleared: 3, reminders_cleared: 1 });
  };
  assert.deepEqual(await resetDemoData(), { status: 'reset', incidents_cleared: 3, reminders_cleared: 1 });
});

test('demo reset rejects an invalid backend response', async () => {
  globalThis.fetch = async () => json({ status: 'maybe' });
  await assert.rejects(resetDemoData(), /did not confirm/);
});
