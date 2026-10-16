from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    # Used when imported as part of the fall_detection package.
    from .radar_adapter import (
        DEFAULT_API_URL,
        build_fall_event,
        malaysia_timestamp,
        normalize_location,
        save_json,
        send_fall_event,
        validate_resident_id,
    )
except ImportError:
    # Used when this file is run directly.
    from radar_adapter import (
        DEFAULT_API_URL,
        build_fall_event,
        malaysia_timestamp,
        normalize_location,
        save_json,
        send_fall_event,
        validate_resident_id,
    )


DEFAULT_THRESHOLD = 0.45


SCENARIOS: dict[str, dict[str, Any]] = {
    "fall": {
        "possible_fall": True,
        "confidence": 0.92,
        "reason": (
            "Rapid height reduction followed by a low final "
            "posture and minimal movement."
        ),
        "evidence": {
            "number_of_frames": 30,
            "total_detected_points": 420,
            "z_centroid_start": 1.42,
            "z_centroid_end": 0.24,
            "z_centroid_change": -1.18,
            "maximum_downward_z_step": 0.71,
            "mean_absolute_velocity": 0.36,
            "maximum_absolute_velocity": 1.84,
            "centroid_path_length": 2.17,
            "floor_dwell_seconds": 5.0,
            "post_event_movement": 0.02,
        },
    },
    "false_positive": {
        "possible_fall": True,
        "confidence": 0.62,
        "reason": (
            "A normal controlled movement was intentionally scored "
            "above the threshold to demonstrate resident confirmation."
        ),
        "evidence": {
            "number_of_frames": 32,
            "total_detected_points": 405,
            "z_centroid_start": 1.34,
            "z_centroid_end": 0.52,
            "z_centroid_change": -0.82,
            "maximum_downward_z_step": 0.29,
            "mean_absolute_velocity": 0.22,
            "maximum_absolute_velocity": 0.88,
            "centroid_path_length": 1.46,
            "floor_dwell_seconds": 2.0,
            "post_event_movement": 0.31,
            "simulated_ground_truth": 0,
        },
    },
    "sitting": {
        "possible_fall": False,
        "confidence": 0.18,
        "reason": (
            "Controlled height reduction with continued "
            "movement after sitting."
        ),
        "evidence": {
            "number_of_frames": 30,
            "total_detected_points": 390,
            "z_centroid_start": 1.35,
            "z_centroid_end": 0.88,
            "z_centroid_change": -0.47,
            "maximum_downward_z_step": 0.12,
            "mean_absolute_velocity": 0.11,
            "maximum_absolute_velocity": 0.42,
            "centroid_path_length": 0.74,
            "floor_dwell_seconds": 0.0,
            "post_event_movement": 0.24,
        },
    },
    "lying_down": {
        "possible_fall": False,
        "confidence": 0.29,
        "reason": (
            "Gradual, controlled transition to a lying posture."
        ),
        "evidence": {
            "number_of_frames": 36,
            "total_detected_points": 455,
            "z_centroid_start": 1.30,
            "z_centroid_end": 0.34,
            "z_centroid_change": -0.96,
            "maximum_downward_z_step": 0.16,
            "mean_absolute_velocity": 0.09,
            "maximum_absolute_velocity": 0.38,
            "centroid_path_length": 1.12,
            "floor_dwell_seconds": 5.0,
            "post_event_movement": 0.18,
        },
    },
    "exercise": {
        "possible_fall": False,
        "confidence": 0.34,
        "reason": (
            "High movement was detected, but there was no "
            "sustained low final posture."
        ),
        "evidence": {
            "number_of_frames": 45,
            "total_detected_points": 520,
            "z_centroid_start": 1.28,
            "z_centroid_end": 1.19,
            "z_centroid_change": -0.09,
            "maximum_downward_z_step": 0.31,
            "mean_absolute_velocity": 0.44,
            "maximum_absolute_velocity": 1.52,
            "centroid_path_length": 4.65,
            "floor_dwell_seconds": 0.0,
            "post_event_movement": 0.67,
        },
    },
}


def simulate_scenario(
    scenario: str,
    resident_id: str = "resident-01",
    location: str = "living_room",
    confidence: float | None = None,
) -> dict[str, Any]:
    """Create one deterministic hardware-free simulation result."""
    if scenario not in SCENARIOS:
        raise ValueError(
            f"Unknown scenario: {scenario}. "
            f"Choose from: {', '.join(SCENARIOS)}"
        )

    template = SCENARIOS[scenario]
    simulated_confidence = (
        float(confidence)
        if confidence is not None
        else float(template["confidence"])
    )

    if not 0.0 <= simulated_confidence <= 1.0:
        raise ValueError("Confidence must be between 0 and 1")

    detection = {
        "prediction": (
            "possible_fall"
            if template["possible_fall"]
            else "not_fall"
        ),
        "possible_fall": bool(template["possible_fall"]),
        "confidence": round(simulated_confidence, 4),
        "threshold": DEFAULT_THRESHOLD,
        "model_version": "fall-simulator-v1",
        "source_file": f"simulated_{scenario}.json",
        "evidence": dict(template["evidence"]),
    }

    if detection["possible_fall"]:
        event = build_fall_event(
            detection=detection,
            resident_id=resident_id,
            location=location,
        )
        event["simulation"] = True
        return event

    return {
        "schema_version": "1.0",
        "simulation": True,
        "event_created": False,
        "scenario": scenario,
        "prediction": "not_fall",
        "resident_id": validate_resident_id(resident_id),
        "location": normalize_location(location),
        "confidence": detection["confidence"],
        "decision_threshold": DEFAULT_THRESHOLD,
        "timestamp": malaysia_timestamp(),
        "reason": template["reason"],
        "evidence": detection["evidence"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Simulate FamilyCare radar scenarios without "
            "physical mmWave hardware."
        )
    )

    parser.add_argument(
        "--scenario",
        choices=tuple(SCENARIOS),
        default="fall",
        help="Activity to simulate.",
    )
    parser.add_argument(
        "--resident-id",
        default="resident-01",
        help="Resident associated with the simulated sensor.",
    )
    parser.add_argument(
        "--location",
        default="living_room",
        help="Room in which the simulated sensor is installed.",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        help="Optional confidence override from 0 to 1.",
    )
    parser.add_argument(
        "--output",
        help="Optional path for saving the JSON result.",
    )
    parser.add_argument(
        "--send",
        action="store_true",
        help="Send a simulated fall event to FastAPI.",
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help="FamilyCare fall-event endpoint.",
    )

    arguments = parser.parse_args()

    result = simulate_scenario(
        scenario=arguments.scenario,
        resident_id=arguments.resident_id,
        location=arguments.location,
        confidence=arguments.confidence,
    )

    if arguments.output:
        save_json(result, arguments.output)
        print(
            f"Saved simulation to: "
            f"{Path(arguments.output).resolve()}"
        )

    print("\nSimulation result")
    print("-----------------")
    print(json.dumps(result, indent=2))

    if not arguments.send:
        return

    if result.get("event_type") != "possible_fall":
        print(
            "\nBackend delivery skipped: this normal-activity "
            "scenario did not create a fall event."
        )
        return

    backend_response = send_fall_event(
        event=result,
        api_url=arguments.api_url,
    )

    print("\nBackend response")
    print("----------------")
    print(json.dumps(backend_response, indent=2))


if __name__ == "__main__":
    main()
