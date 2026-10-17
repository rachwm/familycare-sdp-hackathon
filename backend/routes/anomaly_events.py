from pathlib import Path
import uuid

from fastapi import APIRouter

from backend.models.events import IncidentResponse, UtilityPayload
from backend.services.websocket_manager import manager
from utility_anomaly.anomaly_detector import UtilityAnomalyDetector


router = APIRouter()

# Resolve the model directory from the repository root.
MODEL_DIR = (
    Path(__file__).resolve().parents[2]
    / "utility_anomaly"
    / "models"
)

# Load the trained model and adaptive baseline once.
detector = UtilityAnomalyDetector(model_dir=str(MODEL_DIR))


@router.post("/utility-anomaly", response_model=IncidentResponse)
async def process_utility_event(
    payload: UtilityPayload,
) -> IncidentResponse:
    result = detector.predict(
        current_time_str=payload.timestamp,
        power_kw=payload.power_kw,
        water_lpm=payload.water_lpm,
        inactivity_mins=payload.inactivity_mins,
        door_transitions_15m=payload.door_transitions_15m,
        resident_state=payload.resident_state,
    )

    response = IncidentResponse(
        incident_id=str(uuid.uuid4()),
        **result,
    )

    if response.is_anomaly:
        await manager.broadcast(
            message_type="UTILITY_ANOMALY_ALERT",
            data=response.model_dump(),
        )

    return response