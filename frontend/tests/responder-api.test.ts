import test from 'node:test';
import assert from 'node:assert/strict';
import { isLiveIncident, incidentDescription, resolveFollowUpIncident, sendResponderCommand, type LiveIncident } from '../src/data/liveIncidents.ts';
const event: LiveIncident = {event_id:'actual-id',event_type:'possible_fall',resident_id:'resident-01',location:'living_room',severity:'critical',status:'no_response',timestamp:'2026-10-18T10:00:00+08:00',resident_response:'timeout',response_timestamp:null,requires_responder:true,responder_status:'assigned',responder_request_timestamp:null,resolution_timestamp:null,simulation:true,responder_id:'daniel',responder_name:'Daniel Lim'};
test('responder POST uses canonical route and actual payload; confirmed assignment validates',async()=>{
 let url='',body='',method='';
 const request=(async(input,init)=>{url=String(input);body=String(init?.body);method=init?.method??'';return {ok:true,json:async()=>({status:'success',event})} as Response;}) as typeof fetch;
 const command={endpoint:'assign-responder',payload:{responder_id:'daniel',responder_name:'Daniel Lim',responder_phone:''}} as const;
 assert.deepEqual(await sendResponderCommand('actual-id',command,'https://api.example/',request),event);
 assert.equal(url,'https://api.example/api/incidents/actual-id/assign-responder');assert.equal(method,'POST');assert.deepEqual(JSON.parse(body),command.payload);
 for(const status of ['assigned','accepted','on_the_way','arrived','resolved'])assert.ok(isLiveIncident({...event,responder_status:status}));
});
test('failed or unpersisted responder writes are never treated as confirmed success',async()=>{
 const command={endpoint:'responder-status',payload:{responder_status:'accepted'}} as const;
 const conflict=(async()=>({ok:false,status:409,json:async()=>({detail:'Out of order'})})) as typeof fetch;
 await assert.rejects(sendResponderCommand('actual-id',command,'',conflict),/Out of order/);
 const broadcastOnly=(async()=>({ok:true,json:async()=>({status:'success'})})) as typeof fetch;
 await assert.rejects(sendResponderCommand('actual-id',command,'',broadcastOnly),/Unexpected/);
});
test('Family outcome uses submitted backend report instead of guessing resident response',()=>{
 const result=incidentDescription({...event,status:'resolved',responder_status:'resolved',visit_report:{resident_condition:'safe',summary:'Comfortable.',action_taken:'Checked wellbeing.',submitted_at:event.timestamp}});
 assert.match(result,/Daniel Lim reported: safe/);assert.match(result,/Comfortable/);
});
test('coordinator can explicitly resolve an incident after a follow-up report',async()=>{
 let url='',body='';
 const resolved={...event,status:'resolved',responder_status:'resolved'} as LiveIncident;
 const request=(async(input,init)=>{url=String(input);body=String(init?.body);return {ok:true,json:async()=>({accepted:true,event:resolved})} as Response;}) as typeof fetch;
 assert.equal((await resolveFollowUpIncident('actual-id','https://api.example/',request)).status,'resolved');
 assert.equal(url,'https://api.example/api/incidents/actual-id/actions');
 assert.deepEqual(JSON.parse(body),{action:'resolve'});
});
