"""Generate reproducible evidence for the FamilyCare fall model.

This script analyses the leave-one-subject-out predictions created by
``train_model.py``. It does not evaluate the final model on its training
data, which would give an unrealistically optimistic result.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_METRICS_PATH = (
    PROJECT_ROOT
    / "fall_detection"
    / "models"
    / "fall_model_metrics.json"
)
DEFAULT_PREDICTIONS_PATH = (
    PROJECT_ROOT
    / "fall_detection"
    / "models"
    / "fall_oof_predictions.csv"
)
DEFAULT_IMPORTANCE_PATH = (
    PROJECT_ROOT
    / "fall_detection"
    / "models"
    / "fall_feature_importance.csv"
)
DEFAULT_OUTPUT_DIRECTORY = (
    PROJECT_ROOT / "fall_detection" / "reports"
)
DEFAULT_REPORT_PATH = (
    PROJECT_ROOT
    / "documentation"
    / "fall-model-evaluation.md"
)

SDP_RED = "#BB2E35"
FAMILYCARE_NAVY = "#1D2D44"
FAMILYCARE_ORANGE = "#F28E2B"


def calculate_metrics(
    actual: np.ndarray,
    predicted: np.ndarray,
) -> dict[str, float | int]:
    """Calculate safety-relevant binary classification metrics."""

    tn, fp, fn, tp = confusion_matrix(
        actual,
        predicted,
        labels=[0, 1],
    ).ravel()

    specificity = (
        tn / (tn + fp)
        if (tn + fp) > 0
        else 0.0
    )

    return {
        "accuracy": float(
            accuracy_score(actual, predicted)
        ),
        "balanced_accuracy": float(
            balanced_accuracy_score(actual, predicted)
        ),
        "fall_precision": float(
            precision_score(
                actual,
                predicted,
                zero_division=0,
            )
        ),
        "fall_recall": float(
            recall_score(
                actual,
                predicted,
                zero_division=0,
            )
        ),
        "fall_f1": float(
            f1_score(
                actual,
                predicted,
                zero_division=0,
            )
        ),
        "specificity": float(specificity),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_positives": int(tp),
    }


def validate_predictions(
    predictions: pd.DataFrame,
) -> pd.DataFrame:
    """Validate and normalize the saved prediction table."""

    required_columns = {
        "source_file",
        "subject",
        "activity",
        "class_name",
        "label",
        "fall_probability",
        "decision_threshold",
        "predicted_label",
        "correct",
    }
    missing_columns = sorted(
        required_columns - set(predictions.columns)
    )
    if missing_columns:
        raise ValueError(
            "Prediction table is missing columns: "
            f"{missing_columns}"
        )

    normalized = predictions.copy()
    for column in (
        "label",
        "predicted_label",
    ):
        normalized[column] = (
            pd.to_numeric(normalized[column]).astype(int)
        )

    for column in (
        "fall_probability",
        "decision_threshold",
    ):
        normalized[column] = pd.to_numeric(
            normalized[column]
        ).astype(float)

    normalized["correct"] = (
        normalized["label"]
        == normalized["predicted_label"]
    )

    if not normalized["fall_probability"].between(
        0.0,
        1.0,
    ).all():
        raise ValueError(
            "Fall probabilities must be between zero and one."
        )

    return normalized


def build_error_analysis(
    predictions: pd.DataFrame,
) -> pd.DataFrame:
    """Return every false positive and false negative."""

    errors = predictions.loc[
        ~predictions["correct"]
    ].copy()
    errors["error_type"] = np.where(
        errors["label"] == 0,
        "false_positive",
        "false_negative",
    )
    errors["threshold_margin"] = (
        errors["fall_probability"]
        - errors["decision_threshold"]
    ).round(4)

    columns = [
        "error_type",
        "source_file",
        "subject",
        "activity",
        "class_name",
        "label",
        "fall_probability",
        "decision_threshold",
        "threshold_margin",
        "predicted_label",
    ]
    return errors[columns].sort_values(
        by=["error_type", "subject", "activity", "source_file"]
    )


def build_activity_summary(
    predictions: pd.DataFrame,
) -> pd.DataFrame:
    """Summarize performance for each recorded activity."""

    summary = (
        predictions.groupby(
            ["class_name", "activity"],
            as_index=False,
        )
        .agg(
            recordings=("source_file", "count"),
            correct=("correct", "sum"),
            mean_fall_score=("fall_probability", "mean"),
            minimum_fall_score=("fall_probability", "min"),
            maximum_fall_score=("fall_probability", "max"),
        )
    )
    summary["errors"] = (
        summary["recordings"] - summary["correct"]
    )
    summary["activity_accuracy"] = (
        summary["correct"] / summary["recordings"]
    )

    numeric_columns = [
        "mean_fall_score",
        "minimum_fall_score",
        "maximum_fall_score",
        "activity_accuracy",
    ]
    summary[numeric_columns] = summary[
        numeric_columns
    ].round(4)

    return summary[
        [
            "class_name",
            "activity",
            "recordings",
            "correct",
            "errors",
            "activity_accuracy",
            "mean_fall_score",
            "minimum_fall_score",
            "maximum_fall_score",
        ]
    ]


def build_threshold_comparison(
    predictions: pd.DataFrame,
    selected_threshold: float,
) -> pd.DataFrame:
    """Compare safety trade-offs without retraining the model."""

    thresholds = sorted(
        {
            0.30,
            0.35,
            0.40,
            round(selected_threshold, 4),
            0.50,
            0.55,
            0.60,
            0.70,
        }
    )
    actual = predictions["label"].to_numpy()
    probabilities = predictions[
        "fall_probability"
    ].to_numpy()

    rows: list[dict[str, float | int | bool]] = []
    for threshold in thresholds:
        predicted = (
            probabilities >= threshold
        ).astype(int)
        metrics = calculate_metrics(actual, predicted)
        rows.append(
            {
                "threshold": threshold,
                "selected": bool(
                    np.isclose(
                        threshold,
                        selected_threshold,
                    )
                ),
                **metrics,
            }
        )

    return pd.DataFrame(rows)


def save_confusion_matrix(
    metrics: dict,
    output_path: Path,
) -> None:
    """Save a slide-ready confusion matrix image."""

    matrix = np.array(
        [
            [
                metrics["true_negatives"],
                metrics["false_positives"],
            ],
            [
                metrics["false_negatives"],
                metrics["true_positives"],
            ],
        ]
    )

    figure, axis = plt.subplots(figsize=(7.2, 5.8))
    image = axis.imshow(
        matrix,
        cmap="Blues",
        vmin=0,
    )

    for row in range(2):
        for column in range(2):
            value = int(matrix[row, column])
            axis.text(
                column,
                row,
                str(value),
                ha="center",
                va="center",
                fontsize=24,
                fontweight="bold",
                color=(
                    "white"
                    if value > matrix.max() / 2
                    else FAMILYCARE_NAVY
                ),
            )

    axis.set_xticks([0, 1], labels=["Not fall", "Fall"])
    axis.set_yticks([0, 1], labels=["Not fall", "Fall"])
    axis.set_xlabel("Model prediction", fontweight="bold")
    axis.set_ylabel("Actual recording", fontweight="bold")
    axis.set_title(
        "FamilyCare fall detection\n"
        "Leave-One-Subject-Out validation",
        fontweight="bold",
        color=FAMILYCARE_NAVY,
    )
    figure.colorbar(image, ax=axis, fraction=0.046, pad=0.04)
    figure.tight_layout()
    figure.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close(figure)


def save_threshold_plot(
    comparison: pd.DataFrame,
    selected_threshold: float,
    output_path: Path,
) -> None:
    """Save a chart showing recall and false-alert trade-offs."""

    figure, axis = plt.subplots(figsize=(8.4, 5.2))
    axis.plot(
        comparison["threshold"],
        comparison["fall_recall"],
        marker="o",
        color=SDP_RED,
        linewidth=2.5,
        label="Fall recall",
    )
    axis.plot(
        comparison["threshold"],
        comparison["specificity"],
        marker="o",
        color=FAMILYCARE_NAVY,
        linewidth=2.5,
        label="Specificity",
    )
    axis.plot(
        comparison["threshold"],
        comparison["fall_precision"],
        marker="o",
        color=FAMILYCARE_ORANGE,
        linewidth=2.0,
        label="Fall precision",
    )
    axis.axvline(
        selected_threshold,
        color="#555555",
        linestyle="--",
        linewidth=1.5,
        label=f"Selected threshold ({selected_threshold:.2f})",
    )
    axis.set_ylim(0.0, 1.05)
    axis.set_xlabel("Fall decision threshold", fontweight="bold")
    axis.set_ylabel("Score", fontweight="bold")
    axis.set_title(
        "Threshold trade-off on held-out subjects",
        fontweight="bold",
        color=FAMILYCARE_NAVY,
    )
    axis.grid(alpha=0.2)
    axis.legend(loc="best")
    figure.tight_layout()
    figure.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close(figure)


def save_feature_importance_plot(
    importance: pd.DataFrame,
    output_path: Path,
) -> None:
    """Save the ten most influential Random Forest features."""

    top_features = importance.head(10).sort_values(
        by="importance",
        ascending=True,
    )

    figure, axis = plt.subplots(figsize=(9.4, 6.0))
    axis.barh(
        top_features["feature"],
        top_features["importance"],
        color=FAMILYCARE_NAVY,
    )
    axis.set_xlabel("Random Forest feature importance", fontweight="bold")
    axis.set_title(
        "Top features used by the fall model",
        fontweight="bold",
        color=FAMILYCARE_NAVY,
    )
    axis.grid(axis="x", alpha=0.2)
    figure.tight_layout()
    figure.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close(figure)


def percent(value: float) -> str:
    return f"{value * 100:.1f}%"


def markdown_table(
    headers: list[str],
    rows: list[list[str]],
) -> str:
    """Create a simple GitHub-flavoured Markdown table."""

    header_line = "| " + " | ".join(headers) + " |"
    separator = "| " + " | ".join(
        "---" for _ in headers
    ) + " |"
    body = [
        "| " + " | ".join(row) + " |"
        for row in rows
    ]
    return "\n".join(
        [header_line, separator, *body]
    )


def count_errors_by_activity(
    errors: pd.DataFrame,
    error_type: str,
) -> list[list[str]]:
    """Create report rows for one type of model error."""

    selected = errors.loc[
        errors["error_type"] == error_type
    ]
    if selected.empty:
        return [["None", "0", "None"]]

    grouped = (
        selected.groupby("activity")
        .agg(
            errors=("source_file", "count"),
            subjects=(
                "subject",
                lambda values: ", ".join(
                    sorted(set(values))
                ),
            ),
        )
        .reset_index()
        .sort_values("errors", ascending=False)
    )
    return [
        [
            str(row.activity),
            str(int(row.errors)),
            str(row.subjects),
        ]
        for row in grouped.itertuples(index=False)
    ]


def create_markdown_report(
    metrics_document: dict,
    predictions: pd.DataFrame,
    errors: pd.DataFrame,
    activity_summary: pd.DataFrame,
    threshold_comparison: pd.DataFrame,
    importance: pd.DataFrame,
    report_path: Path,
) -> None:
    """Write the pitch-ready evaluation report."""

    overall = metrics_document["overall"]
    threshold = float(metrics_document["threshold"])
    subjects = sorted(
        predictions["subject"].astype(str).unique()
    )

    fold_rows = []
    for fold in metrics_document["folds"]:
        fold_rows.append(
            [
                str(fold["held_out_subject"]),
                str(fold["test_recordings"]),
                percent(fold["balanced_accuracy"]),
                percent(fold["fall_recall"]),
                percent(fold["specificity"]),
                str(fold["false_positives"]),
                str(fold["false_negatives"]),
            ]
        )

    threshold_rows = []
    for row in threshold_comparison.itertuples(index=False):
        threshold_label = f"{row.threshold:.2f}"
        if row.selected:
            threshold_label += " (selected)"
        threshold_rows.append(
            [
                threshold_label,
                percent(row.fall_recall),
                percent(row.specificity),
                percent(row.fall_precision),
                str(int(row.false_positives)),
                str(int(row.false_negatives)),
            ]
        )

    activity_rows = []
    for row in activity_summary.itertuples(index=False):
        activity_rows.append(
            [
                str(row.class_name),
                str(row.activity),
                str(int(row.recordings)),
                str(int(row.errors)),
                percent(float(row.activity_accuracy)),
                f"{float(row.mean_fall_score):.3f}",
            ]
        )

    feature_rows = []
    for rank, row in enumerate(
        importance.head(10).itertuples(index=False),
        start=1,
    ):
        feature_rows.append(
            [
                str(rank),
                str(row.feature),
                f"{float(row.importance):.4f}",
            ]
        )

    report = f"""# FamilyCare Fall-Detection Evaluation

