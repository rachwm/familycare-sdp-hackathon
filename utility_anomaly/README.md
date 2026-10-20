# Utility and routine-anomaly prototype

This module explores whether electricity, water, inactivity, door-transition, time-of-day, and resident-state signals can identify unusual household routines without cameras.

## What it does

- Builds time-based features from prepared utility and contact-sensor data.
- Trains an Isolation Forest and an adaptive circadian baseline.
- Produces an anomaly result with a confidence score, explanation, metrics, and resident state.
- Creates a shared FamilyCare incident only when the detector or demo simulator identifies an anomaly.
- Ignores high inactivity when the resident state is `AWAY`.

The deployed simulator can inject a guaranteed demonstration anomaly. That injected event is labelled as simulated and is separate from a model inference result.

## Run the included checks

From the repository root:

```powershell
python -m utility_anomaly.utility_simulator
python -m utility_anomaly.evaluation
```

To rebuild the saved models, first prepare the expected utility feature matrix, then run:

```powershell
python -m utility_anomaly.train_model
```

## API routes

- `POST /api/simulator/activity`: inject a guaranteed simulated activity anomaly for the demo.
- `POST /utility-anomaly`: run the trained detector against submitted sensor features.
- `GET /api/incidents`: view stored fall and routine-anomaly incidents.

Live API documentation: https://familycare-sdp-hackathon.onrender.com/docs

## Limitations

This is an exploratory hackathon model, not a medical or emergency-detection system. It has not been validated in occupied Sime Darby Property homes. Household routines, sensor coverage, multiple residents, visitors, pets, outages, and changing occupancy can affect results. A real pilot requires consent, representative data, privacy controls, durable storage, human review, and a safe escalation policy.
