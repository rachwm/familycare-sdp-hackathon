# FamilyCare: Cloudflare Quick Tunnel backup runbook (Windows + VS Code)

**Purpose:** Share the full FamilyCare prototype through ONE temporary HTTPS link while the laptop is running. The same link serves Family, Home Companion, Simulator, SDP Coordinator, Responder, API and WebSocket events. **Cloudflare Quick Tunnels are a development/demo backup, not permanent hosting.**

## 0. Prerequisites

- Windows PowerShell, VS Code, Python virtual environment in repo root (`.venv`), Node.js, frontend dependencies, and `cloudflared` installed.
- Three **separate** terminals (FastAPI, Vite, Cloudflare). Keep all three open.
- Use the Git branch `integration/full-prototype-test`. **Do not** use `main`: the full integrated frontend is on the integration branch.
- Only synthetic demonstration data: the publicly accessible simulator and API have no sign-in protection. Never expose real resident information.

### Before starting: update the local code

Open Terminal 1 in VS Code, starting from the repository root:

```powershell
cd "C:\Users\rachel\Documents\GitHub\familycare-sdp-hackathon"
git status --short
git switch integration/full-prototype-test
git pull --ff-only origin integration/full-prototype-test
git rev-parse --short HEAD
```

If Git refuses to pull due to modified local files, **do not force it or delete files**. Inspect `git status`, then stash just the blocking changes as needed:

```powershell
git stash push -m "Backup local Cloudflare settings" -- frontend/vite.config.ts
git pull --ff-only origin integration/full-prototype-test
```

Keep the stash until you compare it with the newer settings. Do not immediately `git stash pop`, since the current Vite config already accepts `*.trycloudflare.com` development hosts.

## 1. Terminal 1: start FastAPI on port 8000

From the **repository root**:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

If you already activated the environment, `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000` also works from the root.

**Check:** http://127.0.0.1:8000/health should return JSON containing `"status": "healthy"`. Swagger is at http://127.0.0.1:8000/docs.

## 2. Terminal 2: start React/Vite on port 5173

Open a second **new** VS Code terminal:

```powershell
cd "C:\Users\rachel\Documents\GitHub\familycare-sdp-hackathon\frontend"
npm run dev -- --port 5173 --strictPort
```

First-time setup, if `node_modules` does not exist: install with `pnpm install --frozen-lockfile` (the repository uses `frontend/pnpm-lock.yaml`).

**Check:** http://127.0.0.1:5173/ and http://127.0.0.1:5173/simulator.

The frontend uses relative `/api`, `/ws`, `/utility-anomaly` and `/reminders` paths, proxied by `frontend/vite.config.ts` to port 8000. **Do not set `VITE_API_BASE_URL=http://127.0.0.1:8000` for public access.** Remove that setting from any `frontend/.env` or `.env.local`; leave `VITE_API_BASE_URL` empty/unset, then restart Vite.

### Error: port 5173 already in use

Check the original Vite terminal first and press `Ctrl+C`. If you cannot locate it:

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen | Select-Object LocalPort, OwningProcess
Get-Process -Id <PID_FROM_ABOVE>
```

Only after confirming the PID belongs to the **old Vite Node process**, run `Stop-Process -Id <PID_FROM_ABOVE>`, replacing the placeholder with the real number. Restart Vite on 5173. Do not stop Python (8000) or the Cloudflare terminal.

## 3. Terminal 3: create the temporary public HTTPS address

Open a third **new** terminal, from any folder:

```powershell
cloudflared tunnel --url http://127.0.0.1:5173
```

Copy the **new** URL that appears in the output, for example `https://<new-random-name>.trycloudflare.com`. **It changes whenever you start a new Quick Tunnel.** Share only the new link. The current Vite config permits `.trycloudflare.com` hosts in development.

## 4. Open every screen from the SAME link

Replace `<PUBLIC_URL>` below with the just-printed `https://...trycloudflare.com`, without a trailing slash.

| Role | Browser URL |
|---|---|
| Children's / Family dashboard | `<PUBLIC_URL>/` |
| Family alerts | `<PUBLIC_URL>/alerts` |
| Resident-facing Home Companion | `<PUBLIC_URL>/companion` |
| Sensor simulator (operator controls) | `<PUBLIC_URL>/simulator` |
| SDP Coordinator | `<PUBLIC_URL>/coordinator` |
| Field Responder | `<PUBLIC_URL>/responder` |
| Shared incident JSON | `<PUBLIC_URL>/api/incidents` |

