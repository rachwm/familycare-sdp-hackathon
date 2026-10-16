import pandas as pd
import numpy as np

class AdaptiveCircadianBaseline:
    def __init__(self, cold_start_days: int = 7):
        self.cold_start_days = cold_start_days
        self.hourly_stats = {}  # {hour: (mean, std)}
        
    def fit(self, df: pd.DataFrame):
        """Fits hourly inactivity distribution parameters over historical data."""
        df['hour'] = df.index.hour
        
        for hour in range(24):
            hour_data = df[df['hour'] == hour]['inactivity_delta_mins']
            if len(hour_data) > 0:
                mean = hour_data.mean()
                std = hour_data.std() if hour_data.std() > 0 else 5.0
            else:
                mean, std = 30.0, 15.0  # Safe defaults
            self.hourly_stats[hour] = (mean, std)
            
    def compute_z_score(self, current_time: pd.Timestamp, inactivity_mins: float) -> float:
        """Calculates dynamic Z-score relative to the resident's historical hour profile."""
        hour = current_time.hour
        mean, std = self.hourly_stats.get(hour, (30.0, 15.0))
        
        # Z-Score formula: Z = (X - μ) / σ
        z_score = (inactivity_mins - mean) / std
        return max(0.0, float(z_score))
    
    def check_cold_start_rules(self, inactivity_mins: float, water_lpm: float) -> bool:
        """Rule-based fallback checks during initial deployment or system cold-start."""
        # Rule 1: Absolute max daytime inactivity threshold (120 mins continuous)
        if inactivity_mins > 120.0:
            return True
        # Rule 2: Unattended continuous water leakage (e.g., pipe burst > 45 mins)
        if water_lpm > 5.0 and inactivity_mins > 45.0:
            return True
        return False