import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemo, incidentId } from '../src/coordinator/demo.ts';
import { coordinatorDemoReports, coordinatorDemoTabs, responderMilestones, useAdvancedCoordinator } from '../src/coordinator/demoView.ts';
import { createResponderDemo, responderTransition } from '../src/responder/demo.ts';
test('three demo sections preserve access to advanced features',()=>{
 assert.equal(coordinatorDemoTabs.length,3);
 assert.equal(useAdvancedCoordinator('/coordinator',''),false);
 assert.equal(useAdvancedCoordinator('/coordinator','?advanced=1'),true);
 for(const path of ['responders','residents','settings'])assert.equal(useAdvancedCoordinator(`/coordinator/${path}`,''),true);
});
test('progress shows confirmed milestones without future timestamps',()=>{
 for(const [stage,count] of [['assigned',1],['accepted',2],['on-way',3],['arrived',4]] as const){
  const steps=responderMilestones(createDemo(stage));
  assert.equal(steps.filter(s=>s.confirmed).length,count);
  assert.ok(steps.slice(count).every(s=>s.time===undefined));
 }
 const released={...createDemo('arrived'),responder:null};
 assert.ok(responderMilestones(released).every(s=>!s.confirmed));
 const reassigned={...createDemo('arrived'),events:[...createDemo('arrived').events,{id:'assigned-new',title:'Reassigned',description:'New responder',time:'11:00 AM',minutes:660}]};
 assert.deepEqual(responderMilestones(reassigned).map(s=>s.confirmed),[true,false,false,false]);
});
test('coordinator reports expose both shared responder outcomes and preserve historical reports',()=>{
 for(const condition of ['safe','needs-assistance'] as const){
  let state=createResponderDemo();
  for(const type of ['accept','depart','arrive'] as const)state=responderTransition(state,{type});
  state=responderTransition(state,{type:'submit-report',condition,notes:'Demo visit note'});
  const reports=coordinatorDemoReports(state); const report=reports.find(r=>r.id===incidentId)!;
  assert.equal(report.condition,condition);assert.equal(report.notes,'Demo visit note');
  assert.equal(report.resolved,condition==='safe');
  assert.equal(reports.filter(r=>r.id===incidentId).length,1);
  assert.ok(reports.some(r=>r.residentId==='mariam'));
 }
});
