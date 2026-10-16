import pandas as pd
import numpy as np

class ContactSensorProcessor:
    def __init__(self, main_door_sensor: str = "FrontDoor"):
        self.main_door_sensor = main_door_sensor
        self.last_activity_time = None
        self.resident_state = "HOME"  # HOME or AWAY
        
    def process_events_to_minute_features(self, casas_df: pd.DataFrame, time_index: pd.DatetimeIndex) -> pd.DataFrame:
        """Transforms discrete event logs into continuous 1-minute sliding features."""
        feature_df = pd.DataFrame(index=time_index)
        
        # Track continuous minutes since last physical movement
        inactivity_deltas = []
        transitions_15m = []
        resident_states = []
        
        # Binary event timestamps
        event_times = casas_df.index
        
        current_inactivity = 0
        door_activity_window = []
        
        for idx in time_index:
            # Check for events in the last 1 minute
            recent_events = casas_df.loc[idx - pd.Timedelta(minutes=1):idx]
            
            if len(recent_events) > 0:
                current_inactivity = 0
                self.last_activity_time = idx
                
                # Away-State Logic: Main Door opened & no subsequent indoor motion
                main_door_triggers = recent_events[recent_events['sensor'] == self.main_door_sensor]
                if len(main_door_triggers) > 0:
                    last_state = main_door_triggers.iloc[-1]['state']
                    if last_state == 'OFF':  # Closed
                        self.resident_state = "AWAY"
                    else:
                        self.resident_state = "HOME"
            else:
                current_inactivity += 1
                
            # If indoor movement occurs, override AWAY to HOME
            if self.resident_state == "AWAY" and len(recent_events) > 0:
                non_main_events = recent_events[recent_events['sensor'] != self.main_door_sensor]
                if len(non_main_events) > 0:
                    self.resident_state = "HOME"
            
            # Count sensor state transitions in trailing 15 mins
            window_15m_events = casas_df.loc[idx - pd.Timedelta(minutes=15):idx]
            
            inactivity_deltas.append(current_inactivity)
            transitions_15m.append(len(window_15m_events))
            resident_states.append(self.resident_state)
            
        feature_df['inactivity_delta_mins'] = inactivity_deltas
        feature_df['door_transitions_15m'] = transitions_15m
        feature_df['resident_state'] = resident_states
        
        return feature_df