## Executive result

The Random Forest was evaluated using **Leave-One-Subject-Out (LOSO)
cross-validation**. In each fold, one participant was completely excluded
from training and used only for testing. This is more realistic than a random
row split because recordings from the same person cannot appear in both the
training and test sets.

At the selected threshold of **{threshold:.2f}**, the prototype achieved:

- **{percent(overall['fall_recall'])} fall recall:** {overall['true_positives']}
  of {overall['true_positives'] + overall['false_negatives']} falls detected.
- **{percent(overall['balanced_accuracy'])} balanced accuracy.**
- **{percent(overall['fall_precision'])} fall precision.**
- **{percent(overall['specificity'])} specificity:**
  {overall['true_negatives']} of
  {overall['true_negatives'] + overall['false_positives']} normal activities
  correctly rejected.
- **{overall['false_positives']} false positives** and
  **{overall['false_negatives']} false negatives** across
  **{len(predictions)} recordings** from **{len(subjects)} participants**.

These are preliminary prototype results, not clinical-performance claims.

## Evaluation design

- Dataset size: {len(predictions)} recordings.
- Participants: {', '.join(subjects)}.
- Class balance: {int((predictions['label'] == 1).sum())} fall and
  {int((predictions['label'] == 0).sum())} non-fall recordings.
