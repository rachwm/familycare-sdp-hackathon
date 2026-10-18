# familycare-sdp-hackathon
Elderly-first home safety and response system for the Sime Darby Property University Hackathon 2026

## Integrated prototype

The full app currently lives on **`integration/full-prototype-test`**, rather than `main`. It contains one React frontend for all roles and a FastAPI backend.

### Start here

- **[Cloudflare backup: Windows + VS Code startup manual](documentation/CLOUDFLARE_QUICK_START.md)**: copy/paste commands, three terminals, temporary public URL, Live Mode, WebSockets and troubleshooting.
- **[Render: permanently named public URL](documentation/RENDER_DEPLOYMENT.md)**: one Docker/Render Blueprint web service for React, FastAPI, WebSocket and Swagger, with Free/paid uptime and data persistence tradeoffs.
- **[Backend API contract](documentation/api-contract.md)**: detailed API request and response shapes.

### Demo API routes

| Endpoint | Purpose |
|---|---|
| `POST /api/simulator/fall` | Generate a simulated fall, creating a resident check-in |
| `POST /api/simulator/activity` | Generate a guaranteed **simulated** unusual-activity/inactivity alert |
| `POST /utility-anomaly` | Run the trained utility/activity anomaly **inference** model; normal inputs create no incident |
| `GET /api/incidents` | Read saved incidents for Family, SDP and Responder dashboards |
| `POST /api/incidents/{event_id}/response` | Save resident's "I'm okay" or "I need help" decision |
| `/ws` | Broadcast incident and reminder notifications to connected pages |

The Family, Coordinator and Responder dashboards each have separate Live Mode controls. The simulated sensor tools and unauthenticated endpoints are for **demonstration only**, not real emergency operations.
