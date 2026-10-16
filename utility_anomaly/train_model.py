import os
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from utility_anomaly.adaptive_baseline import AdaptiveCircadianBaseline

def train():
    data_path = "data/utility/processed/training_feature_matrix.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Feature matrix not found at {data_path}. Run feature_engineering.py first.")
        
    df = pd.read_csv(data_path, index_col=0, parse_dates=True)
    
    # Filter for HOME observations only (ignore AWAY periods during training)
    df_home = df[df['resident_state'] == 'HOME'].dropna()
    
    # Selected feature columns
    features = ['power_kw', 'water_lpm', 'inactivity_delta_mins', 'door_transitions_15m', 'sin_time', 'cos_time']
    X = df_home[features]
    
    print(f"Training Isolation Forest on {len(X)} training samples...")
    # Train Isolation Forest model
    model = IsolationForest(
        n_estimators=100,
        contamination=0.03,  # Expect ~3% routine anomalies
        random_state=42
    )
    model.fit(X)
    
    # Fit Adaptive Baseline distribution
    baseline = AdaptiveCircadianBaseline()
    baseline.fit(df_home)
    
    # Save artifacts
    model_dir = "utility_anomaly/models"
    os.makedirs(model_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(model_dir, "utility_isolation_forest.joblib"))
    joblib.dump(baseline, os.path.join(model_dir, "adaptive_baseline.joblib"))
    print("Model and Adaptive Baseline successfully trained and saved!")

if __name__ == "__main__":
    train()