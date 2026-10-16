from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

try:
    # Used when imported by the FamilyCare backend.
    from .feature_extractor import extract_features
except ImportError:
    # Used when running this file directly.
    from feature_extractor import extract_features


DEFAULT_MODEL_PATH = (
    Path(__file__).resolve().parent
    / "models"
    / "fall_random_forest.joblib"
)


class FallDetector:
    """Load and run the FamilyCare fall-detection model."""

    def __init__(
        self,
        model_path: str | Path = DEFAULT_MODEL_PATH,
    ) -> None:
        self.model_path = Path(model_path)

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Fall model not found: {self.model_path}"
            )

        model_bundle = joblib.load(self.model_path)

        required_bundle_fields = [
            "model",
            "feature_names",
            "threshold",
        ]

        missing_fields = [
            field
            for field in required_bundle_fields
            if field not in model_bundle
        ]

        if missing_fields:
            raise ValueError(
                "Invalid model bundle. Missing fields: "
                f"{missing_fields}"
            )

        self.model = model_bundle["model"]
        self.feature_names = model_bundle["feature_names"]
        self.threshold = float(
            model_bundle["threshold"]
        )

        self.model_version = model_bundle.get(
            "model_version",
            "unknown",
        )

        self.training_recordings = model_bundle.get(
            "training_recordings",
        )

        self.training_subjects = model_bundle.get(
            "training_subjects",
            [],
        )

    def _prepare_feature_table(
        self,
        csv_path: str | Path,
    ) -> tuple[pd.DataFrame, dict[str, float]]:
        """Extract and order features exactly as used in training."""
        extracted_features = extract_features(csv_path)

        missing_features = [
            feature_name
            for feature_name in self.feature_names
            if feature_name not in extracted_features
        ]

        if missing_features:
            raise ValueError(
                "The recording is missing model features: "
                f"{missing_features}"
            )

        ordered_features = {
            feature_name: extracted_features[feature_name]
            for feature_name in self.feature_names
        }

        feature_table = pd.DataFrame(
            [ordered_features],
            columns=self.feature_names,
        ).astype(float)

        if feature_table.isna().any().any():
            raise ValueError(
                "Extracted features contain missing values"
            )

        feature_values = feature_table.to_numpy()

        if not np.isfinite(feature_values).all():
            raise ValueError(
                "Extracted features contain infinite values"
            )

        return feature_table, extracted_features

    def predict(
        self,
        csv_path: str | Path,
    ) -> dict[str, Any]:
        """
        Predict whether one radar recording represents a fall.

        The confidence is a Random Forest model score between
        zero and one. It is not a medically calibrated probability.
        """
        csv_path = Path(csv_path)

        feature_table, extracted_features = (
            self._prepare_feature_table(csv_path)
        )

        probability_columns = self.model.predict_proba(
            feature_table
        )[0]

        model_classes = list(self.model.classes_)

        if 1 not in model_classes:
            raise ValueError(
                "The loaded model does not contain the fall class"
            )

        fall_class_index = model_classes.index(1)

        fall_confidence = float(
            probability_columns[fall_class_index]
        )

        possible_fall = (
            fall_confidence >= self.threshold
        )

        result = {
            "source": "fall_detector",
            "source_file": csv_path.name,
            "model_version": self.model_version,
            "prediction": (
                "possible_fall"
                if possible_fall
                else "not_fall"
            ),
            "possible_fall": bool(possible_fall),
            "confidence": round(fall_confidence, 4),
            "threshold": self.threshold,
            "evidence": {
                "number_of_frames": int(
                    extracted_features.get(
                        "number_of_frames",
                        0,
                    )
                ),
                "total_detected_points": int(
                    extracted_features.get(
                        "total_detected_points",
                        0,
                    )
                ),
                "z_centroid_start": round(
                    extracted_features.get(
                        "z_centroid_start",
                        0.0,
                    ),
                    4,
                ),
                "z_centroid_end": round(
                    extracted_features.get(
                        "z_centroid_end",
                        0.0,
                    ),
                    4,
                ),
                "z_centroid_change": round(
                    extracted_features.get(
                        "z_centroid_change",
                        0.0,
                    ),
                    4,
                ),
                "maximum_downward_z_step": round(
                    extracted_features.get(
                        "maximum_downward_z_step",
                        0.0,
                    ),
                    4,
                ),
                "mean_absolute_velocity": round(
                    extracted_features.get(
                        "absolute_velocity_mean",
                        0.0,
                    ),
                    4,
                ),
                "maximum_absolute_velocity": round(
                    extracted_features.get(
                        "absolute_velocity_max",
                        0.0,
                    ),
                    4,
                ),
                "centroid_path_length": round(
                    extracted_features.get(
                        "centroid_path_length",
                        0.0,
                    ),
                    4,
                ),
            },
        }

        return result

    def health_information(self) -> dict[str, Any]:
        """Return safe model information for a health endpoint."""
        return {
            "status": "ready",
            "model_version": self.model_version,
            "threshold": self.threshold,
            "feature_count": len(self.feature_names),
            "training_recordings": self.training_recordings,
            "training_subjects": self.training_subjects,
        }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Run the FamilyCare Random Forest "
            "fall detector on one radar CSV."
        )
    )

    parser.add_argument(
        "--csv",
        required=True,
        help="Path to one radar recording CSV.",
    )

    parser.add_argument(
        "--model",
        default=str(DEFAULT_MODEL_PATH),
        help="Path to the saved Random Forest model.",
    )

    arguments = parser.parse_args()

    detector = FallDetector(arguments.model)
    result = detector.predict(arguments.csv)

    print(
        json.dumps(
            result,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()