from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional, Dict

from pydantic import BaseModel, Field


# ============================================================
# Utility anomaly models — Member 2
# ============================================================


class UtilityPayload(BaseModel):
    """Incoming utility-sensor payload from the Raspberry Pi."""

    timestamp: str
    power_kw: float
    water_lpm: float
    inactivity_mins: float
    door_transitions_15m: int
    resident_state: str = "HOME"


class IncidentResponse(BaseModel):
    """Utility-anomaly result returned by the detection pipeline."""

    incident_id: str
    timestamp: str
    is_anomaly: bool
    confidence: float
    reason: str
    metrics: dict[str, Any]
    resident_state: str


class Reminder(BaseModel):
    """Medication or routine reminder."""

    id: str
    time: str
    message: str
    type: str


# ============================================================
# Fall and incident models — Member 1
# ============================================================


ResidentResponseType = Literal[
    "resident_okay",
    "resident_needs_help",
    "timeout",
]

IncidentActionType = Literal[
    "request_responder",
    "resolve",
]

ResponderStatus = Literal[
    "not_requested",
    "requested",
    "resolved",
]

IncidentStatus = Literal[
    "awaiting_resident_response",
    "resident_needs_help",
    "no_response",
    "resolved",
]


class FallEventDetails(BaseModel):
    """Technical evidence attached to a fall event."""

    model_version: str

    decision_threshold: float = Field(
        ge=0.0,
        le=1.0,
    )

    source_file: str
    evidence: dict[str, float | int]


class FallEvent(BaseModel):
    """Shared FamilyCare possible-fall event."""

    schema_version: Literal["1.0"]

    event_id: str = Field(
        min_length=1,
        max_length=100,
    )

    event_type: Literal["possible_fall"]
    source: Literal["fall_detector"]

    resident_id: str = Field(
        min_length=1,
        max_length=100,
    )

    location: str = Field(
        min_length=1,
        max_length=100,
    )

    severity: Literal[
        "warning",
        "critical",
    ]

    status: IncidentStatus

    confidence: float = Field(
        ge=0.0,
        le=1.0,
    )

    timestamp: datetime
    requires_resident_check_in: bool
    simulation: bool = False

    resident_response: ResidentResponseType | None = None
    response_timestamp: datetime | None = None
    requires_responder: bool = False
    responder_status: ResponderStatus = "not_requested"
    responder_request_timestamp: datetime | None = None
    resolution_timestamp: datetime | None = None

    details: FallEventDetails


class FallEventAccepted(BaseModel):
    """Response returned after accepting a fall event."""

    accepted: bool
    message: str
    event: FallEvent


class ResidentResponseRequest(BaseModel):
    """Response submitted by the Home Companion."""

    response: ResidentResponseType
    timestamp: datetime | None = None


class ResidentResponseResult(BaseModel):
    """Result after applying a resident response."""

    accepted: bool
    action: ResidentResponseType
    message: str
    event: FallEvent


class IncidentActionRequest(BaseModel):
    """Action submitted from a family or responder dashboard."""

    action: IncidentActionType
    timestamp: datetime | None = None


class IncidentActionResult(BaseModel):
    """Result after applying a dashboard action."""

    accepted: bool
    action: IncidentActionType
    message: str
    event: FallEvent

# Responder Assignment Payload
class AssignResponderRequest(BaseModel):
    responder_id: str
    responder_name: str
    responder_phone: str

# Responder Status Update Payload
class UpdateResponderStatusRequest(BaseModel):
    responder_status: str  # 'accepted', 'on_the_way', 'arrived'

# Responder Visit Report Submission
class VisitReportRequest(BaseModel):
    summary: str
    resident_condition: str  # 'safe', 'transported_to_clinic', 'minor_injury'
    action_taken: str