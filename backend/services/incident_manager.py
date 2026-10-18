from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from warnings import warn

from backend.models.events import (
    FallEvent,
    IncidentActionRequest,
    ResidentResponseRequest,
    RoutineAnomalyEvent,
    SafetyEvent,
)


MALAYSIA_TIMEZONE = timezone(timedelta(hours=8))
DEFAULT_INCIDENT_STORE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "runtime"
    / "incidents.json"
)


class DuplicateIncidentError(Exception):
    """Raised when an event ID already exists."""


class IncidentNotFoundError(Exception):
    """Raised when an event cannot be found."""


class InvalidIncidentTransitionError(Exception):
    """Raised when an incident has already been handled."""


class IncidentManager:
    """Manage prototype incidents and their state changes."""

    def __init__(
        self,
        storage_path: Path | None = DEFAULT_INCIDENT_STORE,
        persistence_enabled: bool | None = None,
    ) -> None:
        self._events: dict[str, SafetyEvent] = {}
        self._storage_path = storage_path
        self._persistence_override = persistence_enabled
        self._load_events()

    def _persistence_enabled(self) -> bool:
        # Automated tests use an isolated in-memory store and cannot pollute
        # the demonstration data saved by a local server.
        if self._persistence_override is not None:
            return self._persistence_override
        return (
            self._storage_path is not None
            and "PYTEST_CURRENT_TEST" not in os.environ
        )

    def _load_events(self) -> None:
        if self._storage_path is None or not self._storage_path.exists():
            return
        try:
            saved = json.loads(self._storage_path.read_text(encoding="utf-8"))
            if not isinstance(saved, list):
                raise ValueError("The incident store must contain a list.")
            for item in saved:
                if not isinstance(item, dict):
                    raise ValueError("Every saved incident must be an object.")
                if item.get("event_type") == "possible_fall":
                    event: SafetyEvent = FallEvent(**item)
                elif item.get("event_type") == "unusual_activity":
                    event = RoutineAnomalyEvent(**item)
                else:
                    raise ValueError("Unknown saved incident type.")
                self._events[event.event_id] = event
        except (OSError, ValueError, TypeError) as error:
            self._events.clear()
            warn(
                f"FamilyCare could not load its saved incidents: {error}",
                RuntimeWarning,
                stacklevel=2,
            )

    def _save_events(self) -> None:
        if not self._persistence_enabled() or self._storage_path is None:
            return
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = self._storage_path.with_suffix(".tmp")
        payload = [
            event.model_dump(mode="json")
            if hasattr(event, "model_dump")
            else json.loads(event.json())
            for event in self._events.values()
        ]
        temporary_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )
        temporary_path.replace(self._storage_path)

    def create_event(
        self,
        event: SafetyEvent,
    ) -> SafetyEvent:
        if event.event_id in self._events:
            raise DuplicateIncidentError(
                f"Event already exists: {event.event_id}"
            )

        self._events[event.event_id] = event
        self._save_events()
        return event

    def list_events(self) -> list[SafetyEvent]:
        return list(self._events.values())

    def clear_events(self) -> int:
        """Remove all saved prototype incidents and return the number cleared."""

        cleared = len(self._events)
        self._events.clear()
        self._save_events()
        return cleared

    def get_event(
        self,
        event_id: str,
    ) -> SafetyEvent:
        event = self._events.get(event_id)

        if event is None:
            raise IncidentNotFoundError(
                f"Incident not found: {event_id}"
            )

        return event

    def apply_resident_response(
        self,
        event_id: str,
        response: ResidentResponseRequest,
    ) -> SafetyEvent:
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
        self._save_events()
        return updated_event

    def apply_incident_action(
        self,
        event_id: str,
        request: IncidentActionRequest,
    ) -> SafetyEvent:
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

            if event.responder_status != "not_requested":
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
        self._save_events()
        return updated_event

    def apply_responder_update(self, event_id: str, kind: str, payload) -> SafetyEvent:
        """Persist the existing responder endpoints in the prototype store."""
        event = self.get_event(event_id)
        if event.status == "resolved" or event.visit_report is not None:
            raise InvalidIncidentTransitionError("This visit is already completed.")
        now = datetime.now(MALAYSIA_TIMEZONE)
        updates = dict(event.responder_updates)
        if kind == "assign":
            if not event.requires_responder or event.responder_id is not None:
                raise InvalidIncidentTransitionError("Incident is not awaiting assignment.")
            changes = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
            changes["responder_status"] = "assigned"
            updates["assigned"] = now
        elif kind == "status":
            previous = {"accepted": "assigned", "on_the_way": "accepted", "arrived": "on_the_way"}
            if not event.responder_id or event.responder_status != previous[payload.responder_status]:
                raise InvalidIncidentTransitionError("Responder status must follow assignment, acceptance, departure and arrival.")
            changes = {"responder_status": payload.responder_status}
            updates[payload.responder_status] = now
        else:
            if not event.responder_id or event.responder_status != "arrived":
                raise InvalidIncidentTransitionError("A visit report requires confirmed arrival.")
            report = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
            report["submitted_at"] = now.isoformat()
            changes = {"visit_report": report}
            if payload.resident_condition == "safe":
                changes.update(status="resolved", responder_status="resolved", requires_responder=False,
                               requires_resident_check_in=False, resolution_timestamp=now)
        changes["responder_updates"] = updates
        updated = event.model_copy(update=changes) if hasattr(event, "model_copy") else event.copy(update=changes)
        self._events[event_id] = updated
        self._save_events()
        return updated


incident_manager = IncidentManager()
