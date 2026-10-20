import os
import uuid

from fastapi import APIRouter

from backend.models.events import (
    IncidentResponse,
    RoutineAnomalyDetails,
    RoutineAnomalyEvent,
    UtilityPayload,
)
from backend.services.incident_manager import incident_manager
from backend.services.websocket_manager import manager
from utility_anomaly.anomaly_detector import UtilityAnomalyDetector


router = APIRouter()

# Build an absolute path so the model loads regardless of the launch directory.
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "utility_anomaly", "models"))

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

    incident_id = str(uuid.uuid4())
    response = IncidentResponse(
        incident_id=incident_id,
        **result,
    )

    if response.is_anomaly:
        anomaly_kind = payload.anomaly_kind or (
            "inactivity"
            if payload.inactivity_mins >= 120
            else "utility"
        )
        event = RoutineAnomalyEvent(
            schema_version="1.0",
            event_id=incident_id,
            event_type="unusual_activity",
            source="utility_anomaly_detector",
            anomaly_kind=anomaly_kind,
            resident_id=payload.resident_id,
            location=payload.location,
            severity="warning",
            status="awaiting_resident_response",
            confidence=response.confidence,
            timestamp=response.timestamp,
            requires_resident_check_in=True,
            simulation=payload.simulation,
            details=RoutineAnomalyDetails(
                anomaly_kind=anomaly_kind,
                reason=response.reason,
                resident_state=response.resident_state,
                metrics=response.metrics,
            ),
        )
        stored_event = incident_manager.create_event(event)
        await manager.broadcast(
            message_type="INCIDENT_CREATED",
            data=(
                stored_event.model_dump(mode="json")
                if hasattr(stored_event, "model_dump")
                else stored_event.dict()
            ),
        )

    return response
