from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

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
    resident_id: str = Field(default="resident-01", min_length=1, max_length=100)
    location: str = Field(default="home", min_length=1, max_length=100)
    simulation: bool = False
    anomaly_kind: Literal["inactivity", "utility"] | None = None


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
    "assigned",
    "accepted",
    "on_the_way",
    "arrived",
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


class CareIncident(BaseModel):
    """State shared by every FamilyCare safety incident."""

    schema_version: Literal["1.0"]

    event_id: str = Field(
        min_length=1,
        max_length=100,
    )

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

    responder_id: str | None = None
    responder_name: str | None = None
    responder_phone: str | None = None
    responder_updates: dict[str, datetime] = Field(default_factory=dict)
    visit_report: dict[str, str] | None = None

class FallEvent(CareIncident):
    """Shared FamilyCare possible-fall event."""

    event_type: Literal["possible_fall"]
    source: Literal["fall_detector"]
    details: FallEventDetails


class RoutineAnomalyDetails(BaseModel):
    """Evidence attached to a utility or inactivity anomaly."""

    anomaly_kind: Literal["inactivity", "utility"]
    reason: str
    resident_state: str
    metrics: dict[str, Any]


class RoutineAnomalyEvent(CareIncident):
    """An unusual routine or utility pattern requiring a check-in."""

    event_type: Literal["unusual_activity"]
    source: Literal["utility_anomaly_detector"]
    anomaly_kind: Literal["inactivity", "utility"]
    details: RoutineAnomalyDetails


SafetyEvent = FallEvent | RoutineAnomalyEvent


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
    event: SafetyEvent


class IncidentActionRequest(BaseModel):
    """Action submitted from a family or responder dashboard."""

    action: IncidentActionType
    timestamp: datetime | None = None


class IncidentActionResult(BaseModel):
    """Result after applying a dashboard action."""

    accepted: bool
    action: IncidentActionType
    message: str
    event: SafetyEvent


class AssignResponderRequest(BaseModel):
    responder_id: str = Field(min_length=1)
    responder_name: str = Field(min_length=1)
    responder_phone: str


class UpdateResponderStatusRequest(BaseModel):
    responder_status: Literal["accepted", "on_the_way", "arrived"]


class VisitReportRequest(BaseModel):
    summary: str = Field(min_length=1, max_length=1000)
    resident_condition: Literal["safe", "needs_further_assistance"]
    action_taken: str = Field(min_length=1, max_length=1000)
