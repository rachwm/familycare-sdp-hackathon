import os
import pandas as pd
import numpy as np

def load_and_clean_electricity(elec_path: str) -> pd.DataFrame:
    """Reads Electricity_P.csv and converts WHE (Watts) to Active Power (kW)."""
    df = pd.read_csv(elec_path)
    # Parse UNIX Timestamp
    df['timestamp'] = pd.to_datetime(df['UNIX_TS'], unit='s')
    df = df.set_index('timestamp').sort_index()
    
    # WHE is Whole House Electricity in Watts -> convert to kW
    df['power_kw'] = df['WHE'] / 1000.0
    
    # Resample to 1-minute intervals (take mean power)
    df_1m = df[['power_kw']].resample('1min').mean().fillna(0.0)
    return df_1m

def load_and_clean_water(water_path: str) -> pd.DataFrame:
    """Reads Water_WHW.csv and extracts water flow rate (L/min)."""
    df = pd.read_csv(water_path)
    df['timestamp'] = pd.to_datetime(df['unix_ts'], unit='s')
    df = df.set_index('timestamp').sort_index()
    
    # avg_rate or inst_rate represents current water flow rate
    df['water_lpm'] = df['avg_rate'].fillna(0.0)
    
    # Resample to 1-minute intervals
    df_1m = df[['water_lpm']].resample('1min').mean().fillna(0.0)
    return df_1m

def load_and_clean_casas(casas_path: str) -> pd.DataFrame:
    """Reads CASAS mv001.txt timestamped door/motion logs."""
    # File has no header: Date, Time, Sensor, State
    df = pd.read_csv(
        casas_path, 
        header=None, 
        names=['date', 'time', 'sensor', 'state'],
        sep=','
    )
    # Added format='mixed' to handle varying microsecond formats
    df['timestamp'] = pd.to_datetime(df['date'] + ' ' + df['time'], format='mixed')
    df = df.set_index('timestamp').sort_index()
    df['state'] = df['state'].str.strip().str.upper()
    df['sensor'] = df['sensor'].str.strip()
    return df[['sensor', 'state']]

def ingest_all(elec_file: str, water_file: str, casas_file: str, output_path: str):
    """Parses and merges all raw files into a single unified raw matrix."""
    print("Ingesting Electricity...")
    df_elec = load_and_clean_electricity(elec_file)
    
    print("Ingesting Water...")
    df_water = load_and_clean_water(water_file)
    
    print("Ingesting CASAS Contact Sensors...")
    df_casas = load_and_clean_casas(casas_file)
    
    # Align date range across datasets
    start_time = max(df_elec.index.min(), df_water.index.min())
    end_time = min(df_elec.index.max(), df_water.index.max())
    
    df_elec = df_elec.loc[start_time:end_time]
    df_water = df_water.loc[start_time:end_time]
    
    # Merge utility metrics
    df_merged = df_elec.join(df_water, how='outer').fillna(0.0)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_merged.to_csv(output_path)
    df_casas.to_csv(os.path.join(os.path.dirname(output_path), 'processed_casas_events.csv'))
    print(f"Successfully ingested and merged data -> {output_path}")

if __name__ == "__main__":
    DATA_DIR = "data/utility/raw"
    OUT_DIR = "data/utility/processed"
    
    ingest_all(
        elec_file=os.path.join(DATA_DIR, "Electricity_P.csv"),
        water_file=os.path.join(DATA_DIR, "Water_WHW.csv"),
        casas_file=os.path.join(DATA_DIR, "mv001.csv"),
        output_path=os.path.join(OUT_DIR, "merged_utility_raw.csv")
    )