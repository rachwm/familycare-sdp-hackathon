# Deploy FamilyCare to Render: one permanent URL (React + FastAPI + WebSocket)

**Goal:** Publish *every FamilyCare screen and API* under one HTTPS `*.onrender.com` address, independently of VS Code, your laptop, and Cloudflare Quick Tunnel.

This repo includes a **multi-stage `Dockerfile`**, `render.yaml` Blueprint and a FastAPI production-static fallback. Render builds the React app first, copies `frontend/dist` into the Python Docker image, and serves it using FastAPI at the same origin. This eliminates CORS/split-URL problems and keeps `/api`, `/ws`, `/utility-anomaly`, and `/reminders` on the same host.

> **Demo-only security warning:** The current prototype has no authentication/authorization and allows public API simulation and reset actions. **Do not store real resident, medical, or contact data; do not use for real emergency response.** Add authorization, rate limiting, secure data storage and operational safeguards before any real-world launch.

## Prerequisites

- Latest tested code is merged into **`integration/full-prototype-test`** on GitHub. The default `main` branch does not contain the integrated React application.
- A Render account with access to the GitHub repo `rachwm/familycare-sdp-hackathon`.
- The `render.yaml`, root `Dockerfile` and updated `backend/main.py` are present on **the same branch** to be deployed.
- Use a **single web service** initially. Do not deploy FamilyCare's frontend as an unrelated static site without connecting its API/WebSockets.

## Option A: Deploy using the Render Blueprint (easiest)

1. Open https://dashboard.render.com and log in.
2. Choose **New > Blueprint**.
3. Connect GitHub and select **`rachwm/familycare-sdp-hackathon`**.
4. **Choose branch `integration/full-prototype-test`**, not `main`.
5. Leave **Blueprint Path** as root `render.yaml` and create/deploy the Blueprint.
6. The Blueprint declares a **Docker web service** named `familycare-sdp-hackathon`, initially on the **Free** compute plan, with health check `/health`. Render will build the frontend and Python runtime using the root Dockerfile.
7. When Render reports **Live**, open the HTTPS `onrender.com` URL **shown in your Render dashboard**. Do not assume the exact hostname before creation.
8. Validate the health endpoint at `https://<your-render-host>/health`. Then check `https://<your-render-host>/api/incidents` (JSON array) and `https://<your-render-host>/` (React family app).

Render may take longer to deploy the first time due to Python scientific dependencies and the Node frontend build. Inspect your service's **Events** and **Logs** for actual errors; don't assume that a GitHub commit equals a successful deployment.

## Option B: Manually create a single web service

If you'd rather configure it explicitly:
1. Render > **New > Web Service** > connect the GitHub repo.
2. **Branch:** `integration/full-prototype-test`.
3. **Language/Runtime:** **Docker**.
4. **Dockerfile path:** `./Dockerfile`; **Docker build context:** `.`.
5. **Region:** choose **Singapore** if available for proximity to Malaysia.
6. **Plan:** Free is okay to *test*, but paid compute is recommended if you need the demo to be ready at a scheduled time without cold starts.
7. **Health check:** `/health`.
8. Environment: `FAMILYCARE_ENVIRONMENT=demo`. **Leave `VITE_API_BASE_URL` unset** so the frontend uses same-origin HTTP and WebSockets. Render provides `PORT`; the Dockerfile starts Uvicorn on `0.0.0.0:$PORT`.
9. Deploy, then verify exactly as in Option A.

**Choose A or B, not both** for the same service name, or you may accidentally create duplicate instances.

## The resulting URLs (one shared base)

Suppose Render assigns `https://<your-render-host>.onrender.com`:

