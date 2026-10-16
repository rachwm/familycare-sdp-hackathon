import time
import json
from datetime import datetime
from utility_anomaly.anomaly_detector import UtilityAnomalyDetector

def run_simulation():
    detector = UtilityAnomalyDetector()
    
    print("=== Starting Real-Time Utility & Routine Anomaly Simulator ===")
    
    # Test Scenarios
    scenarios = [
        # Normal morning activity
        {"time": "2026-10-16 08:30:00", "power": 1.2, "water": 4.5, "inactivity": 5, "transitions": 6, "state": "HOME"},
        # Normal afternoon nap
        {"time": "2026-10-16 14:00:00", "power": 0.2, "water": 0.0, "inactivity": 45, "transitions": 0, "state": "HOME"},
        # Emergency: Excessive morning inactivity (Senior fell or trapped)
        {"time": "2026-10-16 10:30:00", "power": 0.1, "water": 0.0, "inactivity": 180, "transitions": 0, "state": "HOME"},
        # Away state: High inactivity but senior is out
        {"time": "2026-10-16 11:00:00", "power": 0.1, "water": 0.0, "inactivity": 200, "transitions": 0, "state": "AWAY"}
    ]
    
    for item in scenarios:
        result = detector.predict(
            current_time_str=item["time"],
            power_kw=item["power"],
            water_lpm=item["water"],
            inactivity_mins=item["inactivity"],
            door_transitions_15m=item["transitions"],
            resident_state=item["state"]
        )
        print(f"\n[Simulated Event @ {item['time']}]")
        print(json.dumps(result, indent=2))
        time.sleep(1)

if __name__ == "__main__":
    run_simulation()