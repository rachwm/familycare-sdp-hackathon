import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemo, hasDeparted, incidentId, transition } from '../src/coordinator/demo.ts';
import { arrivalEstimate, filterIncidents, filterResponders, getIncidents, getReports, getResponderRecords, getStats, incidentPath, navigation, residents, residentFor, residentPath, reportPath, summaryLinks } from '../src/coordinator/records.ts';

test('summary cards have distinct directories and useful URL filters',()=>{
  assert.equal(new Set(summaryLinks.map(s=>s.to)).size,3);
  assert.deepEqual(summaryLinks.map(s=>new URL(s.to,'http://demo').pathname),['/coordinator/incidents','/coordinator/responders','/coordinator/reports']);
  assert.deepEqual(summaryLinks.map(s=>new URL(s.to,'http://demo').searchParams.get('filter')),['New Requests','On Task','Today']);
  assert.deepEqual(navigation.map(n=>n.label),['Overview','Incidents','Responders','Residents','Reports','Settings']);
  assert.equal(new Set(navigation.map(n=>n.to)).size,6);
});
test('each incident and resident row has a record-specific destination',()=>{
  const incidents=getIncidents(createDemo());
  assert.equal(new Set(incidents.map(i=>incidentPath(i.id))).size,incidents.length);
  assert.equal(new Set(residents.map(r=>residentPath(r.id))).size,residents.length);
  for(const i of incidents) assert.ok(residentFor(i.residentId));
  assert.notEqual(incidentPath(incidents[0].id),incidentPath(incidents[1].id));
});
test('all incident filters and search use the same records without duplicating updates',()=>{
  const state=createDemo('assigned');const all=getIncidents(state);
  const groups=['New Requests','In Progress','Resolved'].flatMap(f=>filterIncidents(state,f));
  assert.equal(groups.length,all.length);
  assert.equal(new Set(groups.map(i=>i.id)).size,all.length);
  assert.equal(filterIncidents(state,'All','PUAN AISHA')[0]?.id,incidentId);
  assert.equal(filterIncidents(state,'All','Elmina East')[0]?.residentId,'tan');
  assert.equal(filterIncidents(state,'All','no-match').length,0);
  assert.equal(filterIncidents(createDemo('requested'),'New Requests')[0]?.id,incidentId);
});
test('counters, responder assignments and reports remain consistent at every demo stage',()=>{
  for(const stage of ['normal','requested','matching','assigned','accepted','on-way','arrived','checked','completed'] as const){
    const state=createDemo(stage),stats=getStats(state),incidents=getIncidents(state);
    assert.equal(stats.requests,filterIncidents(state,'New Requests').length);
    assert.equal(stats.onTask,filterResponders(state,'On Task').length);
    assert.equal(stats.completed,getReports(state,true).length);
    assert.equal(incidents.filter(i=>i.id===incidentId).length,stage==='normal'?0:1);
    assert.equal(getReports(state).some(i=>i.id===incidentId),stage==='completed');
  }
});
test('availability and assignment filters are distinct and search is functional',()=>{
  const state=createDemo('assigned');
  assert.equal(filterResponders(state,'On Task','Daniel')[0]?.assignment?.id,incidentId);
  assert.equal(filterResponders(state,'Available','Daniel').length,0);
  assert.equal(filterResponders(state,'Unavailable','Ravi').length,1);
  assert.ok(filterResponders(state,'All').length>filterResponders(state,'On Task').length);
});
test('replacement assignment propagates to directories and preserves completed report outcome',()=>{
  let state=transition(createDemo('on-way'),{type:'confirm-reassign'});
  assert.equal(hasDeparted(state),false);
  assert.equal(getResponderRecords(state).find(r=>r.name==='Daniel Lim')?.assignment,undefined);
  state=transition(state,{type:'auto-assign'});
  assert.equal(getResponderRecords(state).find(r=>r.name==='Mei Chen')?.assignment?.id,incidentId);
  assert.equal(getIncidents(state).find(i=>i.id===incidentId)?.responder,'Mei Chen');
  assert.equal(hasDeparted(state),false);
  assert.equal(getIncidents(state).find(i=>i.id===incidentId)?.departure,undefined);
  state=transition(state,{type:'advance'});assert.equal(hasDeparted(state),false);
  state=transition(state,{type:'advance'});assert.equal(hasDeparted(state),true);
  assert.equal(arrivalEstimate(state),'11:02 AM');
  for(let i=0;i<3;i++)state=transition(state,{type:'advance'});
  const report=getReports(state).find(r=>r.id===incidentId)!;
  assert.equal(report.responder,'Mei Chen');assert.equal(report.completion,'11:20 AM');
  assert.match(report.outcome!,/Nur Aisha/);assert.equal(reportPath(report.id),`/coordinator/reports/${incidentId}`);
});
test('tracking stays gated until explicit acceptance and departure; escalation does not complete reports',()=>{
  for(const stage of ['requested','matching','assigned','accepted'] as const) assert.equal(hasDeparted(createDemo(stage)),false);
  assert.equal(hasDeparted(createDemo('on-way')),true);
  const state=transition(createDemo('on-way'),{type:'confirm-escalate'});
  assert.equal(getReports(state).some(r=>r.id===incidentId),false);
  assert.equal(getIncidents(state).find(i=>i.id===incidentId)?.group,'In Progress');
});

test('a fall or pending check-in is not counted as an assistance request before 10:47',()=>{
  assert.equal(getStats(createDemo('fall')).requests,0);
  assert.equal(getStats(createDemo('pending')).requests,0);
  assert.equal(getStats(createDemo('requested')).requests,1);
});
