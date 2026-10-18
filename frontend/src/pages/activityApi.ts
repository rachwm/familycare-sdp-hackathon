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
  // Deterministic demo injection: records an inactivity alert in the same
  // backend incident store used by Home Companion, Family and Coordinator.
  // Genuine sensor inference remains available through POST /utility-anomaly.
  const result = readActivityResult(await request('/api/simulator/activity', {}));
  if (!result.is_anomaly) {
    throw new FallApiError('The simulator did not create a confirmed activity anomaly.');
  }
  return result;
}
