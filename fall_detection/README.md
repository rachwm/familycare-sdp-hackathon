# Fall Detection

Member 1's mmWave fall-detection pipeline and simulated fall-event
fallback.

## Proposed sensor

The proposed radar sensor for a future live pilot is the Texas
Instruments IWR6843. The IWR6843ISK evaluation module is the reference
development board for USB point-cloud access. The selection, mounting
assumptions, official references and vendor-output mapping are
documented in
[`documentation/iwr6843-integration.md`](../documentation/iwr6843-integration.md).

The hackathon demonstration uses recorded point-cloud CSV files and a
simulator. It does not claim that the current model has already been
validated on the proposed physical board.

## Recorded-radar inference

From the repository root:

```powershell
python -m fall_detection.radar_adapter `
  --csv "PATH_TO_RECORDING.csv" `
  --resident-id "resident-01" `
  --location "living_room" `
  --send
```

## Hardware-independent simulator

Create and send a simulated fall:

```powershell
python -m fall_detection.fall_simulator --scenario fall --send
```

Run normal-activity scenarios:

```powershell
python -m fall_detection.fall_simulator --scenario sitting
python -m fall_detection.fall_simulator --scenario lying_down
python -m fall_detection.fall_simulator --scenario exercise
```

Normal-activity scenarios do not create or send a fall event.

## Reproduce the evaluation evidence

After running `train_model.py`, generate the error analysis, threshold
comparison, charts and pitch-ready report:

```powershell
python -m fall_detection.evaluation
```

The report is saved to
[`documentation/fall-model-evaluation.md`](../documentation/fall-model-evaluation.md).
The supporting charts and CSV tables are saved under `fall_detection/reports/`.

The evaluation uses the saved Leave-One-Subject-Out predictions. It does not
report the final model's performance on the same recordings used to train it.