- Model: Random Forest using 82 extracted point-cloud and motion features.
- Decision rule: classify as a possible fall when the fall score is at least
  {threshold:.2f}.
- The fall score is a model confidence score, not a medically calibrated
  probability.

## Overall confusion matrix

![LOSO confusion matrix](../fall_detection/reports/confusion_matrix.png)

| Actual / predicted | Not fall | Fall |
| --- | ---: | ---: |
| Not fall | {overall['true_negatives']} | {overall['false_positives']} |
| Fall | {overall['false_negatives']} | {overall['true_positives']} |

## Results by held-out participant

{markdown_table(
    ['Held-out participant', 'Recordings', 'Balanced accuracy',
     'Fall recall', 'Specificity', 'False positives', 'False negatives'],
    fold_rows,
)}

The variation between participants is important. The Raffay fold detected
every fall but produced more false alerts, while the Towsif fold rejected all
normal activities but missed four falls. This shows that the next dataset
must include more people and more variation in movement style.

## False-alert analysis

### False positives: normal activity classified as a fall

{markdown_table(
    ['Activity', 'False positives', 'Participant(s)'],
    count_errors_by_activity(errors, 'false_positive'),
)}

Walking accounted for most false positives, and all seven walking errors came
from the same held-out participant. This suggests person-specific movement or
radar-position differences rather than a universal walking problem. The
appropriate response is to collect more walking styles and sensor placements,
not to claim that the issue is already solved.

