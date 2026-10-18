import { createContext, useContext } from 'react';
import { getScenario, getTodayActivities, routineActivities, type Scenario } from '../data/mockData';
import { currentTime, statusLabel, type DemoState } from './demo';

// Optional coordinator bridge: legacy family scenarios keep their existing selectors.
export const FamilyDemoContext=createContext<DemoState|undefined>(undefined);
export const useFamilyDemo=()=>useContext(FamilyDemoContext);
// The coordinator keeps its own demo records; Family pages use the current account name.
export const familyDisplayText=(value:string)=>value.replaceAll('Nur Aisha','Sarah');
export const familyEvents=(demo:DemoState)=>demo.events.map(event=>({...event,description:familyDisplayText(event.description)}));
export function familyConfig(scenario:Scenario,demo?:DemoState) {
  const original=getScenario(scenario);
  if(!demo) return original;
  const latest=demo.events.at(-1);
  if (demo.visitReport?.condition === 'needs-assistance') return {...original,time:currentTime(demo),status:'Needs further assistance',description:familyDisplayText(latest?.description ?? ''),tone:'orange' as const,icon:'alert' as const};
  return {...original,time:currentTime(demo),status:demo.stage==='normal'?original.status:statusLabel(demo),description:demo.stage==='normal'?original.description:familyDisplayText(latest?.description??original.description)};
}
export function familyActivities(scenario:Scenario,demo?:DemoState) {
  if(!demo)return getTodayActivities(scenario);
  return familyEvents(demo).reverse().concat(routineActivities).sort((a,b)=>b.minutes-a.minutes);
}
