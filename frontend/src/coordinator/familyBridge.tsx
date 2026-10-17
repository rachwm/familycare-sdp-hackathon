import { createContext, useContext } from 'react';
import { getScenario, getTodayActivities, routineActivities, type Scenario } from '../data/mockData';
import { currentTime, statusLabel, type DemoState } from './demo';

// Optional coordinator bridge: legacy family scenarios keep their existing selectors.
export const FamilyDemoContext=createContext<DemoState|undefined>(undefined);
export const useFamilyDemo=()=>useContext(FamilyDemoContext);
export function familyConfig(scenario:Scenario,demo?:DemoState) {
  const original=getScenario(scenario);
  if(!demo) return original;
  const latest=demo.events.at(-1);
  return {...original,time:currentTime(demo),status:demo.stage==='normal'?original.status:statusLabel(demo),description:demo.stage==='normal'?original.description:latest?.description??original.description};
}
export function familyActivities(scenario:Scenario,demo?:DemoState) {
  if(!demo)return getTodayActivities(scenario);
  return [...demo.events].reverse().concat(routineActivities).sort((a,b)=>b.minutes-a.minutes);
}
