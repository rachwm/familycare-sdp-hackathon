<<<<<<< HEAD
from pydantic import BaseModel
from typing import Dict, Any, Optional

# Incoming sensor payload from the Raspberry Pi
class UtilityPayload(BaseModel):
    timestamp: str
    power_kw: float
    water_lpm: float
    inactivity_mins: float
    door_transitions_15m: int
    resident_state: str = "HOME"

# Outgoing incident response format agreed upon in api-contract.md
class IncidentResponse(BaseModel):
    incident_id: str
    timestamp: str
    is_anomaly: bool
    confidence: float
    reason: str
    metrics: Dict[str, Any]
    resident_state: str

# Reminder schema for medication/routine schedules
class Reminder(BaseModel):
    id: str
    time: str
    message: str
    type: str  # e.g., 'medication', 'hydration', 'routine'
=======
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


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

    # Added after the resident responds or times out.
    resident_response: ResidentResponseType | None = None
    response_timestamp: datetime | None = None
    requires_responder: bool = False
    responder_status: ResponderStatus = "not_requested"
    responder_request_timestamp: datetime | None = None
    resolution_timestamp: datetime | None = None

    details: FallEventDetails


class FallEventAccepted(BaseModel):
    """Response returned after accepting an event."""

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
>>>>>>> ab24e18d6aef4960ef51a9e738e0eedf79783e5b
