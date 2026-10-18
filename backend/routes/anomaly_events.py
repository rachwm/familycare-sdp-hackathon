from fastapi import APIRouter
from pathlib import Path
import uuid

import sys
import os

# Ensure the utility_anomaly module can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from utility_anomaly.anomaly_detector import UtilityAnomalyDetector
from backend.models.events import UtilityPayload, IncidentResponse
from backend.services.websocket_manager import manager

router = APIRouter()
# Load ML Models and Adaptive Baseline once on startup
MODEL_DIR = (
    Path(__file__).resolve().parents[2]
    / "utility_anomaly"
    / "models"
)

detector = UtilityAnomalyDetector(model_dir=str(MODEL_DIR))

@router.post("/utility-anomaly", response_model=IncidentResponse)
async def process_utility_event(payload: UtilityPayload):
    # 1. Run inference (ML + Cold Start Rules)
    result = detector.predict(
        current_time_str=payload.timestamp,
        power_kw=payload.power_kw,
        water_lpm=payload.water_lpm,
        inactivity_mins=payload.inactivity_mins,
        door_transitions_15m=payload.door_transitions_15m,
        resident_state=payload.resident_state
    )
    
    # 2. Package response
    response = IncidentResponse(
        incident_id=str(uuid.uuid4()),
        **result
    )
    
    # 3. If anomaly detected, broadcast immediately via WebSocket
    if response.is_anomaly:
        await manager.broadcast(
            message_type="UTILITY_ANOMALY_ALERT", 
            data=response.dict()
        )
        
    return response
