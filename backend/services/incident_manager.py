from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.models.events import (
    FallEvent,
    IncidentActionRequest,
    ResidentResponseRequest,
)


MALAYSIA_TIMEZONE = timezone(timedelta(hours=8))


class DuplicateIncidentError(Exception):
    """Raised when an event ID already exists."""


class IncidentNotFoundError(Exception):
    """Raised when an event cannot be found."""


class InvalidIncidentTransitionError(Exception):
    """Raised when an incident has already been handled."""


class IncidentManager:
    """Manage prototype incidents and their state changes."""

    def __init__(self) -> None:
        self._events: dict[str, FallEvent] = {}

    def create_event(
        self,
        event: FallEvent,
    ) -> FallEvent:
        if event.event_id in self._events:
            raise DuplicateIncidentError(
                f"Event already exists: {event.event_id}"
            )

        self._events[event.event_id] = event
        return event

    def list_events(self) -> list[FallEvent]:
        return list(self._events.values())

    def get_event(
        self,
        event_id: str,
    ) -> FallEvent:
        event = self._events.get(event_id)

        if event is None:
            raise IncidentNotFoundError(
                f"Fall event not found: {event_id}"
            )

        return event

    def apply_resident_response(
        self,
        event_id: str,
        response: ResidentResponseRequest,
    ) -> FallEvent:
        event = self.get_event(event_id)

        if (
            event.status
            != "awaiting_resident_response"
        ):
            raise InvalidIncidentTransitionError(
                "This incident has already been handled. "
                f"Current status: {event.status}"
            )

        response_timestamp = (
            response.timestamp
            or datetime.now(MALAYSIA_TIMEZONE)
        )

        if response.response == "resident_okay":
            changes = {
                "status": "resolved",
                "severity": "warning",
                "requires_resident_check_in": False,
                "resident_response": "resident_okay",
                "response_timestamp": response_timestamp,
                "requires_responder": False,
                "resolution_timestamp": response_timestamp,
            }

        elif response.response == "resident_needs_help":
            changes = {
                "status": "resident_needs_help",
                "severity": "critical",
                "requires_resident_check_in": False,
                "resident_response": (
                    "resident_needs_help"
                ),
                "response_timestamp": response_timestamp,
                "requires_responder": True,
            }

        elif response.response == "timeout":
            changes = {
                "status": "no_response",
                "severity": "critical",
                "requires_resident_check_in": False,
                "resident_response": "timeout",
                "response_timestamp": response_timestamp,
                "requires_responder": True,
            }

        else:
            raise ValueError(
                f"Unsupported response: "
                f"{response.response}"
            )

        # Pydantic v2 uses model_copy.
        # The fallback supports Pydantic v1.
        if hasattr(event, "model_copy"):
            updated_event = event.model_copy(
                update=changes,
            )
        else:
            updated_event = event.copy(
                update=changes,
            )

        self._events[event_id] = updated_event
        return updated_event

    def apply_incident_action(
        self,
        event_id: str,
        request: IncidentActionRequest,
    ) -> FallEvent:
        """Apply an action from the family or responder dashboard."""

        event = self.get_event(event_id)
        action_timestamp = (
            request.timestamp
            or datetime.now(MALAYSIA_TIMEZONE)
        )

        if event.status == "resolved":
            raise InvalidIncidentTransitionError(
                "This incident is already resolved."
            )

        if request.action == "request_responder":
            if not event.requires_responder:
                raise InvalidIncidentTransitionError(
                    "A responder can only be requested after "
                    "the incident has been escalated."
                )

            if event.responder_status == "requested":
                raise InvalidIncidentTransitionError(
                    "A responder has already been requested."
                )

            changes = {
                "responder_status": "requested",
                "responder_request_timestamp": action_timestamp,
            }

        elif request.action == "resolve":
            changes = {
                "status": "resolved",
                "requires_resident_check_in": False,
                "requires_responder": False,
                "responder_status": "resolved",
                "resolution_timestamp": action_timestamp,
            }

        else:
            raise ValueError(
                f"Unsupported incident action: {request.action}"
            )

        if hasattr(event, "model_copy"):
            updated_event = event.model_copy(update=changes)
        else:
            updated_event = event.copy(update=changes)

        self._events[event_id] = updated_event
        return updated_event


incident_manager = IncidentManager()
