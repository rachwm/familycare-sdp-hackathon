import pandas as pd
import numpy as np
from utility_anomaly.anomaly_detector import UtilityAnomalyDetector

def evaluate_model():
    detector = UtilityAnomalyDetector()
    
    # Evaluate anomaly distribution on sample streams
    test_cases = [
        {"time": "2026-10-17 08:00:00", "power": 1.5, "water": 3.0, "inactivity": 0, "transitions": 5, "state": "HOME"},
        {"time": "2026-10-17 10:00:00", "power": 0.1, "water": 0.0, "inactivity": 180, "transitions": 0, "state": "HOME"},
        {"time": "2026-10-17 14:00:00", "power": 0.2, "water": 0.0, "inactivity": 30, "transitions": 1, "state": "HOME"},
        {"time": "2026-10-17 15:00:00", "power": 0.1, "water": 0.0, "inactivity": 240, "transitions": 0, "state": "AWAY"}
    ]
    
    anomalies_detected = 0
    for case in test_cases:
        res = detector.predict(
            case["time"], case["power"], case["water"], 
            case["inactivity"], case["transitions"], case["state"]
        )
        if res["is_anomaly"]:
            anomalies_detected += 1
            
    print(f"Evaluation complete: Detected {anomalies_detected}/{len(test_cases)} anomalies correctly.")

if __name__ == "__main__":
    evaluate_model()