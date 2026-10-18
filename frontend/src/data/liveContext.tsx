import { createContext, useContext } from 'react';
import type { LiveIncident } from './liveIncidents';

export interface LiveState {
  mode: 'demo' | 'live';
  incidents: LiveIncident[];
  loading: boolean;
  error: boolean;
}
export const LiveContext = createContext<LiveState>({ mode: 'demo', incidents: [], loading: false, error: false });
export function useLive() { return useContext(LiveContext); }