### False negatives: fall classified as normal activity

{markdown_table(
    ['Fall direction', 'False negatives', 'Participant(s)'],
    count_errors_by_activity(errors, 'false_negative'),
)}

The complete recording-level error list is stored in
`fall_detection/reports/fall_error_analysis.csv`.

## Performance by activity

{markdown_table(
    ['Class', 'Activity', 'Recordings', 'Errors', 'Accuracy',
     'Mean fall score'],
    activity_rows,
)}

## Decision-threshold trade-off

![Threshold comparison](../fall_detection/reports/threshold_tradeoff.png)

{markdown_table(
    ['Threshold', 'Fall recall', 'Specificity', 'Fall precision',
     'False positives', 'False negatives'],
    threshold_rows,
)}

The selected threshold of {threshold:.2f} intentionally prioritizes fall
recall. Raising it may reduce false alerts but risks missing more falls. The
threshold must be reviewed again after collecting a larger, representative
IWR6843 dataset.

## Model explanation

![Feature importance](../fall_detection/reports/feature_importance.png)

{markdown_table(
    ['Rank', 'Feature', 'Importance'],
    feature_rows,
)}

The model uses a combination of final position, movement trajectory, Doppler
velocity, signal strength and other point-cloud statistics. No single feature
dominates the decision. Feature importance shows association within this
dataset; it does not prove that a feature causes a fall.

## System-level false-alert protection

FamilyCare does not immediately label a model output as a confirmed emergency.

1. A score above the threshold creates a **possible fall** with warning
   severity.
2. The Home Companion asks the resident to select **I'm okay** or **I need
   help**.
