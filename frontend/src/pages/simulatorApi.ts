import { FallApiError, request } from './fallApi.ts';

export interface DemoResetResult {
  status: 'reset';
  incidents_cleared: number;
  reminders_cleared: number;
}

export async function resetDemoData(): Promise<DemoResetResult> {
  const value = await request('/api/simulator/reset', {});
  if (!value || typeof value !== 'object') {
    throw new FallApiError('The backend did not confirm the demo reset.');
  }
  const item = value as Record<string, unknown>;
  if (
    item.status !== 'reset' ||
    typeof item.incidents_cleared !== 'number' ||
    typeof item.reminders_cleared !== 'number'
  ) {
    throw new FallApiError('The backend did not confirm the demo reset.');
  }
  return item as unknown as DemoResetResult;
}
