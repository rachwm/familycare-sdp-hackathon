import { FALL_ID, type Activity, type Scenario } from '../data/mockData.ts';

// Deterministic frontend adapter. No backend paths or operational dispatch implied.
export const incidentId = FALL_ID;
export const DEMO_DAY = '2026-10-16';
export const steps = [
  ['normal', 'Normal monitoring', '10:30 AM'], ['fall', 'Possible fall detected', '10:32 AM'],
  ['pending', 'Resident check-in pending', '10:32 AM'], ['no-response', 'No response after 15 minutes', '10:47 AM'],
  ['requested', 'Assistance requested', '10:47 AM'], ['matching', 'Automatic responder matching', '10:47 AM'],
  ['assigned', 'Responder assigned', '10:48 AM'], ['accepted', 'Responder accepts', '10:49 AM'],
  ['on-way', 'Responder on the way', '10:50 AM'], ['arrived', 'Responder arrived', '10:58 AM'],
  ['checked', 'Resident checked', '11:03 AM'], ['completed', 'Visit completed', '11:20 AM'],
] as const;
export type Stage = typeof steps[number][0];
export interface DemoState {
  stage: Stage; events: Activity[]; escalated: boolean; responder: string | null;
  declined: boolean; excluded: string[]; unavailable: string[]; source: 'family' | 'coordinator';
}
export const responders = [
  { id:'daniel', name:'Daniel Lim', area:'City of Elmina', available:true, suitable:true, travelMinutes:8, distance:'2.1 km', capability:'Resident wellbeing visits' },
  { id:'mei', name:'Mei Chen', area:'City of Elmina', available:true, suitable:true, travelMinutes:12, distance:'3.4 km', capability:'Resident wellbeing visits' },
  { id:'amir', name:'Amir Hafiz', area:'City of Elmina', available:true, suitable:true, travelMinutes:10, distance:'2.8 km', capability:'Resident wellbeing visits' },
  { id:'tan', name:'Tan Wei Ming', area:'City of Elmina', available:true, suitable:true, travelMinutes:11, distance:'3.0 km', capability:'Resident wellbeing visits' },
  { id:'ravi', name:'Ravi Kumar', area:'City of Elmina', available:false, suitable:true, travelMinutes:6, distance:'1.5 km', capability:'Resident wellbeing visits' },
  { id:'lee', name:'Alex Lee', area:'Other service area', available:true, suitable:true, travelMinutes:5, distance:'1.2 km', capability:'Resident wellbeing visits' },
] as const;
export const candidate = responders[0];
export const stageIndex = (stage: Stage) => steps.findIndex(step => step[0] === stage);
export const currentTime = (state: DemoState) => state.events.at(-1)?.time ?? steps[stageIndex(state.stage)][2];
export function formatTime(minutes: number) { return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2,'0')} AM`; }
const minutesFor = (stage: Stage) => { const [h,m] = steps[stageIndex(stage)][2].split(' ')[0].split(':').map(Number); return h*60+m; };
function eventFor(stage: Stage, name = 'Daniel Lim', after = 0): Activity {
  const minutes = Math.max(minutesFor(stage), after);
  const title = stage === 'pending' ? 'Home Companion begins resident check-in' : stage === 'accepted' ? `${name} accepted assignment` : stage === 'completed' ? 'Visit completed · report submitted' : steps[stageIndex(stage)][1];
  const description = stage === 'fall' ? 'Possible fall signal detected; resident check-in initiated.' : stage === 'matching' ? 'Matching by service area, availability, capability and simulated travel time.' : stage === 'assigned' ? `${name} offered the assignment. Awaiting acceptance.` : stage === 'on-way' ? `${name} explicitly confirmed departure.` : stage === 'checked' ? 'Responder recorded the demonstration resident check. No verified clinical assessment.' : stage === 'completed' ? `Report submitted by ${name}. Nur Aisha notified of the recorded demo outcome.` : 'Confirmed in this demonstration.';
  return { id:stage, title, description, time:formatTime(minutes), minutes, date:'today', category:'incident', incidentId, icon:'check', tone:'green' };
}
export function createDemo(stage: Stage = 'requested', source: DemoState['source'] = 'coordinator'): DemoState {
  return { stage, source, escalated:false, declined:false, excluded:[], unavailable:[], responder:stageIndex(stage) >= 6 ? 'Daniel Lim' : null, events:steps.slice(1,stageIndex(stage)+1).map(([id])=>eventFor(id)) };
}
export function eligibleCandidates(state: DemoState) {
  const busy = state.stage === 'normal' ? [] : ['Amir Hafiz','Tan Wei Ming'];
  return responders.filter(r=>r.available && r.suitable && r.area === 'City of Elmina' && !busy.includes(r.name) && !state.excluded.includes(r.name) && !state.unavailable.includes(r.name))
    .sort((a,b)=>a.travelMinutes-b.travelMinutes);
}
export const eligibleCandidate = (state: DemoState) => eligibleCandidates(state)[0] ?? null;
export type Action = {type:'select';stage:Stage} | {type:'advance'|'start-matching'|'auto-assign'|'decline'|'confirm-reassign'|'confirm-escalate'} | {type:'availability';name:string;unavailable:boolean};
export function transition(state: DemoState, action: Action): DemoState {
  if(action.type === 'select') return createDemo(action.stage);
  if(action.type === 'availability') {
    if(state.responder === action.name) return state;
    return {...state, unavailable:action.unavailable ? [...new Set([...state.unavailable,action.name])] : state.unavailable.filter(name=>name!==action.name)};
  }
  if(action.type === 'auto-assign' && state.stage !== 'matching') return state;
  if(action.type === 'start-matching' && state.stage !== 'requested') return state;
  if(state.stage === 'normal' || state.stage === 'completed') return action.type === 'advance' && state.stage === 'normal' ? createDemo('fall') : state;
  const latest = state.events.at(-1)!;
  const append = (id:string,title:string,description:string):Activity => ({...latest,id:`${id}-${state.events.length}`,title,description,tone:'orange'});
  if(action.type === 'confirm-escalate') return state.escalated ? state : {...state, escalated:true, events:[...state.events,append('escalated','Incident escalated','Coordinator requested supervisor / urgent support review. No external emergency service contacted.')]};
  if(action.type === 'confirm-reassign' || action.type === 'decline') {
    if(action.type === 'decline' && state.stage !== 'assigned') return state;
    const name = state.responder ?? eligibleCandidate(state)?.name;
    return {...state,stage:'matching',responder:null,declined:action.type==='decline',excluded:name ? [...new Set([...state.excluded,name])] : state.excluded,events:[...state.events,append('rematch',action.type==='decline' ? `${name} declined · matching restarted` : 'Responder released · matching restarted','Previous assignment retained in the audit history. Searching for the next eligible available responder.')]};
  }
  if(state.escalated) return state;
  const next = state.stage === 'matching' ? 'assigned' : steps[stageIndex(state.stage)+1]?.[0];
  if(!next) return state;
  const selected = next === 'assigned' ? eligibleCandidate(state)?.name : state.responder;
  if(next === 'assigned' && !selected) return state;
  const event = eventFor(next,selected ?? 'Daniel Lim',latest.minutes);
  event.id = `${next}-${state.events.length}`;
  return {...state,stage:next,declined:false,responder:selected ?? null,events:[...state.events,event]};
}
export function familyScenario(state: DemoState): Scenario {
  switch(state.stage) {
    case 'pending': return 'fall';
    case 'no-response': case 'matching': return 'requested';
    case 'accepted': return 'assigned';
    default: return state.stage;
  }
}
export const statusLabel = (state: DemoState) => state.escalated ? 'Escalated · support review pending' : state.stage==='matching' && !eligibleCandidate(state) ? 'Coordinator action required' : steps[stageIndex(state.stage)][1];
export const hasDeparted = (state: DemoState) => !!state.responder && stageIndex(state.stage)>=8;
