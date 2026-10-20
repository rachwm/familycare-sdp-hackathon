# Live responder demo integration

Choose Live Mode separately in each dashboard tab. The operations dashboards use
`GET /api/incidents` and `GET /api/incidents/{event_id}` with three-second polling.

Coordinator: open an escalated incident for resident-01 (Puan Aisha) and select
Assign Daniel Lim. The request sends the existing demo responder ID `daniel`, name
`Daniel Lim` and an empty phone string (no phone number has been supplied).

Responder: open the same incident in `/responder?event_id=<actual event ID>` and
select Accept Assignment, I'm On the Way, Confirm Arrival, then submit the report.
The canonical POST endpoints are `/api/incidents/{event_id}/assign-responder`,
`/responder-status`, and `/visit-report`. Payload fields match the backend team's
models: responder_id/name/phone; responder_status; summary/resident_condition/action_taken.

The minimal backend adaptation stores responder identity, status timestamps and
visit_report on the existing FallEvent in memory before broadcasting. Each write
returns the updated event, and list/detail reads retain it. Invalid ordering,
duplicate assignments, completed visits and missing IDs are rejected. Safe resolves
the incident. Needs further assistance records a completed visit report while
leaving the incident open for follow-up; it is not an automatic resolution.

Sarah's Family Live Mode still polls resident-01 incidents. The incident page now
shows the confirmed responder and saved report/outcome using existing cards.
No WebSocket subscription is needed. Demo Mode remains independent and unchanged.

Local Vite defaults to `/api` proxying to port 8000. `VITE_API_BASE_URL` may select
another accessible backend at build/start time. Existing public demos are not
redeployed and public Live Mode is not claimed to work. Storage is in-memory;
server restarts clear records. No authentication or responder authorization is
introduced in this hackathon integration.

Backend edits for teammate review: models/events.py, routes/incidents.py,
services/incident_manager.py, plus tests/test_responder_workflow.py. Existing
uncommitted routes/anomaly_events.py contents are preserved byte for byte.
