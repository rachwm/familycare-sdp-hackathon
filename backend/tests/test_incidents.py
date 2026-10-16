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


def make_fall_event(event_id: str, status: str) -> dict:
    requires_check_in = status == "awaiting_resident_response"

    return {
        "schema_version": "1.0",
        "event_id": event_id,
        "event_type": "possible_fall",
        "source": "fall_detector",
        "resident_id": "resident-01",
        "location": "living_room",
        "severity": "warning",
        "status": status,
        "confidence": 0.82,
        "timestamp": "2026-10-16T10:30:00+08:00",
        "requires_resident_check_in": requires_check_in,
        "details": {
            "model_version": "random-forest-v1",
            "decision_threshold": 0.45,
            "source_file": "test_recording.csv",
            "evidence": {
                "number_of_frames": 24,
                "z_centroid_change": -1.1,
            },
        },
    }


def test_incident_status_endpoint_returns_current_event():
    event = make_fall_event(
        "fall-status-001",
        "awaiting_resident_response",
    )
    create_response = client.post(
        "/api/fall-events",
        json=event,
    )
    assert create_response.status_code == 201

    response = client.get(
        "/api/incidents/fall-status-001"
    )

    assert response.status_code == 200
    assert response.json()["event_id"] == "fall-status-001"
    assert (
        response.json()["status"]
        == "awaiting_resident_response"
    )


def test_incident_list_can_be_filtered_by_status():
    first = make_fall_event(
        "fall-filter-001",
        "awaiting_resident_response",
    )
    second = make_fall_event(
        "fall-filter-002",
        "resolved",
    )

    assert client.post(
        "/api/fall-events",
        json=first,
    ).status_code == 201
    assert client.post(
        "/api/fall-events",
        json=second,
    ).status_code == 201

    response = client.get(
        "/api/incidents",
        params={"status": "resolved"},
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["event_id"] == "fall-filter-002"


def test_unknown_incident_returns_not_found():
    response = client.get(
        "/api/incidents/does-not-exist"
    )

    assert response.status_code == 404


def test_responder_request_requires_escalated_incident():
    event = make_fall_event(
        "fall-action-001",
        "awaiting_resident_response",
    )
    assert client.post(
        "/api/fall-events",
        json=event,
    ).status_code == 201

    response = client.post(
        "/api/incidents/fall-action-001/actions",
        json={"action": "request_responder"},
    )

    assert response.status_code == 409


def test_responder_can_be_requested_after_help_response():
    event = make_fall_event(
        "fall-action-002",
        "awaiting_resident_response",
    )
    assert client.post(
        "/api/fall-events",
        json=event,
    ).status_code == 201
    assert client.post(
        "/api/fall-events/fall-action-002/response",
        json={"response": "resident_needs_help"},
    ).status_code == 200

    response = client.post(
        "/api/incidents/fall-action-002/actions",
        json={"action": "request_responder"},
    )

    assert response.status_code == 200
    updated_event = response.json()["event"]
    assert updated_event["status"] == "resident_needs_help"
    assert updated_event["requires_responder"] is True
    assert updated_event["responder_status"] == "requested"
    assert updated_event["responder_request_timestamp"] is not None


def test_dashboard_can_resolve_incident():
    event = make_fall_event(
        "fall-action-003",
        "awaiting_resident_response",
    )
    assert client.post(
        "/api/fall-events",
        json=event,
    ).status_code == 201
    assert client.post(
        "/api/fall-events/fall-action-003/response",
        json={"response": "timeout"},
    ).status_code == 200
    assert client.post(
        "/api/incidents/fall-action-003/actions",
        json={"action": "request_responder"},
    ).status_code == 200

    response = client.post(
        "/api/incidents/fall-action-003/actions",
        json={"action": "resolve"},
    )

    assert response.status_code == 200
    updated_event = response.json()["event"]
    assert updated_event["status"] == "resolved"
    assert updated_event["requires_responder"] is False
    assert updated_event["responder_status"] == "resolved"
    assert updated_event["resolution_timestamp"] is not None