| Destination | Link |
|---|---|
| Children's Family app | `https://<host>.onrender.com/` |
| Family alerts | `https://<host>.onrender.com/alerts` |
| Home Companion | `https://<host>.onrender.com/companion` |
| Simulator | `https://<host>.onrender.com/simulator` |
| SDP Response Centre | `https://<host>.onrender.com/coordinator` |
| Responder | `https://<host>.onrender.com/responder` |
| Backend health | `https://<host>.onrender.com/health` |
| Swagger | `https://<host>.onrender.com/docs` |
| Incident data | `https://<host>.onrender.com/api/incidents` |
| WebSocket | `wss://<host>.onrender.com/ws` |

The BrowserRouter routes can be opened directly or refreshed because FastAPI serves the React index for non-API paths. Make sure each dashboard is in **Live Mode**.

## End-to-end test after deploy

1. Open `/simulator` and `/alerts` in different tabs on the same Render host. Switch Family dashboard to Live Mode.
2. Click **Activity anomaly > Run simulation**, which calls `POST /api/simulator/activity`. Home Companion should show the *simulated* check-in; press **I need help**.
3. Verify the created incident at `/api/incidents` and activity anomaly in Family `/alerts` and Coordinator Live Mode.
4. Test **Fall detection** similarly.
5. For real ML predictions, Swagger `POST /utility-anomaly` accepts sensor inputs. A valid normal reading does **not** create an incident.

## Critical tradeoffs: 'fixed URL' is not 'always online'

- **Render Free web services spin down after 15 minutes without inbound HTTP or WebSocket messages**, and waking takes time (often around one minute). The URL remains the same, but the service is **not always awake**.
- On Render Free, the filesystem is **ephemeral**. FamilyCare's incident and reminder JSON files will **disappear on restarts, redeploys or spin-downs**. This matters even though the URL is stable.
- **For reliable live judging**, upgrade the Render service to suitable paid compute and add durable storage before relying on persistent incidents. A paid persistent disk can be mounted at e.g. `/var/data`; set the service env var `FAMILYCARE_DATA_DIR=/var/data`. Both incident and reminder stores support this path. The disk mount and matching env variable must be configured together. Alternatively move to a managed DB for multi-user / production use.
- On an ephemeral Free plan, **reset and rerun demo events after each restart**. Keep Cloudflare ready as a fallback if Render builds fail or have a cold start.
- Running multiple Uvicorn workers/replicas without a shared database/event broker is not supported by this prototype's in-process incident cache/WebSocket manager. Keep **one worker and one service instance** for this demo.

## Troubleshooting deployment

| Symptom | What to check |
|---|---|
| Render shows Docker build failed | Inspect logs for `pnpm install --frozen-lockfile`, TypeScript build, Python dependencies or model files |
| Render stays unhealthy | Check startup logs and `/health`; Docker must listen on `0.0.0.0:$PORT` |
| React URL shows JSON instead of Family dashboard | Confirm Docker copied `frontend/dist` and `backend/main.py` includes production frontend serving |
| `/coordinator` refresh gives 404 | Check the React fallback in `backend/main.py` and deploy latest integration commit |
| Family dashboard empty while Coordinator sees incidents | Set **Family** Data Mode to **Live**, and use resident ID `resident-01` |
| No WebSocket updates | Test `wss://<host>/ws`; both browser and API must be on the **same Render origin** |
| Incidents disappear later | Free filesystem is ephemeral; use persistent paid storage or a real DB |
| Page slow to open after inactivity | Free service spun down; choose paid compute for a predictable demo |
| Utility anomaly did not create incident | The trained model may classify input as normal. Test `POST /api/simulator/activity` for a guaranteed injected demo case |

## After the hackathon

Before inviting real residents: implement authenticated resident/family/coordinator/responder roles, responder authorization checks, audit/event trails, data retention controls, persistent database and reliable background event delivery. The current prototype is a **simulation**, not a functioning emergency-response service.

### Official references
- https://render.com/docs/infrastructure-as-code
- https://render.com/docs/docker
- https://render.com/docs/web-services
- https://render.com/docs/free
- https://render.com/docs/disks
