import pandas as pd
import numpy as np

def encode_cyclic_time(df: pd.DataFrame) -> pd.DataFrame:
    """Encodes clock time (0..1439 mins) into smooth sin/cos harmonic coordinates."""
    minutes = df.index.hour * 60 + df.index.minute
    df['sin_time'] = np.sin(2 * np.pi * minutes / 1440.0)
    df['cos_time'] = np.cos(2 * np.pi * minutes / 1440.0)
    return df

def build_feature_matrix(utility_csv: str, casas_csv: str, output_csv: str):
    """Combines utility streams, contact sensor features, and time encodings."""
    df_util = pd.read_csv(utility_csv, index_col='timestamp', parse_dates=True)
    df_casas = pd.read_csv(casas_csv, index_col='timestamp', parse_dates=True)
    
    # Cyclic time features
    df_util = encode_cyclic_time(df_util)
    
    # Process contact sensor inactivity vectors
    from utility_anomaly.contact_sensor_processor import ContactSensorProcessor
    processor = ContactSensorProcessor()
    df_sensor_features = processor.process_events_to_minute_features(df_casas, df_util.index)
    
    # Merge into training feature matrix
    df_features = df_util.join(df_sensor_features)
    
    # Save training dataset
    df_features.to_csv(output_csv)
    print(f"Feature engineering complete -> {output_csv}")

if __name__ == "__main__":
    build_feature_matrix(
        utility_csv="data/utility/processed/merged_utility_raw.csv",
        casas_csv="data/utility/processed/processed_casas_events.csv",
        output_csv="data/utility/processed/training_feature_matrix.csv"
    )