3. **I'm okay** resolves the incident without responder escalation.
4. **I need help** or no response changes the incident to critical and alerts
   the care circle or responder workflow.

This human confirmation layer limits the impact of model false positives while
still treating no response as a safety risk.

## Limitations and next validation work

- Only three participants and 102 recordings were available.
- The recorded non-fall classes are bowing, squatting and walking.
- Sitting, controlled lying down and exercise are demonstrated through the
  simulator but are not included in the current trained dataset.
- Results come from recorded radar CSV files, not a live IWR6843 deployment.
- Room layout, sensor mounting, multiple people, pets and mobility aids have
  not yet been evaluated.
- A pilot should collect representative IWR6843 recordings across more people,
  rooms and normal activities. Any staged falls should use trained participants
  and a controlled safety protocol rather than vulnerable residents.

## Judge-safe pitch wording

> In preliminary leave-one-subject-out testing on 102 radar recordings, our
> Random Forest detected 46 of 51 falls, giving 90.2% fall recall. The results
> also revealed person-specific false alerts, especially walking recordings,
> so FamilyCare treats the output as a possible fall and asks the resident to
> confirm before escalation. A larger IWR6843 pilot dataset is the next step.

Do not describe these results as clinical validation, guaranteed accuracy or
proof of performance for all elderly residents.
"""

    report_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    report_path.write_text(
        report,
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Generate FamilyCare fall-model evaluation evidence."
        )
    )
    parser.add_argument(
        "--metrics",
        default=str(DEFAULT_METRICS_PATH),
    )
    parser.add_argument(
        "--predictions",
        default=str(DEFAULT_PREDICTIONS_PATH),
    )
    parser.add_argument(
        "--importance",
        default=str(DEFAULT_IMPORTANCE_PATH),
    )
    parser.add_argument(
        "--output-directory",
        default=str(DEFAULT_OUTPUT_DIRECTORY),
    )
    parser.add_argument(
        "--report",
        default=str(DEFAULT_REPORT_PATH),
    )
    arguments = parser.parse_args()

    metrics_path = Path(arguments.metrics)
    predictions_path = Path(arguments.predictions)
    importance_path = Path(arguments.importance)
    output_directory = Path(arguments.output_directory)
    report_path = Path(arguments.report)

    for path in (
        metrics_path,
        predictions_path,
        importance_path,
    ):
        if not path.exists():
            raise FileNotFoundError(
                f"Required evaluation input not found: {path}"
            )

    metrics_document = json.loads(
        metrics_path.read_text(encoding="utf-8")
    )
    predictions = validate_predictions(
        pd.read_csv(predictions_path)
    )
    importance = pd.read_csv(importance_path)

    required_importance_columns = {
        "feature",
        "importance",
    }
    if not required_importance_columns.issubset(
        importance.columns
    ):
        raise ValueError(
            "Feature-importance table must contain feature and importance."
        )
    importance["importance"] = pd.to_numeric(
        importance["importance"]
    ).astype(float)
    importance = importance.sort_values(
        by="importance",
        ascending=False,
    )

    threshold = float(metrics_document["threshold"])
    errors = build_error_analysis(predictions)
    activity_summary = build_activity_summary(predictions)
    threshold_comparison = build_threshold_comparison(
        predictions,
        threshold,
    )

    output_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    errors.to_csv(
        output_directory / "fall_error_analysis.csv",
        index=False,
    )
    activity_summary.to_csv(
        output_directory / "activity_performance.csv",
        index=False,
    )
    threshold_comparison.to_csv(
        output_directory / "threshold_comparison.csv",
        index=False,
    )

    save_confusion_matrix(
        metrics_document["overall"],
        output_directory / "confusion_matrix.png",
    )
    save_threshold_plot(
        threshold_comparison,
        threshold,
        output_directory / "threshold_tradeoff.png",
    )
    save_feature_importance_plot(
        importance,
        output_directory / "feature_importance.png",
    )
    create_markdown_report(
        metrics_document=metrics_document,
        predictions=predictions,
        errors=errors,
        activity_summary=activity_summary,
        threshold_comparison=threshold_comparison,
        importance=importance,
        report_path=report_path,
    )

    print("FamilyCare evaluation evidence generated")
    print(f"Report: {report_path.resolve()}")
    print(f"Charts and tables: {output_directory.resolve()}")
    print(f"Errors analysed: {len(errors)}")


if __name__ == "__main__":
    main()