**Switch Family, Coordinator and Responder individually to Live Mode.** Each uses its own demo/live preference. The Home Companion is event-driven, with no mode toggle. Do not leave Home Companion on a previously handled `/companion?eventId=...` URL when waiting for a *new* alert; return to `/companion` or `/simulator`.

## 5. Reliable five-minute demo test

1. Open `/simulator`, `/companion` (optional separate tab), `/alerts`, `/coordinator` and `/responder` on the **same current tunnel origin**. Switch the three dashboards to **Live Mode**.
2. If old test events are confusing the dashboards, use **Reset Demo Data** from the Simulator. **WARNING:** this deletes all saved prototype incidents/reminders for this backend.
3. In Simulator, choose **Fall detection > Run simulation**. The connected check-in should show **I'm okay** and **I need help**. Select **I need help**.
4. Family `/alerts` should show an active fall; Coordinator should show the same real incident. Assign Daniel Lim, switch to Responder Live Mode, accept, confirm departure and arrival, then submit a report. Verify final Family status.
5. Separately test **Activity anomaly > Run simulation**. It invokes `POST /api/simulator/activity`, which creates a guaranteed *simulated* inactivity incident. The resident can respond and Family should see an activity-anomaly alert.
6. Alternatively inject from **local Swagger** (http://127.0.0.1:8000/docs): **POST /api/simulator/fall** with `{"scenario":"fall","resident_id":"resident-01","location":"living_room"}`, or **POST /api/simulator/activity** with **no body**. Both create new stored incidents.
7. To inspect data, open `<PUBLIC_URL>/api/incidents`; an actionable incident has `resident_id: "resident-01"` and `status: "awaiting_resident_response"` before the resident answers.

**Important distinction:** `POST /utility-anomaly` is the **real machine-learning inference endpoint**, not a guaranteed injector. It may return `"is_anomaly": false` and correctly save no incident. To exercise that model from Swagger supply all required sensor fields and a **current timestamp**. Example JSON (extreme inactivity intended to trip its rule; actual results still follow the detector):

```json
{
  "timestamp": "2026-10-18T17:30:00+08:00",
  "power_kw": 0.1,
  "water_lpm": 0,
  "inactivity_mins": 180,
  "door_transitions_15m": 0,
  "resident_state": "HOME",
  "resident_id": "resident-01",
  "location": "living_room",
  "simulation": true,
  "anomaly_kind": "inactivity"
}
```

Update the timestamp to the **current Malaysia local time** when running this request. If inference returns `is_anomaly: true`, its `incident_id` can open `/companion?eventId=<incident_id>`. For a fresh dependable demo, prefer the simulator endpoint.

## 6. Common problems

| Symptom | Fix |
|---|---|
| Cloudflare link suddenly doesn't load | Confirm all three terminals are running; Quick Tunnel URL may have changed |
| Family dashboard has no alerts, Coordinator does | **Switch the Family dashboard to Live Mode**, select Alerts > All and ensure `resident_id` is `resident-01` |
| Coordinator/Responder shows only sample incidents | Change each dashboard's Data mode to **Live Mode** |
| Live screens show Backend unavailable | First check `127.0.0.1:8000/health`, then `<PUBLIC_URL>/api/incidents` |
| `/api/incidents` gives Vite HTML/404 or tunnel error | Check Vite port 5173, Cloudflare destination, Vite proxy and blank `VITE_API_BASE_URL` |
| Home Companion shows no newly injected incident | Return to plain `/companion` or `/simulator`, use a freshly created incident, open check-in immediately |
| Swagger utility anomaly returns `is_anomaly: false` | That is a valid negative model result, not an API failure. Use `/api/simulator/activity` for guaranteed mock event |
| Start command says `5173 is already in use` | Stop old Vite process before starting the new branch/build |
| Updating Git branch fails on `vite.config.ts` | Stash your local config, fast-forward, and compare before applying it back |

## 7. Stop safely

- `Ctrl+C` in the Cloudflare terminal closes the public link.
- `Ctrl+C` in the Vite terminal stops the frontend.
- `Ctrl+C` in the FastAPI terminal stops the backend.
- Existing saved local incident data can remain at `data/runtime/`; use the simulator reset when you specifically want to clear it.

## Next step

For a stable public URL that does not depend on a laptop, see [Render deployment](RENDER_DEPLOYMENT.md). Do not confuse a **fixed URL** with guaranteed always-on uptime or persistent data.
