import { request, FallApiError } from './fallApi.ts';

export interface MedicationReminder {
  id: string;
  time: string;
  message: string;
  type: string;
}

function parseReminder(value: unknown): MedicationReminder {
  if (typeof value !== 'object' || value === null) throw new FallApiError('The backend returned an unexpected reminder format.');
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id || typeof item.time !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) || typeof item.message !== 'string' ||
      !item.message.trim() || typeof item.type !== 'string') {
    throw new FallApiError('The backend returned an unexpected reminder format.');
  }
  return item as unknown as MedicationReminder;
}

export async function createMedicationReminder(): Promise<MedicationReminder> {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date());
  const reminder = parseReminder(await request('/reminders', {
    id: '', time,
    message: 'This is your medication reminder. Please follow your care plan.',
    type: 'medication',
  }));
  if (reminder.type !== 'medication') throw new FallApiError('The backend did not confirm a medication reminder.');
  return reminder;
}

export async function getMedicationReminder(id: string, signal?: AbortSignal): Promise<MedicationReminder> {
  const data = await request('/reminders', undefined, signal);
  if (!Array.isArray(data)) throw new FallApiError('The backend returned an unexpected reminder list.');
  const found = data.find(item => typeof item === 'object' && item !== null && item.id === id);
  if (!found) throw new FallApiError('This reminder could not be found. Please create a new medication simulation.', 404);
  const reminder = parseReminder(found);
  if (reminder.type !== 'medication') throw new FallApiError('This is not a medication reminder.');
  return reminder;
}
