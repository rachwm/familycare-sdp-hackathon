import { createDemo, transition, type DemoState, type VisitReport } from '../coordinator/demo.ts';

// Frontend simulation only. Connect to agreed responder APIs when they exist.
export type ResponderAction = { type: 'load-assignment' | 'accept' | 'depart' | 'arrive' }
  | { type: 'submit-report'; condition: VisitReport['condition']; notes: string };
export const createResponderDemo = (): DemoState => createDemo('assigned', 'responder');
export function responderTransition(state: DemoState, action: ResponderAction): DemoState {
  if (action.type === 'load-assignment') return createResponderDemo();
  if (state.responder !== 'Daniel Lim' || state.escalated || state.visitReport) return state;
  const expected = { accept: 'assigned', depart: 'accepted', arrive: 'on-way' } as const;
  if (action.type !== 'submit-report') {
    return state.stage === expected[action.type] ? { ...transition(state, { type: 'advance' }), source: 'responder' } : state;
  }
  if (state.stage !== 'arrived' || !['safe', 'needs-assistance'].includes(action.condition) || action.notes.trim().length > 1000) return state;
  const checked = transition(state, { type: 'advance' });
  const completed = transition(checked, { type: 'advance' });
  const report: VisitReport = { condition: action.condition, notes: action.notes.trim(), submittedAt: completed.events.at(-1)!.time };
  const description = `Daniel Lim reported: ${report.condition === 'safe' ? 'Safe' : 'Needs further assistance'}.${report.notes ? ` Notes: ${report.notes}` : ''} ${report.condition === 'safe' ? 'Visit completed.' : 'Visit report submitted; incident remains open for coordinator follow-up.'} Outcome available in the Family Dashboard demo; no real notification sent.`;
  const events = [...completed.events];
  events[events.length - 1] = { ...events.at(-1)!, title: report.condition === 'safe' ? 'Visit completed · report submitted' : 'Visit completed · further assistance requested', description, tone: report.condition === 'safe' ? 'green' : 'orange' };
  return { ...completed, stage: report.condition === 'safe' ? 'completed' : 'checked', escalated: report.condition !== 'safe', source: 'responder', visitReport: report, events };
}
