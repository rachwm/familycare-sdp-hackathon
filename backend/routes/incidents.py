"""Incident status and dashboard-action endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from backend.models.events import (
    FallEvent,
    IncidentActionRequest,
    IncidentActionResult,
    IncidentStatus,
)
from backend.services.incident_manager import (
    IncidentNotFoundError,
    InvalidIncidentTransitionError,
    incident_manager,
)


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"],
)


@router.get(
    "",
    response_model=list[FallEvent],
)
def list_incidents(
    incident_status: IncidentStatus | None = Query(
        default=None,
        alias="status",
    ),
) -> list[FallEvent]:
    """Return all incidents, optionally filtered by current status."""

    events = incident_manager.list_events()
    if incident_status is None:
        return events

    return [
        event
        for event in events
        if event.status == incident_status
    ]


@router.get(
    "/{event_id}",
    response_model=FallEvent,
)
def get_incident_status(event_id: str) -> FallEvent:
    """Return the current state of one incident."""

    try:
        return incident_manager.get_event(event_id)
    except IncidentNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.post(
    "/{event_id}/actions",
    response_model=IncidentActionResult,
)
def apply_incident_action(
    event_id: str,
    request: IncidentActionRequest,
) -> IncidentActionResult:
    """Request a responder or resolve an incident."""

    try:
        updated_event = incident_manager.apply_incident_action(
            event_id=event_id,
            request=request,
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
        "request_responder": (
            "A responder has been requested for this incident."
        ),
        "resolve": "The incident has been resolved.",
    }

    return IncidentActionResult(
        accepted=True,
        action=request.action,
        message=messages[request.action],
        event=updated_event,
    )
