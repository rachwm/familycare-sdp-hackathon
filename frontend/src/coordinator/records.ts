import { DEMO_DAY, hasDeparted, incidentId, responders, stageIndex, statusLabel, type DemoState } from './demo.ts';
export interface Resident { id:string; name:string; area:string; family:string }
export const residents:Resident[] = [
  {id:'aisha',name:'Puan Aisha',area:'Elmina Green 2',family:'Nur Aisha · Daughter'},
  {id:'tan',name:'Mr. Tan',area:'Elmina East 1',family:'Contact details withheld'},
  {id:'lee',name:'Mdm. Lee',area:'Elmina Green 5',family:'Contact details withheld'},
  {id:'mariam',name:'Puan Mariam',area:'Elmina Green 3',family:'Contact details withheld'},
];
export interface IncidentRecord { id:string; residentId:string; title:string; priority:'High'|'Medium'|'Low'; group:'New Requests'|'In Progress'|'Resolved'; status:string; detected:string; requested?:string; responder:string|null; completion?:string; outcome?:string; date:string; departure?:string }
export function getIncidents(state:DemoState):IncidentRecord[] {
  const recorded:IncidentRecord[] = [{id:'visit-mariam-2026-10-16',residentId:'mariam',title:'Routine assistance request',priority:'Low',group:'Resolved',status:'Visit completed',detected:'09:00 AM',responder:'Ravi Kumar',completion:'09:55 AM',outcome:'Demo report: requested household assistance was provided; visit closed with resident agreement. No clinical assessment recorded.',date:DEMO_DAY}];
  if(state.stage==='normal') return recorded;
  const eventTime = (stage:string) => [...state.events].reverse().find(e=>e.id===stage || e.id.startsWith(`${stage}-`))?.time;
  return [
    {id:incidentId,residentId:'aisha',title:'Possible Fall Detected',priority:'High',group:state.stage==='completed'?'Resolved':state.responder||stageIndex(state.stage)<4?'In Progress':'New Requests',status:statusLabel(state),detected:'10:32 AM',requested:stageIndex(state.stage)>=4?'10:47 AM':undefined,responder:state.responder,date:DEMO_DAY,departure:hasDeparted(state)?eventTime('on-way'):undefined,completion:state.stage==='completed'?eventTime('completed'):undefined,outcome:state.stage==='completed'?'Demo report: responder recorded the resident check and completed the visit. Nur Aisha notified of this outcome. No verified clinical assessment.':undefined},
    {id:'incident-tan-2026-10-16',residentId:'tan',title:'Resident assistance requested',priority:'Medium',group:'In Progress',status:'On Site',detected:'09:18 AM',responder:'Amir Hafiz',date:DEMO_DAY,departure:'09:25 AM'},
    {id:'incident-lee-2026-10-16',residentId:'lee',title:'Resident assistance requested',priority:'Low',group:'In Progress',status:'En Route',detected:'08:56 AM',responder:'Tan Wei Ming',date:DEMO_DAY,departure:'09:05 AM'},
    ...recorded,
  ];
}
export const residentFor = (id:string) => residents.find(r=>r.id===id)!;
export function getResponderRecords(state:DemoState) {
  const incidents=getIncidents(state);
  return responders.map(r=>{const assignment=incidents.find(i=>i.responder===r.name && i.group!=='Resolved');return {...r,assignment,availability:assignment?'On Task':r.available&&!state.unavailable.includes(r.name)?'Available':'Unavailable'};});
}
export function getReports(state:DemoState, todayOnly=false) { return getIncidents(state).filter(i=>i.group==='Resolved' && (!todayOnly || i.date===DEMO_DAY)); }
export function getStats(state:DemoState) { return {requests:getIncidents(state).filter(i=>i.group==='New Requests').length,onTask:getResponderRecords(state).filter(r=>r.assignment).length,completed:getReports(state,true).length}; }
export function filterIncidents(state:DemoState,filter:string,search='') { return getIncidents(state).filter(i=>(filter==='All'||i.group===filter) && `${residentFor(i.residentId).name} ${i.id} ${i.title} ${residentFor(i.residentId).area}`.toLowerCase().includes(search.toLowerCase())); }
export function filterResponders(state:DemoState,filter:string,search='') { return getResponderRecords(state).filter(r=>(filter==='All'||r.availability===filter)&&`${r.name} ${r.area} ${r.capability}`.toLowerCase().includes(search.toLowerCase())); }
export const incidentPath=(id:string)=>`/coordinator/incidents/${encodeURIComponent(id)}`;
export const residentPath=(id:string)=>`/coordinator/residents/${encodeURIComponent(id)}`;
export const reportPath=(id:string)=>`/coordinator/reports/${encodeURIComponent(id)}`;
export const summaryLinks=[{label:'New Assistance Requests',key:'requests',icon:'alert',tone:'red',to:'/coordinator/incidents?filter=New+Requests'},{label:'Responders On Task',key:'onTask',icon:'people',tone:'blue',to:'/coordinator/responders?filter=On+Task'},{label:'Completed Today',key:'completed',icon:'check',tone:'green',to:'/coordinator/reports?filter=Today'}] as const;
export const navigation=[{label:'Overview',to:'/coordinator',icon:'home'},{label:'Incidents',to:'/coordinator/incidents',icon:'alert'},{label:'Responders',to:'/coordinator/responders',icon:'people'},{label:'Residents',to:'/coordinator/residents',icon:'profile'},{label:'Reports',to:'/coordinator/reports',icon:'history'},{label:'Settings',to:'/coordinator/settings',icon:'info'}] as const;
export function arrivalEstimate(state:DemoState) {
  const departure=[...state.events].reverse().find(e=>e.id==='on-way'||e.id.startsWith('on-way-'));
  if(!departure || !state.responder) return 'pending';
  const travel=responders.find(r=>r.name===state.responder)?.travelMinutes ?? 8;
  const minutes=departure.minutes+travel;
  return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')} AM`;
}
