from __future__ import annotations

import argparse
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

try:
    # Used when imported by the backend.
    from .fall_detector import (
        DEFAULT_MODEL_PATH,
        FallDetector,
    )
except ImportError:
    # Used when running this file directly.
    from fall_detector import (
        DEFAULT_MODEL_PATH,
        FallDetector,
    )


MALAYSIA_TIMEZONE = timezone(timedelta(hours=8))

DEFAULT_API_URL = (
    "http://127.0.0.1:8000/api/fall-events"
)


def malaysia_timestamp() -> str:
    """Return an ISO 8601 timestamp in Malaysia time."""
    return datetime.now(
        MALAYSIA_TIMEZONE
    ).isoformat(timespec="seconds")


def normalize_location(location: str) -> str:
    """Convert a room name into API format."""
    normalized = location.strip().lower()
    normalized = re.sub(r"[\s-]+", "_", normalized)
    normalized = re.sub(r"[^a-z0-9_]", "", normalized)

    if not normalized:
        raise ValueError("Location cannot be empty")

    return normalized


def validate_resident_id(resident_id: str) -> str:
    """Validate and normalize a resident identifier."""
    normalized = resident_id.strip().lower()

    if not normalized:
        raise ValueError("Resident ID cannot be empty")

    if not re.fullmatch(
        r"[a-z0-9][a-z0-9_-]*",
        normalized,
    ):
        raise ValueError(
            "Resident ID may only contain letters, "
            "numbers, hyphens and underscores"
        )

    return normalized


def build_fall_event(
    detection: dict[str, Any],
    resident_id: str,
    location: str,
) -> dict[str, Any]:
    """Convert a positive model result into a FamilyCare event."""
    if not detection.get("possible_fall", False):
        raise ValueError(
            "Cannot create a fall event from a "
            "not-fall prediction"
        )

    resident_id = validate_resident_id(resident_id)
    location = normalize_location(location)

    return {
        "schema_version": "1.0",
        "event_id": f"fall-{uuid.uuid4().hex[:12]}",
        "event_type": "possible_fall",
        "source": "fall_detector",
        "resident_id": resident_id,
        "location": location,
        "severity": "warning",
        "status": "awaiting_resident_response",
        "confidence": detection["confidence"],
        "timestamp": malaysia_timestamp(),
        "requires_resident_check_in": True,
        "details": {
            "model_version": detection["model_version"],
            "decision_threshold": detection["threshold"],
            "source_file": detection["source_file"],
            "evidence": detection["evidence"],
        },
    }


def process_radar_recording(
    csv_path: str | Path,
    resident_id: str,
    location: str,
    model_path: str | Path = DEFAULT_MODEL_PATH,
) -> dict[str, Any]:
    """Run the complete radar-to-event pipeline."""
    detector = FallDetector(model_path)
    detection = detector.predict(csv_path)

    if not detection["possible_fall"]:
        return {
            "event_created": False,
            "reason": "fall_score_below_threshold",
            "detection": detection,
        }

    return build_fall_event(
        detection=detection,
        resident_id=resident_id,
        location=location,
    )


def is_fall_event(
    payload: dict[str, Any],
) -> bool:
    """Check whether a payload is a sendable fall event."""
    return (
        payload.get("event_type") == "possible_fall"
        and payload.get("status")
        == "awaiting_resident_response"
    )


def send_fall_event(
    event: dict[str, Any],
    api_url: str = DEFAULT_API_URL,
    timeout_seconds: float = 5.0,
) -> dict[str, Any]:
    """Send one possible-fall event to the backend."""
    if not is_fall_event(event):
        raise ValueError(
            "Only possible-fall events can be sent "
            "to the fall-event endpoint"
        )

    try:
        with httpx.Client(
            timeout=timeout_seconds,
        ) as client:
            response = client.post(
                api_url,
                json=event,
            )

            response.raise_for_status()

    except httpx.HTTPStatusError as error:
        raise RuntimeError(
            "Backend rejected the fall event. "
            f"Status: {error.response.status_code}. "
            f"Response: {error.response.text}"
        ) from error

    except httpx.RequestError as error:
        raise RuntimeError(
            "Could not connect to the FamilyCare backend "
            f"at {api_url}. Make sure the FastAPI server "
            "is running."
        ) from error

    return response.json()


def save_json(
    payload: dict[str, Any],
    output_path: str | Path,
) -> None:
    """Save an event or detection result to a JSON file."""
    output_path = Path(output_path)

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open(
        "w",
        encoding="utf-8",
    ) as output_file:
        json.dump(
            payload,
            output_file,
            indent=2,
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Convert an mmWave radar recording into "
            "a FamilyCare fall event."
        )
    )

    parser.add_argument(
        "--csv",
        required=True,
        help="Path to one mmWave radar CSV recording.",
    )

    parser.add_argument(
        "--resident-id",
        default="resident-01",
        help="Resident associated with the sensor.",
    )

    parser.add_argument(
        "--location",
        default="living_room",
        help="Room in which the sensor is installed.",
    )

    parser.add_argument(
        "--model",
        default=str(DEFAULT_MODEL_PATH),
        help="Path to the trained Random Forest model.",
    )

    parser.add_argument(
        "--output",
        help="Optional path for saving the JSON result.",
    )

    parser.add_argument(
        "--send",
        action="store_true",
        help="Send a possible-fall event to FastAPI.",
    )

    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help="FamilyCare fall-event endpoint.",
    )

    arguments = parser.parse_args()

    result = process_radar_recording(
        csv_path=arguments.csv,
        resident_id=arguments.resident_id,
        location=arguments.location,
        model_path=arguments.model,
    )

    if arguments.output:
        save_json(
            payload=result,
            output_path=arguments.output,
        )

        print(
            f"Saved result to: "
            f"{Path(arguments.output).resolve()}"
        )

    print("\nDetection result")
    print("----------------")
    print(
        json.dumps(
            result,
            indent=2,
        )
    )

    if arguments.send:
        if not is_fall_event(result):
            print(
                "\nBackend delivery skipped: "
                "the recording did not exceed the "
                "fall threshold."
            )
            return

        backend_response = send_fall_event(
            event=result,
            api_url=arguments.api_url,
        )

        print("\nBackend response")
        print("----------------")
        print(
            json.dumps(
                backend_response,
                indent=2,
            )
        )


if __name__ == "__main__":
    main()