# FamilyCare system test plan

## Scope

This plan covers backend unit and integration tests, frontend behavior and build checks, and a manual end-to-end verification of the hosted prototype.

## Prerequisites

- Python 3.11 or newer
- Node.js 22.12 or newer
- pnpm 10.x
- Dependencies installed from `backend/requirements.txt` and `frontend/pnpm-lock.yaml`

## Automated backend tests

From the repository root:

```powershell
python -m pip install -r backend/requirements.txt
python -m pytest backend/tests -v
```

The backend suite covers fall and anomaly events, incident persistence, resident responses, reminders, WebSockets, responder transitions, visit reports, simulator behavior, reset behavior, and production frontend serving.

## Frontend tests and production build

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

The frontend suite covers demo scenarios, API validation, navigation, incident chronology, coordinator matching, responder actions, reminder behavior, utility anomalies, and reset behavior. The production build must complete without TypeScript errors.

## Local smoke test

Run the backend and frontend in separate terminals:

```powershell
python -m uvicorn backend.main:app --reload
```

```powershell
cd frontend
pnpm dev
```

Verify:

1. `GET /health` reports a healthy service.
2. The family, companion, coordinator, responder, and simulator routes open.
3. Reset clears existing demo incidents and reminders.
4. A simulated fall creates one incident.
5. The Home Companion can submit **I'm okay**, **I need help**, or a timeout.
6. A help request becomes visible to Family and Coordinator views.
7. The coordinator can assign a responder.
8. The responder can accept, depart, arrive, and submit a visit report.
9. The final outcome appears consistently across the connected views.
10. A simulated activity anomaly remains distinct from a fall incident.

## Hosted submission check

Using a private browser window, test:

- https://familycare-sdp-hackathon.onrender.com/
- https://familycare-sdp-hackathon.onrender.com/companion
- https://familycare-sdp-hackathon.onrender.com/coordinator
- https://familycare-sdp-hackathon.onrender.com/responder
- https://familycare-sdp-hackathon.onrender.com/simulator
- https://familycare-sdp-hackathon.onrender.com/docs
- https://familycare-sdp-hackathon.onrender.com/health

Wake the Render service before judging, reset the demonstration state, and perform the exact recorded-video flow once. Save screenshots of the working views and retain a separate copy of the final MP4.
