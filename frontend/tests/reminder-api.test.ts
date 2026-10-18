import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createMedicationReminder, getMedicationReminder } from '../src/pages/reminderApi.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
afterEach(() => { globalThis.fetch = originalFetch; });
process.once('exit', () => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

const reminder = { id: 'medication-test-id', time: '09:00', message: 'Follow your care plan.', type: 'medication' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('medication simulation creates the agreed reminder payload and uses the server ID', async () => {
  globalThis.fetch = async (input, options) => {
    assert.equal(new URL(String(input), 'http://local.test').pathname, '/reminders');
    assert.equal(options?.method, 'POST');
    const body = JSON.parse(String(options?.body));
    assert.equal(body.id, '');
    assert.equal(body.type, 'medication');
    assert.match(body.time, /^([01]\d|2[0-3]):[0-5]\d$/);
    assert.equal(body.message, 'This is your medication reminder. Please follow your care plan.');
    return json({ ...body, id: reminder.id });
  };
  assert.equal((await createMedicationReminder()).id, reminder.id);
});

test('Companion loads the matching reminder, not the first record in the list', async () => {
  globalThis.fetch = async (input, options) => {
    assert.equal(new URL(String(input), 'http://local.test').pathname, '/reminders');
    assert.equal(options?.method, 'GET');
    return json([{ ...reminder, id: 'different-id', message: 'Different reminder.' }, reminder]);
  };
  assert.deepEqual(await getMedicationReminder(reminder.id), reminder);
});

test('a missing reminder produces a useful error instead of invented reminder data', async () => {
  globalThis.fetch = async () => json([]);
  await assert.rejects(getMedicationReminder('missing'), /could not be found/);
});

test('invalid reminder data and non-medication records are rejected', async () => {
  globalThis.fetch = async () => json({ reminders: [reminder] });
  await assert.rejects(getMedicationReminder(reminder.id), /unexpected reminder list/);
  globalThis.fetch = async () => json([{ ...reminder, time: '27:75' }]);
  await assert.rejects(getMedicationReminder(reminder.id), /unexpected reminder format/);
  globalThis.fetch = async () => json([{ ...reminder, type: 'routine' }]);
  await assert.rejects(getMedicationReminder(reminder.id), /not a medication reminder/);
});

test('creation and loading surface a backend failure instead of reporting success', async () => {
  globalThis.fetch = async () => json({ detail: 'Service unavailable' }, 503);
  await assert.rejects(createMedicationReminder(), /Service unavailable/);
  globalThis.fetch = async () => { throw new TypeError('Connection refused'); };
  await assert.rejects(getMedicationReminder(reminder.id), /Could not connect to the backend/);
});
