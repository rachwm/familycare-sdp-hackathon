import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveIncident, type LiveIncident } from '../src/data/liveIncidents.ts';
const incident: LiveIncident = {
 event_id:'real/event ?one',event_type:'possible_fall',resident_id:'resident-02',location:'bedroom',
 status:'no_response',severity:'critical',timestamp:'2026-10-18T09:15:00+08:00',
 resident_response:'timeout',response_timestamp:'2026-10-18T09:16:00+08:00',requires_responder:true,
 responder_status:'requested',responder_request_timestamp:null,resolution_timestamp:null,simulation:false,
};
test('detail uses encoded real ID, configured base, abort signal and shared validation',async()=>{
 const controller=new AbortController();let url='';let signal:AbortSignal|undefined|null;
 const request=(async(input,init)=>{url=String(input);signal=init?.signal;return {ok:true,json:async()=>incident} as Response}) as typeof fetch;
 assert.deepEqual(await fetchLiveIncident(incident.event_id,controller.signal,request,'https://backend.example/'),incident);
 assert.equal(url,'https://backend.example/api/incidents/real%2Fevent%20%3Fone');assert.equal(signal,controller.signal);
});
test('detail distinguishes a missing record, unavailable backend and invalid or mismatched data',async()=>{
 const reply=(status:number,data:unknown)=>(async()=>({ok:status===200,status,json:async()=>data})) as typeof fetch;
 assert.equal(await fetchLiveIncident('missing',undefined,reply(404,{})),null);
 await assert.rejects(fetchLiveIncident('x',undefined,reply(503,{})),/503/);
 await assert.rejects(fetchLiveIncident('x',undefined,reply(200,incident)),/Unexpected/);
 await assert.rejects(fetchLiveIncident('x',undefined,reply(200,{event_id:'x'})),/Unexpected/);
});
