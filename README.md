# FamilyCare

FamilyCare is an elderly-first home safety and response prototype for the Sime Darby Property University Hackathon 2026. It combines camera-free fall detection, routine-anomaly monitoring, a simple Home Companion, family visibility, and a coordinated SDP responder workflow.

## Live prototype

| Experience | URL |
| --- | --- |
| FamilyCare mobile app | https://familycare-sdp-hackathon.onrender.com/ |
| Home Companion | https://familycare-sdp-hackathon.onrender.com/companion |
| SDP Coordinator Response Center | https://familycare-sdp-hackathon.onrender.com/coordinator |
| SDP Responder Dashboard | https://familycare-sdp-hackathon.onrender.com/responder |
| Sensor Simulator — demo only | https://familycare-sdp-hackathon.onrender.com/simulator |
| API documentation | https://familycare-sdp-hackathon.onrender.com/docs |
| Service health | https://familycare-sdp-hackathon.onrender.com/health |

The hosted prototype may need a short cold-start period on Render's free tier.

## Judge walkthrough

1. Open the **Sensor Simulator** and select **Reset demo**.
2. Trigger a simulated fall or activity anomaly.
3. Open the **Home Companion** and choose **I need help**, or let the check-in time out.
4. Open the **Coordinator Response Center** to review the incident and assign a responder.
5. Open the **Responder Dashboard** to accept, depart, arrive, and submit the visit outcome.
6. Return to the **FamilyCare mobile app** to see the same incident and final status.

Use **Live Mode** where offered. The simulator injects demonstration events; it does not contact real emergency services.

## What is implemented

- Integrated React and TypeScript interface for family, resident, coordinator, responder, and simulator views
- FastAPI incident, resident-response, reminder, responder, visit-report, and reset endpoints
- WebSocket updates across the connected prototype views
- Simulated fall and routine-anomaly events
- A Random Forest fall-detection pipeline evaluated on recorded radar data
- An Isolation Forest and adaptive-baseline routine-anomaly prototype
- Docker deployment that serves the frontend and API from one origin

## Architecture

```text
Sensor or simulator
        ↓
FastAPI incident service
        ↓
Home Companion check-in
        ↓
Family alert → SDP Coordinator → Field Responder
        ↓
Shared incident status and visit outcome
```

## Run locally

### Backend

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
```

### Frontend

Node.js 22.12 or newer is recommended.

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open the Vite URL printed in the terminal, normally http://127.0.0.1:5173.

## Verify the project

```powershell
python -m pytest backend/tests -v
cd frontend
pnpm test
pnpm build
```

See the [system test plan](documentation/test-plan.md) for the end-to-end smoke test.

## Evidence and supporting material

- [Fall-detection evaluation](documentation/fall-model-evaluation.md)
- [Backend API contract](documentation/api-contract.md)
- [IWR6843 integration plan](documentation/iwr6843-integration.md)
- [Submission backup and screenshot pack](documentation/DEMO_BACKUP.md)
- [Render deployment guide](documentation/RENDER_DEPLOYMENT.md)
- [Frontend implementation guide](frontend/README.md)

## Prototype disclosure

FamilyCare is a hackathon prototype. Demo incidents and sensor triggers are simulated. The fall-detection model was evaluated on 102 recorded samples from three participants and is **not clinically validated**. Live radar hardware, authentication, durable production storage, verified location data, and real emergency dispatch remain future pilot work.

Do not use the prototype for real resident monitoring or emergency response.
