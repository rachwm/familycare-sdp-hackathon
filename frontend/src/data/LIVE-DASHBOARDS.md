# Coordinator and Field Responder live reads

Open `/coordinator` or `/responder` and choose **Live Mode** in **Data mode**.
The operations mode is stored separately from the existing Family Dashboard
preference. Demo Mode remains the default and keeps the simulated workflows.

Both dashboards reuse `fetchLiveIncidents`, `isLiveIncident`, sorting and date/time
formatters from the Family API integration. `fetchLiveIncident` adds the existing
`GET /api/incidents/{event_id}` endpoint using the same validator. The role-specific
provider polls the list and selected detail independently, three seconds after
each request finishes, with an eight-second timeout. Mode/route changes abort
obsolete requests; failures clear the displayed data and retry automatically.
404 detail, empty list, initial loading and unavailable backend are distinct states.

Live Mode displays all returned residents and the actual event ID, resident ID,
detection timestamp (raw ISO and Malaysia date/time), location, severity, incident
status, responder-request status and backend simulation flag. No resident name,
portrait, named responder, assignment or progress is inferred from demo data.
`requested` is a responder request, not an assignment or acceptance.

Only the two GET endpoints are connected. Named assignment, acceptance, departure,
arrival, visit report submission and report retrieval need backend APIs. Those
simulated controls are available only in Demo Mode. Resolution of an incident is
not presented as a submitted visit report. No POST actions were added.

For local development, Vite already proxies `/api` to `http://127.0.0.1:8000`.
Alternatively set the existing `VITE_API_BASE_URL` to the backend origin and restart
the frontend. For a deployed frontend this is a build-time setting; the backend
must be publicly reachable over HTTPS and permit the frontend origin through CORS.
Existing public demo sites have not been redeployed. Public Live Mode has not
been verified and must not be presented as available without that backend.

The original Family Dashboard polling, resident filter, UI and mode preference
remain unchanged. No backend code, dependencies, shared styles or hosting source
have been changed by this integration.
