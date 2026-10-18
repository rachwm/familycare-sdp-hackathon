import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemo, familyScenario } from '../src/coordinator/demo.ts';
import { createResponderDemo, responderTransition } from '../src/responder/demo.ts';

const arrive = () => {
  let state = createResponderDemo();
  for (const type of ['accept','depart','arrive'] as const) state = responderTransition(state,{type});
  return state;
};
test('Daniel receives one assigned incident and explicitly accepts, departs and arrives', () => {
  let state = createResponderDemo();
  assert.equal(state.responder,'Daniel Lim');
  assert.equal(state.source,'responder');
  assert.equal(state.stage,'assigned');
  assert.equal(state.events.at(-1)?.time,'10:48 AM');
  for (const [type,stage,time] of [['accept','accepted','10:49 AM'],['depart','on-way','10:50 AM'],['arrive','arrived','10:58 AM']] as const) {
    state=responderTransition(state,{type});
    assert.equal(state.stage,stage);assert.equal(state.events.at(-1)?.time,time);
  }
  assert.equal(state.visitReport,undefined);
});
test('out-of-order actions and report submission before arrival are ignored', () => {
  const assigned=createResponderDemo();
  for (const type of ['depart','arrive'] as const) assert.equal(responderTransition(assigned,{type}),assigned);
  assert.equal(responderTransition(assigned,{type:'submit-report',condition:'safe',notes:''}),assigned);
  const accepted=responderTransition(assigned,{type:'accept'});
  assert.equal(responderTransition(accepted,{type:'accept'}),accepted);
  assert.equal(responderTransition(accepted,{type:'arrive'}),accepted);
});
test('a Safe report stores optional notes, completes the visit and shares the outcome', () => {
  const state=responderTransition(arrive(),{type:'submit-report',condition:'safe',notes:'  Resident confirmed she is comfortable.  '});
  assert.equal(state.stage,'completed');assert.equal(state.escalated,false);
  assert.deepEqual(state.visitReport,{condition:'safe',notes:'Resident confirmed she is comfortable.',submittedAt:'11:20 AM'});
  assert.equal(familyScenario(state),'completed');
  assert.match(state.events.at(-1)!.description,/Safe/);
  assert.match(state.events.at(-1)!.description,/Resident confirmed she is comfortable/);
  assert.deepEqual(state.events.slice(-2).map(e=>e.time),['11:03 AM','11:20 AM']);
  assert.ok(state.events.every((e,i)=>i===0||e.minutes>=state.events[i-1].minutes));
});
test('Needs further assistance completes the visit report but never resolves the incident', () => {
  const state=responderTransition(arrive(),{type:'submit-report',condition:'needs-assistance',notes:'Requested a follow-up visit.'});
  assert.equal(state.visitReport?.condition,'needs-assistance');
  assert.equal(state.visitReport?.submittedAt,'11:20 AM');
  assert.notEqual(state.stage,'completed');assert.equal(state.escalated,true);
  assert.equal(familyScenario(state),'requested');
  assert.match(state.events.at(-1)!.description,/incident remains open/);
  assert.doesNotMatch(state.events.at(-1)!.description,/reported: Safe/);
});
test('report submission is idempotent, notes are optional and reset clears the report', () => {
  const action={type:'submit-report',condition:'safe',notes:''} as const;
  const state=responderTransition(arrive(),action);
  assert.equal(state.visitReport?.notes,'');
  assert.equal(responderTransition(state,action),state);
  assert.equal(responderTransition(state,{type:'depart'}),state);
  const reset=responderTransition(state,{type:'load-assignment'});
  assert.equal(reset.stage,'assigned');assert.equal(reset.visitReport,undefined);
});
test('Daniel cannot progress a reassigned or escalated case, and oversized notes are rejected', () => {
  const mei={...createDemo('assigned'),responder:'Mei Chen'};
  assert.equal(responderTransition(mei,{type:'accept'}),mei);
  const escalated={...createDemo('on-way'),escalated:true};
  assert.equal(responderTransition(escalated,{type:'arrive'}),escalated);
  const arrived=arrive();assert.equal(responderTransition(arrived,{type:'submit-report',condition:'safe',notes:'a'.repeat(1001)}),arrived);
});
