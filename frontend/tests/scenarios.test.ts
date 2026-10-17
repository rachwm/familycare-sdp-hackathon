import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fallEvents, getIncidentEvents, getTodayActivities, scenarios } from '../src/data/mockData.ts';
import { getSafetyAlerts, safetyAlertFilters } from '../src/data/safetyAlerts.ts';

test('each fall scenario contains only the chronological prefix that has occurred', () => {
  for (const state of scenarios.filter(s => !['normal', 'unusual'].includes(s.id))) {
    const events = getIncidentEvents(state.id);
    assert.deepEqual(events.map(event => event.id), fallEvents.slice(0, state.stage + 1).map(event => event.id));
    assert.ok(events.every((event, i) => i === 0 || event.minutes >= events[i - 1].minutes));
    const activityIds = new Set(getTodayActivities(state.id).map(event => event.id));
    for (const future of fallEvents.slice(state.stage + 1)) assert.ok(!activityIds.has(future.id));
  }
});
test('the possible-fall demonstration uses the requested times and event order', () => {
  assert.deepEqual(fallEvents.map(({ title, time }) => [title, time]), [
    ['Possible fall detected', '10:32 AM'], ['Resident check-in started', '10:32 AM'],
    ['Assistance requested', '10:47 AM'], ['Responder assigned', '10:47 AM'],
    ['Responder on the way', '10:50 AM'], ['Responder arrived', '10:58 AM'],
    ['Resident checked', '11:03 AM'], ['Visit completed', '11:20 AM'],
  ]);
});
test('normal monitoring has no incident, unusual activity is a separate incident', () => {
  assert.deepEqual(getIncidentEvents('normal'), []);
  assert.equal(getTodayActivities('normal').length, 3);
  const unusual = getIncidentEvents('unusual');
  assert.equal(unusual.length, 2);
  assert.ok(unusual.every(event => event.incidentId?.startsWith('unusual-')));
  assert.ok(!unusual.some(event => event.id === 'assistance-requested'));
});
test('history stays newest first, including events with the same timestamp', () => {
  for (const state of scenarios) {
    const records = getTodayActivities(state.id);
    assert.ok(records.every((event, i) => i === 0 || event.minutes <= records[i - 1].minutes));
  }
  assert.deepEqual(getTodayActivities('assigned').slice(0, 2).map(event => event.id), ['responder-assigned', 'assistance-requested']);
});

test('Alerts contains safety incidents only and Normal has no alerts', () => {
  assert.deepEqual(getSafetyAlerts('normal'), []);
  for (const state of scenarios) {
    const alerts = getSafetyAlerts(state.id);
    assert.equal(alerts.length, state.id === 'normal' ? 0 : 1);
    assert.ok(alerts.every(alert => alert.category === 'incident'));
    assert.ok(alerts.every(alert => ['Possible fall detected', 'Unusual activity detected'].includes(alert.title)));
    // Routine records remain available to Home and History in every scenario.
    const records = getTodayActivities(state.id);
    for (const id of ['check-in', 'medication', 'connected']) assert.ok(records.some(record => record.id === id));
  }
});

test('all three safety filters return the appropriate incident type', () => {
  assert.deepEqual([...safetyAlertFilters], ['All', 'Falls', 'Unusual Activity']);
  for (const state of scenarios) {
    const hasIncident = state.id !== 'normal';
    assert.equal(getSafetyAlerts(state.id, 'All').length, hasIncident ? 1 : 0);
    assert.equal(getSafetyAlerts(state.id, 'Falls').length, hasIncident && state.id !== 'unusual' ? 1 : 0);
    assert.equal(getSafetyAlerts(state.id, 'Unusual Activity').length, state.id === 'unusual' ? 1 : 0);
  }
});

test('response stages update one fall alert while retaining its identity and detection time', () => {
  const [initial] = getSafetyAlerts('fall');
  for (const state of scenarios.filter(state => !['normal', 'unusual'].includes(state.id))) {
    const [alert] = getSafetyAlerts(state.id);
    assert.equal(alert.id, initial.id);
    assert.equal(alert.incidentId, initial.incidentId);
    assert.equal(alert.time, '10:32 AM');
    assert.equal(alert.minutes, 632);
    assert.equal(alert.description, state.description);
    assert.equal(alert.status, state.id === 'fall' ? 'Awaiting response' : state.label);
  }
});

test('an incident stays active until the visit is completed, preserving its detection time', () => {
  for (const state of scenarios) {
    for (const alert of getSafetyAlerts(state.id)) {
      assert.equal(alert.resolved, state.id === 'completed');
      assert.equal(alert.time, state.id === 'unusual' ? '2:18 PM' : '10:32 AM');
    }
  }
});
