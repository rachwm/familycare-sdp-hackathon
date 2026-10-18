import { FallApiError, request } from './fallApi.ts';

export interface ActivityAnomalyResult {
  incident_id: string;
  timestamp: string;
  is_anomaly: boolean;
  confidence: number;
  reason: string;
  metrics: {
    power_kw: number;
    water_lpm: number;
    inactivity_mins: number;
    z_score: number;
  };
  resident_state: string;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readActivityResult(value: unknown): ActivityAnomalyResult {
  if (!value || typeof value !== 'object') {
    throw new FallApiError('The backend returned an unexpected activity-anomaly result.');
  }
  const item = value as Record<string, unknown>;
  const metrics = item.metrics as Record<string, unknown> | undefined;
  if (
    typeof item.incident_id !== 'string' || !item.incident_id ||
    typeof item.timestamp !== 'string' || !Number.isFinite(Date.parse(item.timestamp)) ||
    typeof item.is_anomaly !== 'boolean' ||
    !isNumber(item.confidence) || item.confidence < 0 || item.confidence > 1 ||
    typeof item.reason !== 'string' || !item.reason.trim() ||
    typeof item.resident_state !== 'string' ||
    !metrics || !isNumber(metrics.power_kw) || !isNumber(metrics.water_lpm) ||
    !isNumber(metrics.inactivity_mins) || !isNumber(metrics.z_score)
  ) {
    throw new FallApiError('The backend returned an unexpected activity-anomaly result.');
  }
  return item as unknown as ActivityAnomalyResult;
}

export async function createActivityAnomalySimulation(): Promise<ActivityAnomalyResult> {
  // One activity-anomaly scenario combines the utility, contact-sensor and
  // inactivity evidence used by Member 2's model.
  const payload = {
    timestamp: new Date().toISOString(),
    power_kw: 0.1,
    water_lpm: 0,
    inactivity_mins: 180,
    door_transitions_15m: 0,
    resident_state: 'HOME',
    resident_id: 'resident-01',
    location: 'living_room',
    simulation: true,
  };

  const result = readActivityResult(await request('/utility-anomaly', payload));
  if (!result.is_anomaly) {
    throw new FallApiError('The backend processed the sample but did not classify it as an anomaly.');
  }
  return result;
}
