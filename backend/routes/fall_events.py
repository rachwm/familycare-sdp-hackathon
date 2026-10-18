from __future__ import annotations

import json

from fastapi import (
    APIRouter,
    HTTPException,
    status,
)

from backend.models.events import (
    FallEvent,
    FallEventAccepted,
    ResidentResponseRequest,
    ResidentResponseResult,
)
from backend.services.incident_manager import (
    DuplicateIncidentError,
    IncidentNotFoundError,
    InvalidIncidentTransitionError,
    incident_manager,
)
from backend.services.websocket_manager import manager


router = APIRouter(
    prefix="/api/fall-events",
    tags=["Fall events"],
)


@router.post(
    "",
    response_model=FallEventAccepted,
    status_code=status.HTTP_201_CREATED,
)
async def create_fall_event(
    event: FallEvent,
) -> FallEventAccepted:
    """Accept a possible-fall event from the detector."""
    try:
        stored_event = incident_manager.create_event(
            event
        )

    except DuplicateIncidentError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    await manager.broadcast(
        message_type="INCIDENT_CREATED",
        data=(
            stored_event.model_dump(mode="json")
            if hasattr(stored_event, "model_dump")
            else json.loads(stored_event.json())
        ),
    )
    return FallEventAccepted(
        accepted=True,
        message=(
            "Possible fall accepted; resident "
            "check-in is required."
        ),
        event=stored_event,
    )


@router.get(
    "",
    response_model=list[FallEvent],
)
def list_fall_events() -> list[FallEvent]:
    """Return all prototype fall incidents."""
    return incident_manager.list_events()


@router.get(
    "/{event_id}",
    response_model=FallEvent,
)
def get_fall_event(
    event_id: str,
) -> FallEvent:
    """Return one fall event by ID."""
    try:
        return incident_manager.get_event(event_id)

    except IncidentNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.post(
    "/{event_id}/response",
    response_model=ResidentResponseResult,
)
async def submit_resident_response(
    event_id: str,
    response: ResidentResponseRequest,
) -> ResidentResponseResult:
    """Apply an elderly resident response or timeout."""
    try:
        updated_event = (
            incident_manager.apply_resident_response(
                event_id=event_id,
                response=response,
            )
        )

    except IncidentNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error

    except InvalidIncidentTransitionError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    messages = {
        "resident_okay": (
            "Resident confirmed they are okay. "
            "The incident has been resolved."
        ),
        "resident_needs_help": (
            "Resident requested help. "
            "The incident has been escalated."
        ),
        "timeout": (
            "Resident did not respond. "
            "The incident has been escalated."
        ),
    }

    await manager.broadcast(
        message_type="INCIDENT_UPDATED",
        data=(
            updated_event.model_dump(mode="json")
            if hasattr(updated_event, "model_dump")
            else json.loads(updated_event.json())
        ),
    )
    return ResidentResponseResult(
        accepted=True,
        action=response.response,
        message=messages[response.response],
        event=updated_event,
    )
