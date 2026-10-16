"""Hardware-free fall scenarios for the React demo interface."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from backend.models.events import FallEvent
from backend.models.simulator import (
    FallSimulationRequest,
    FallSimulationResponse,
)
from backend.services.incident_manager import incident_manager
from fall_detection.fall_simulator import simulate_scenario


router = APIRouter(
    prefix="/api/simulator",
    tags=["Sensor simulator"],
)


@router.post(
    "/fall",
    response_model=FallSimulationResponse,
)
def simulate_fall_scenario(
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
