import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

class UtilityAnomalyDetector:
    def __init__(self, model_dir: str = "utility_anomaly/models"):
        self.model = joblib.load(os.path.join(model_dir, "utility_isolation_forest.joblib"))
        self.baseline = joblib.load(os.path.join(model_dir, "adaptive_baseline.joblib"))
        
    def predict(self, current_time_str: str, power_kw: float, water_lpm: float, 
                inactivity_mins: float, door_transitions_15m: int, resident_state: str = "HOME") -> dict:
        """Inference pipeline returning agreed FamilyCare JSON structure."""
        
        # If resident is AWAY, suppress routine anomalies
        if resident_state == "AWAY":
            return {
                "timestamp": current_time_str,
                "is_anomaly": False,
                "confidence": 0.0,
                "reason": "Resident is away from home",
                "resident_state": "AWAY"
            }
            
        dt = pd.to_datetime(current_time_str)
        minute_of_day = dt.hour * 60 + dt.minute
        sin_time = np.sin(2 * np.pi * minute_of_day / 1440.0)
        cos_time = np.cos(2 * np.pi * minute_of_day / 1440.0)
        
        # Feature vector for Isolation Forest
        X_input = pd.DataFrame([[
            power_kw, water_lpm, inactivity_mins, door_transitions_15m, sin_time, cos_time
        ]], columns=['power_kw', 'water_lpm', 'inactivity_delta_mins', 'door_transitions_15m', 'sin_time', 'cos_time'])
        
        # 1. Isolation Forest prediction (-1 = anomaly, 1 = normal)
        ml_pred = self.model.predict(X_input)[0]
        anomaly_score = self.model.score_samples(X_input)[0]  # lower = more anomalous
        
        # 2. Compute dynamic Z-score relative to hourly baseline
        z_score = self.baseline.compute_z_score(dt, inactivity_mins)
        
        # 3. Decision Matrix
        is_anomaly = False
        reason = "Normal activity"
        
        if z_score >= 3.0:
            is_anomaly = True
            reason = f"Circadian Inactivity Anomaly (Z-score: {z_score:.2f}, Inactive for {inactivity_mins:.0f} mins)"
        elif ml_pred == -1 and z_score >= 2.0:
            is_anomaly = True
            reason = f"Multi-sensor pattern anomaly detected (Power: {power_kw} kW, Water: {water_lpm} L/min)"
        elif self.baseline.check_cold_start_rules(inactivity_mins, water_lpm):
            is_anomaly = True
            reason = "Heuristic safety boundary exceeded"
            
        confidence = float(min(1.0, max(0.5, (z_score / 4.0)))) if is_anomaly else 0.0
        
        return {
            "timestamp": current_time_str,
            "is_anomaly": is_anomaly,
            "confidence": round(confidence, 2),
            "reason": reason,
            "metrics": {
                "power_kw": power_kw,
                "water_lpm": water_lpm,
                "inactivity_mins": inactivity_mins,
                "z_score": round(z_score, 2)
            },
            "resident_state": "HOME"
        }