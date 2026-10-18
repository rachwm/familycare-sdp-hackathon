import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemo, transition, familyScenario, eligibleCandidate, stageIndex, steps } from '../src/coordinator/demo.ts';

test('each coordinator scenario contains exactly its confirmed chronological prefix', () => {
  for (const [stage] of steps) {
    const state = createDemo(stage);
    assert.equal(state.events.length, stageIndex(stage));
    assert.ok(state.events.every((event, i) => i === 0 || event.minutes >= state.events[i - 1].minutes));
    assert.equal(new Set(state.events.map(event => event.id)).size, state.events.length);
    assert.equal(!!state.responder, stageIndex(stage) >= stageIndex('assigned'));
  }
});
test('10:47 candidate is never accepted or dispatched, assignment precedes acceptance and departure', () => {
  let state = createDemo('matching');
  assert.equal(eligibleCandidate(state)?.name, 'Daniel Lim');
  assert.equal(state.responder, null);
  assert.equal(state.events.at(-1)?.time, '10:47 AM');
  state = transition(state, { type:'advance' });
  assert.equal(state.stage, 'assigned');
  assert.equal(state.events.at(-1)?.time, '10:48 AM');
  state = transition(state, { type:'advance' });
  assert.equal(state.stage, 'accepted');
  assert.equal(state.events.at(-1)?.time, '10:49 AM');
  state = transition(state, { type:'advance' });
  assert.equal(state.stage, 'on-way');
  assert.equal(state.events.at(-1)?.time, '10:50 AM');
});
test('sequential demo completes only after arrival, check and submitted report', () => {
  let state = createDemo('normal');
  for (const [stage] of steps.slice(1)) {
    state = transition(state, {type:'advance'});
    assert.equal(state.stage, stage);
  }
  assert.deepEqual(state.events.slice(-3).map(e => e.time), ['10:58 AM','11:03 AM','11:20 AM']);
  assert.match(state.events.at(-1)!.title, /report submitted/);
  assert.equal(transition(state, {type:'advance'}), state);
});
test('decline preserves the offer and tries the next eligible available responder', () => {
  const assigned = createDemo('assigned');
  const state = transition(assigned, {type:'decline'});
  assert.equal(state.stage, 'matching');
  assert.equal(state.responder, null);
  assert.equal(eligibleCandidate(state)?.name, 'Mei Chen');
  const replacement = transition(state, {type:'auto-assign'});
  assert.equal(replacement.responder, 'Mei Chen');
  assert.equal(replacement.stage, 'assigned');
  assert.equal(replacement.events.length, state.events.length + 1);
  assert.match(state.events.at(-1)!.title, /declined/);
  assert.equal(familyScenario(state), 'requested');
  assert.equal(transition(createDemo('accepted'), {type:'decline'}).stage, 'accepted');
});
test('only explicit confirmation actions reassign or escalate; escalation never resolves', () => {
  const original = createDemo('on-way');
  const reassigned = transition(original, {type:'confirm-reassign'});
  assert.equal(original.responder, 'Daniel Lim');
  assert.equal(reassigned.responder, null);
  assert.match(reassigned.events.at(-1)!.title, /released/);
  assert.equal(reassigned.events.at(-1)?.time, '10:50 AM');
  const escalated = transition(original, {type:'confirm-escalate'});
  assert.equal(escalated.stage, 'on-way');
  assert.equal(escalated.escalated, true);
  assert.equal(transition(escalated, {type:'advance'}), escalated);
  assert.equal(transition(escalated, {type:'confirm-escalate'}), escalated);
});
test('family projections preserve existing scenarios and distinct special incident', () => {
  for (const stage of ['normal','fall','requested','assigned','on-way','arrived','checked','completed'] as const) assert.equal(familyScenario(createDemo(stage)), stage);
  assert.equal(familyScenario(createDemo('accepted')), 'assigned');
  assert.equal(familyScenario(createDemo('pending')), 'fall');
  assert.equal(familyScenario(createDemo('matching')), 'requested');
});
test('reset clears decline/escalation and inactive incidents cannot be mutated', () => {
  const state = transition(transition(createDemo('assigned'), {type:'decline'}), {type:'confirm-escalate'});
  const reset = transition(state, {type:'select',stage:'requested'});
  assert.equal(reset.escalated, false);
  assert.equal(reset.declined, false);
  for (const stage of ['normal','completed'] as const) {
    const inactive = createDemo(stage);
    assert.equal(transition(inactive, {type:'confirm-reassign'}), inactive);
    assert.equal(transition(inactive, {type:'confirm-escalate'}), inactive);
  }
});

test('late automatic matching callbacks cannot accept or dispatch a responder', () => {
  const matched = transition(createDemo('matching'), {type:'auto-assign'});
  assert.equal(matched.stage, 'assigned');
  assert.equal(transition(matched, {type:'auto-assign'}), matched);
  assert.equal(transition(createDemo('requested'), {type:'auto-assign'}).stage, 'requested');
  const released = transition(matched, {type:'decline'});
  const backup = transition(released, {type:'auto-assign'});
  assert.equal(backup.responder, 'Mei Chen');
  assert.equal(backup.stage, 'assigned');
  assert.equal(transition(backup, {type:'auto-assign'}), backup);
});

test('unavailable, busy and out-of-area responders are excluded and no-candidate matching stops', () => {
  let state = createDemo('matching');
  state = transition(state, {type:'availability',name:'Daniel Lim',unavailable:true});
  assert.equal(eligibleCandidate(state)?.name,'Mei Chen');
  state = transition(state, {type:'availability',name:'Mei Chen',unavailable:true});
  assert.equal(eligibleCandidate(state),null);
  assert.equal(transition(state,{type:'auto-assign'}),state);
  state = transition(state,{type:'availability',name:'Daniel Lim',unavailable:false});
  assert.equal(eligibleCandidate(state)?.name,'Daniel Lim');
});
test('late reassignment never rewinds the clock or dispatches the replacement automatically', () => {
  let state=transition(createDemo('arrived'),{type:'confirm-reassign'});
  state=transition(state,{type:'auto-assign'});
  assert.equal(state.responder,'Mei Chen');
  assert.equal(state.stage,'assigned');
  state=transition(state,{type:'advance'});
  state=transition(state,{type:'advance'});
  assert.equal(state.stage,'on-way');
  assert.ok(state.events.every((event,i)=>i===0||event.minutes>=state.events[i-1].minutes));
  assert.equal(state.events.filter(e=>e.title==='Responder assigned').length,2);
});
