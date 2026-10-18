"""Hardware-free fall scenarios for the React demo interface."""

from __future__ import annotations

import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status

from backend.models.events import FallEvent, IncidentResponse, RoutineAnomalyDetails, RoutineAnomalyEvent
from backend.models.simulator import (
    FallSimulationRequest,
    FallSimulationResponse,
)
from backend.routes.reminders import clear_reminders
from backend.services.incident_manager import MALAYSIA_TIMEZONE, incident_manager
from backend.services.reminder_scheduler import clear_delivered_reminders
from backend.services.websocket_manager import manager
from fall_detection.fall_simulator import simulate_scenario


router = APIRouter(
    prefix="/api/simulator",
    tags=["Sensor simulator"],
)


@router.post("/reset")
async def reset_demo_data() -> dict[str, int | str]:
    """Clear locally saved incidents and reminders before a demo run."""

    incidents_cleared = incident_manager.clear_events()
    reminders_cleared = clear_reminders()
    clear_delivered_reminders()
    result: dict[str, int | str] = {
        "status": "reset",
        "incidents_cleared": incidents_cleared,
        "reminders_cleared": reminders_cleared,
    }
    await manager.broadcast(
        message_type="DEMO_DATA_RESET",
        data=result,
    )
    return result


@router.post("/activity", response_model=IncidentResponse)
async def simulate_activity_anomaly() -> IncidentResponse:
    """Create a guaranteed simulated inactivity alert for end-to-end demos.

    Unlike POST /utility-anomaly, this endpoint does not perform ML inference.
    Real sensor input must continue to use /utility-anomaly.
    """
    now = datetime.now(MALAYSIA_TIMEZONE)
    incident_id = f"activity-{uuid4().hex[:12]}"
    metrics = {
        "power_kw": 0.1,
        "water_lpm": 0.0,
        "inactivity_mins": 180.0,
        "z_score": 4.0,
    }
    reason = "Simulated extended inactivity detected; resident check-in required."
    event = RoutineAnomalyEvent(
        schema_version="1.0",
        event_id=incident_id,
        event_type="unusual_activity",
        source="utility_anomaly_detector",
        anomaly_kind="inactivity",
        resident_id="resident-01",
        location="living_room",
        severity="warning",
        status="awaiting_resident_response",
        confidence=0.95,
        timestamp=now,
        requires_resident_check_in=True,
        simulation=True,
        details=RoutineAnomalyDetails(
            anomaly_kind="inactivity",
            reason=reason,
            resident_state="HOME",
            metrics=metrics,
        ),
    )
    stored_event = incident_manager.create_event(event)
    await manager.broadcast(
        message_type="INCIDENT_CREATED",
        data=(
            stored_event.model_dump(mode="json")
            if hasattr(stored_event, "model_dump")
            else json.loads(stored_event.json())
        ),
    )
    return IncidentResponse(
        incident_id=incident_id,
        timestamp=now.isoformat(),
        is_anomaly=True,
        confidence=0.95,
        reason=reason,
        metrics=metrics,
        resident_state="HOME",
    )


@router.post(
    "/fall",
    response_model=FallSimulationResponse,
)
async def simulate_fall_scenario(
    request: FallSimulationRequest,
) -> FallSimulationResponse:
    """Run one deterministic fall or normal-activity scenario."""

    try:
        result = simulate_scenario(
            scenario=request.scenario,
            resident_id=request.resident_id,
            location=request.location,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    if result.get("event_type") == "possible_fall":
        event = FallEvent(**result)
        stored_event = incident_manager.create_event(event)
        await manager.broadcast(
            message_type="INCIDENT_CREATED",
            data=(
                stored_event.model_dump(mode="json")
                if hasattr(stored_event, "model_dump")
                else json.loads(stored_event.json())
            ),
        )

        messages = {
            "fall": (
                "Simulated fall created; resident check-in is required."
            ),
            "false_positive": (
                "Simulated false positive created; the resident can "
                "confirm they are okay."
            ),
        }

        return FallSimulationResponse(
            scenario=request.scenario,
            event_created=True,
            message=messages[request.scenario],
            event=stored_event,
        )

    return FallSimulationResponse(
        scenario=request.scenario,
        event_created=False,
        message=(
            "The activity remained below the fall threshold, "
            "so no incident was created."
        ),
        detection=result,
    )
