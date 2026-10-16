from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.incident_manager import incident_manager


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_incidents():
    """Give every test an empty incident store."""
    incident_manager._events.clear()

    yield

    incident_manager._events.clear()


def make_fall_event(
    event_id: str = "fall-test-001",
) -> dict:
    """Create a valid fall event for API testing."""
    return {
        "schema_version": "1.0",
        "event_id": event_id,
        "event_type": "possible_fall",
        "source": "fall_detector",
        "resident_id": "resident-01",
        "location": "living_room",
        "severity": "warning",
        "status": "awaiting_resident_response",
        "confidence": 0.82,
        "timestamp": "2026-10-16T10:30:00+08:00",
        "requires_resident_check_in": True,
        "details": {
            "model_version": "random-forest-v1",
            "decision_threshold": 0.45,
            "source_file": "test_recording.csv",
            "evidence": {
                "number_of_frames": 24,
                "z_centroid_change": -1.1,
                "maximum_absolute_velocity": 1.8,
            },
        },
    }


def create_test_event(
    event_id: str = "fall-test-001",
) -> dict:
    response = client.post(
        "/api/fall-events",
        json=make_fall_event(event_id),
    )

    assert response.status_code == 201
    return response.json()


def test_accepts_valid_fall_event():
    response = client.post(
        "/api/fall-events",
        json=make_fall_event(),
    )

    assert response.status_code == 201

    body = response.json()

    assert body["accepted"] is True
    assert body["event"]["event_type"] == "possible_fall"
    assert (
        body["event"]["status"]
        == "awaiting_resident_response"
    )
    assert (
        body["event"]["requires_resident_check_in"]
        is True
    )
    assert body["event"]["requires_responder"] is False


def test_rejects_invalid_confidence():
    event = make_fall_event()
    event["confidence"] = 1.5

    response = client.post(
        "/api/fall-events",
        json=event,
    )

    assert response.status_code == 422


def test_rejects_duplicate_event_id():
    event = make_fall_event()

    first_response = client.post(
        "/api/fall-events",
        json=event,
    )

    second_response = client.post(
        "/api/fall-events",
        json=event,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_resident_okay_resolves_incident():
    event = create_test_event()
    event_id = event["event"]["event_id"]

    response = client.post(
        f"/api/fall-events/{event_id}/response",
        json={"response": "resident_okay"},
    )

    assert response.status_code == 200

    updated_event = response.json()["event"]

    assert updated_event["status"] == "resolved"
    assert updated_event["severity"] == "warning"
    assert (
        updated_event["resident_response"]
        == "resident_okay"
    )
    assert (
        updated_event["requires_resident_check_in"]
        is False
    )
    assert updated_event["requires_responder"] is False


def test_resident_needs_help_escalates_incident():
    event = create_test_event()
    event_id = event["event"]["event_id"]

    response = client.post(
        f"/api/fall-events/{event_id}/response",
        json={"response": "resident_needs_help"},
    )

    assert response.status_code == 200

    updated_event = response.json()["event"]

    assert (
        updated_event["status"]
        == "resident_needs_help"
    )
    assert updated_event["severity"] == "critical"
    assert (
        updated_event["resident_response"]
        == "resident_needs_help"
    )
    assert updated_event["requires_responder"] is True


def test_timeout_escalates_incident():
    event = create_test_event()
    event_id = event["event"]["event_id"]

    response = client.post(
        f"/api/fall-events/{event_id}/response",
        json={"response": "timeout"},
    )

    assert response.status_code == 200

    updated_event = response.json()["event"]

    assert updated_event["status"] == "no_response"
    assert updated_event["severity"] == "critical"
    assert updated_event["resident_response"] == "timeout"
    assert updated_event["requires_responder"] is True


def test_incident_cannot_receive_two_responses():
    event = create_test_event()
    event_id = event["event"]["event_id"]

    first_response = client.post(
        f"/api/fall-events/{event_id}/response",
        json={"response": "resident_okay"},
    )

    second_response = client.post(
        f"/api/fall-events/{event_id}/response",
        json={"response": "resident_needs_help"},
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 409


def test_simulation_flag_is_preserved():
    event = make_fall_event("fall-simulation-001")
    event["simulation"] = True

    response = client.post(
        "/api/fall-events",
        json=event,
    )

    assert response.status_code == 201
    assert response.json()["event"]["simulation"] is True
