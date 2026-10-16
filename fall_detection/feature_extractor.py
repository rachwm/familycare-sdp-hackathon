from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


REQUIRED_COLUMNS = [
    "frame",
    "DetObj#",
    "x",
    "y",
    "z",
    "v",
    "snr",
    "noise",
]

METADATA_COLUMNS = [
    "source_file",
    "subject",
    "activity",
    "class_name",
    "label",
]


def _finite(values) -> np.ndarray:
    """Return only finite numerical values."""
    array = np.asarray(values, dtype=float)
    return array[np.isfinite(array)]


def _basic_statistics(values, prefix: str) -> dict[str, float]:
    """Calculate summary statistics for one numerical series."""
    array = _finite(values)

    if len(array) == 0:
        return {
            f"{prefix}_mean": 0.0,
            f"{prefix}_std": 0.0,
            f"{prefix}_min": 0.0,
            f"{prefix}_max": 0.0,
        }

    return {
        f"{prefix}_mean": float(np.mean(array)),
        f"{prefix}_std": float(np.std(array)),
        f"{prefix}_min": float(np.min(array)),
        f"{prefix}_max": float(np.max(array)),
    }


def _temporal_statistics(values, prefix: str) -> dict[str, float]:
    """
    Describe how a frame-level measurement changes over time.

    The first and last 20% of frames are used instead of only one
    frame so that individual noisy frames have less influence.
    """
    array = _finite(values)

    if len(array) == 0:
        return {
            f"{prefix}_start": 0.0,
            f"{prefix}_end": 0.0,
            f"{prefix}_change": 0.0,
            f"{prefix}_range": 0.0,
            f"{prefix}_std": 0.0,
            f"{prefix}_slope": 0.0,
            f"{prefix}_max_step": 0.0,
        }

    window_size = max(1, int(np.ceil(len(array) * 0.20)))

    start = float(np.median(array[:window_size]))
    end = float(np.median(array[-window_size:]))

    if len(array) >= 2:
        slope = float(
            np.polyfit(np.arange(len(array)), array, 1)[0]
        )
        maximum_step = float(np.max(np.abs(np.diff(array))))
    else:
        slope = 0.0
        maximum_step = 0.0

    return {
        f"{prefix}_start": start,
        f"{prefix}_end": end,
        f"{prefix}_change": end - start,
        f"{prefix}_range": float(np.max(array) - np.min(array)),
        f"{prefix}_std": float(np.std(array)),
        f"{prefix}_slope": slope,
        f"{prefix}_max_step": maximum_step,
    }


def _point_cloud_extent(values) -> float:
    """
    Calculate a robust point-cloud extent.

    The 90th-to-10th percentile range is less affected by noisy
    radar points than maximum minus minimum.
    """
    array = _finite(values)

    if len(array) == 0:
        return 0.0

    return float(np.quantile(array, 0.90) - np.quantile(array, 0.10))


