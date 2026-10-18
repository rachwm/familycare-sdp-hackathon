import { FallApiError, request } from './fallApi.ts';

export type UtilitySimulationKind = 'inactivity' | 'utility';

export interface UtilityAnomalyResult {
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

function readUtilityResult(value: unknown): UtilityAnomalyResult {
  if (!value || typeof value !== 'object') {
    throw new FallApiError('The backend returned an unexpected anomaly result.');
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
    throw new FallApiError('The backend returned an unexpected anomaly result.');
  }
  return item as unknown as UtilityAnomalyResult;
}

export async function createUtilitySimulation(
  kind: UtilitySimulationKind,
): Promise<UtilityAnomalyResult> {
  const payload = kind === 'inactivity'
    ? {
        timestamp: new Date().toISOString(),
        power_kw: 0.1,
        water_lpm: 0,
        inactivity_mins: 180,
        door_transitions_15m: 0,
        resident_state: 'HOME',
      }
    : {
        timestamp: new Date().toISOString(),
        power_kw: 0.2,
        water_lpm: 8.5,
        inactivity_mins: 60,
        door_transitions_15m: 0,
        resident_state: 'HOME',
      };

  const result = readUtilityResult(
    await request('/utility-anomaly', payload),
  );
  if (!result.is_anomaly) {
    throw new FallApiError(
      'The backend processed the sample but did not classify it as an anomaly.',
    );
  }
  return result;
}
