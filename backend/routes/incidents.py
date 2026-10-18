"""Incident status and dashboard-action endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query, status

from backend.models.events import (
    AssignResponderRequest,
    IncidentActionRequest,
    IncidentActionResult,
    IncidentStatus,
    ResidentResponseRequest,
    ResidentResponseResult,
    SafetyEvent,
    UpdateResponderStatusRequest,
    VisitReportRequest,
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


def _event_data(event: SafetyEvent) -> dict:
    return (
        event.model_dump(mode="json")
        if hasattr(event, "model_dump")
        else json.loads(event.json())
    )


@router.get(
    "",
    response_model=list[SafetyEvent],
)
def list_incidents(
    incident_status: IncidentStatus | None = Query(
        default=None,
        alias="status",
    ),
) -> list[SafetyEvent]:
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
    response_model=SafetyEvent,
)
def get_incident_status(event_id: str) -> SafetyEvent:
    """Return the current state of one incident."""

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
async def submit_incident_response(
    event_id: str,
    response: ResidentResponseRequest,
) -> ResidentResponseResult:
    """Apply a Home Companion response to any check-in incident."""

    try:
        updated_event = incident_manager.apply_resident_response(
            event_id=event_id,
            response=response,
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
        "resident_okay": "Resident confirmed they are okay. The incident has been resolved.",
        "resident_needs_help": "Resident requested help. The incident has been escalated.",
        "timeout": "Resident did not respond. The incident has been escalated.",
    }
    await manager.broadcast(
        message_type="INCIDENT_UPDATED",
        data=_event_data(updated_event),
    )
    return ResidentResponseResult(
        accepted=True,
        action=response.response,
        message=messages[response.response],
        event=updated_event,
    )


@router.post(
    "/{event_id}/actions",
    response_model=IncidentActionResult,
)
async def apply_incident_action(
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

    await manager.broadcast(
        message_type="INCIDENT_UPDATED",
        data=_event_data(updated_event),
    )
    return IncidentActionResult(
        accepted=True,
        action=request.action,
        message=messages[request.action],
        event=updated_event,
    )


async def responder_change(event_id, kind, payload, message_type):
    try:
        event = incident_manager.apply_responder_update(event_id, kind, payload)
    except IncidentNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except InvalidIncidentTransitionError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    data = _event_data(event)
    if kind == "assign":
        data["incident_status"] = data["status"]
        data["status"] = "assigned"
    elif kind == "report":
        data.update(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict())
        if event.status != "resolved":
            message_type = "VISIT_REPORT_SUBMITTED"
    await manager.broadcast(message_type=message_type, data=data)
    result = {"status": "success", "event": event}
    if kind == "assign":
        result["message"] = f"Responder {event.responder_name} assigned."
    elif kind == "status":
        result["current_status"] = event.responder_status
    else:
        result["message"] = "Visit report submitted and family updated."
    return result


@router.post("/{event_id}/assign-responder")
async def assign_responder(event_id: str, payload: AssignResponderRequest):
    return await responder_change(event_id, "assign", payload, "RESPONDER_ASSIGNED")


@router.post("/{event_id}/responder-status")
async def update_responder_status(event_id: str, payload: UpdateResponderStatusRequest):
    return await responder_change(event_id, "status", payload, "RESPONDER_STATUS_UPDATE")


@router.post("/{event_id}/visit-report")
async def submit_visit_report(event_id: str, payload: VisitReportRequest):
    return await responder_change(event_id, "report", payload, "INCIDENT_RESOLVED_WITH_REPORT")