def extract_features(csv_path: str | Path) -> dict[str, float]:
    """Extract one fixed feature row from one radar recording."""
    csv_path = Path(csv_path)

    if not csv_path.exists():
        raise FileNotFoundError(f"Radar CSV not found: {csv_path}")

    radar = pd.read_csv(csv_path)

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in radar.columns
    ]

    if missing_columns:
        raise ValueError(
            f"{csv_path.name} is missing columns: {missing_columns}"
        )

    radar = radar[REQUIRED_COLUMNS].copy()

    # Convert unexpected text values into missing values.
    for column in REQUIRED_COLUMNS:
        radar[column] = pd.to_numeric(
            radar[column],
            errors="coerce",
        )

    radar.replace([np.inf, -np.inf], np.nan, inplace=True)

    radar.dropna(
        subset=["frame", "x", "y", "z", "v"],
        inplace=True,
    )

    if radar.empty:
        raise ValueError(
            f"{csv_path.name} contains no usable radar points"
        )

    radar["frame"] = radar["frame"].astype(int)
    radar["absolute_velocity"] = radar["v"].abs()

    # Calculate one set of statistics for every radar frame.
    frame_statistics = (
        radar.groupby("frame", sort=True)
        .agg(
            point_count=("x", "size"),

            x_centroid=("x", "median"),
            y_centroid=("y", "median"),
            z_centroid=("z", "median"),

            x_extent=("x", _point_cloud_extent),
            y_extent=("y", _point_cloud_extent),
            z_extent=("z", _point_cloud_extent),

            mean_absolute_velocity=(
                "absolute_velocity",
                "mean",
            ),
            maximum_absolute_velocity=(
                "absolute_velocity",
                "max",
            ),

            mean_snr=("snr", "mean"),
            mean_noise=("noise", "mean"),
        )
        .fillna(0.0)
    )

    features: dict[str, float] = {
        "number_of_frames": float(len(frame_statistics)),
        "total_detected_points": float(len(radar)),
    }

    # Number of detected points per frame.
    features.update(
        _basic_statistics(
            frame_statistics["point_count"],
            "point_count",
        )
    )

    # Overall position distributions.
    for axis in ["x", "y", "z"]:
        features.update(
            _basic_statistics(
                radar[axis],
                f"overall_{axis}",
            )
        )

    # Movement of the point-cloud centroid over time.
    for axis in ["x", "y", "z"]:
        features.update(
            _temporal_statistics(
                frame_statistics[f"{axis}_centroid"],
                f"{axis}_centroid",
            )
        )

    # Change in body/point-cloud shape.
    for axis in ["x", "y", "z"]:
        features.update(
            _temporal_statistics(
                frame_statistics[f"{axis}_extent"],
                f"{axis}_extent",
            )
        )

    # Velocity behaviour.
    features.update(
        _temporal_statistics(
            frame_statistics["mean_absolute_velocity"],
            "mean_absolute_velocity",
        )
    )

    features.update(
        _basic_statistics(
            radar["absolute_velocity"],
            "absolute_velocity",
        )
    )

    # Radar signal quality.
    features.update(
        _basic_statistics(radar["snr"], "snr")
    )
    features.update(
        _basic_statistics(radar["noise"], "noise")
    )

    # Important fall-related directional features.
    z_centroid = frame_statistics["z_centroid"].to_numpy(
        dtype=float
    )

    if len(z_centroid) >= 2:
        z_steps = np.diff(z_centroid)

        features["maximum_downward_z_step"] = float(
            max(0.0, -np.min(z_steps))
        )
        features["maximum_upward_z_step"] = float(
            max(0.0, np.max(z_steps))
        )
    else:
        features["maximum_downward_z_step"] = 0.0
        features["maximum_upward_z_step"] = 0.0

    # Total movement of the radar centroid.
    centroid_coordinates = frame_statistics[
        ["x_centroid", "y_centroid", "z_centroid"]
    ].to_numpy(dtype=float)

    if len(centroid_coordinates) >= 2:
        centroid_steps = np.diff(
            centroid_coordinates,
            axis=0,
        )

        features["centroid_path_length"] = float(
            np.linalg.norm(centroid_steps, axis=1).sum()
        )
    else:
        features["centroid_path_length"] = 0.0

    return features


def build_feature_table(
    dataset_directory: str | Path,
) -> pd.DataFrame:
    """Convert all Fall and Not CSV files into a feature table."""
    dataset_directory = Path(dataset_directory)

    class_directories = [
        ("Not", 0),
        ("Fall", 1),
    ]

    rows: list[dict] = []

    for class_name, label in class_directories:
        class_directory = dataset_directory / class_name

        if not class_directory.exists():
            raise FileNotFoundError(
                f"Missing dataset folder: {class_directory}"
            )

        for csv_path in sorted(class_directory.glob("*.csv")):
            filename_parts = csv_path.stem.split("_")

            subject = filename_parts[0]
            activity = (
                filename_parts[1]
                if len(filename_parts) > 1
                else "unknown"
            )

            row = {
                "source_file": csv_path.name,
                "subject": subject,
                "activity": activity,
                "class_name": class_name,
                "label": label,
            }

            row.update(extract_features(csv_path))
            rows.append(row)

    feature_table = pd.DataFrame(rows)

    feature_columns = [
        column
        for column in feature_table.columns
        if column not in METADATA_COLUMNS
    ]

    feature_table[feature_columns] = (
        feature_table[feature_columns]
        .replace([np.inf, -np.inf], 0.0)
        .fillna(0.0)
    )

    return feature_table.sort_values(
        by=["subject", "label", "source_file"]
    ).reset_index(drop=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract Random Forest features from radar CSV files."
    )

    parser.add_argument(
        "--data-dir",
        required=True,
        help="Path containing the Fall and Not dataset folders.",
    )

    parser.add_argument(
        "--output",
        default="data/fall/fall_features.csv",
        help="Location for the generated feature table.",
    )

    arguments = parser.parse_args()

    feature_table = build_feature_table(arguments.data_dir)

    output_path = Path(arguments.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    feature_table.to_csv(output_path, index=False)

    number_of_features = (
        len(feature_table.columns) - len(METADATA_COLUMNS)
    )

    print(f"Processed recordings: {len(feature_table)}")
    print(f"Fall recordings: {(feature_table['label'] == 1).sum()}")
    print(f"Non-fall recordings: {(feature_table['label'] == 0).sum()}")
    print(f"Subjects: {sorted(feature_table['subject'].unique())}")
    print(f"Extracted features: {number_of_features}")
    print(f"Saved feature table to: {output_path.resolve()}")


if __name__ == "__main__":
    main()