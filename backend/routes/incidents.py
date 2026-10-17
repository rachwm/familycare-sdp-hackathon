"""Incident status and dashboard-action endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from backend.models.events import (
    FallEvent,
    IncidentActionRequest,
    IncidentActionResult,
    IncidentStatus,
    AssignResponderRequest,
    UpdateResponderStatusRequest,
    VisitReportRequest
)
from backend.services.incident_manager import (
    IncidentNotFoundError,
    InvalidIncidentTransitionError,
    incident_manager,
)

from backend.services.websocket_manager import manager

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

# 1. Assign Responder to Incident
@router.post("/api/incidents/{event_id}/assign-responder")
async def assign_responder(event_id: str, payload: AssignResponderRequest):
    # Broadcast status change to family dashboard via WebSocket
    await manager.broadcast(
        message_type="RESPONDER_ASSIGNED",
        data={
            "event_id": event_id,
            "responder_name": payload.responder_name,
            "responder_phone": payload.responder_phone,
            "status": "assigned"
        }
    )
    return {"status": "success", "message": f"Responder {payload.responder_name} assigned."}

# 2. Update Responder Status (accepted, on_the_way, arrived)
@router.post("/api/incidents/{event_id}/responder-status")
async def update_responder_status(event_id: str, payload: UpdateResponderStatusRequest):
    await manager.broadcast(
        message_type="RESPONDER_STATUS_UPDATE",
        data={
            "event_id": event_id,
            "responder_status": payload.responder_status
        }
    )
    return {"status": "success", "current_status": payload.responder_status}

# 3. Submit Visit Report & Resolve Incident
@router.post("/api/incidents/{event_id}/visit-report")
async def submit_visit_report(event_id: str, payload: VisitReportRequest):
    await manager.broadcast(
        message_type="INCIDENT_RESOLVED_WITH_REPORT",
        data={
            "event_id": event_id,
            "summary": payload.summary,
            "resident_condition": payload.resident_condition,
            "action_taken": payload.action_taken,
            "status": "resolved"
        }
    )
    return {"status": "success", "message": "Visit report submitted and family updated."}