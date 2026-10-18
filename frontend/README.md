# FamilyCare mobile dashboard

React, TypeScript, Vite and React Router. The approved screenshots in
`designs/family-dashboard/` are the visual references. Demo Mode uses mock data;
Live Mode reads fall incidents from the existing FastAPI endpoint.

## Run locally

Install Node.js 22.12 or newer, then from the repository:

```sh
cd frontend
npm install
npm run dev
```

Open the Local URL printed by Vite, usually http://localhost:5173.
If you use pnpm, `pnpm install --frozen-lockfile` and `pnpm dev` also work.
The included pnpm lockfile records the validated dependency versions.

## Test Live Mode

Start the FastAPI backend from the repository root in one terminal on Windows:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

In another terminal, run `npm run dev` from `frontend/`, open the Vite URL,
scroll below the dashboard, and choose **Live Mode** under **Data mode**. Home,
Alerts, History and Incident Details then read `GET /api/incidents` every three
seconds. No incidents shows an empty message; if FastAPI stops, the page shows
**Backend unavailable** and retains the last received incidents for reference.
The Family pages show incidents for the linked `resident-01` record only.
The Vite development server proxies `/api` to FastAPI, so the same Vite Network
URL works on a phone on the same Wi-Fi. A production host must proxy `/api` to
FastAPI or build with `VITE_API_BASE_URL` set to a browser-accessible backend
origin with CORS configured. A remote browser cannot reach your Mac's
`127.0.0.1` directly. The existing hosted demo has not been redeployed by this
local change.

Switch back to **Demo Mode** to use the nine original scenarios. Live Mode only
shows incident fields and milestones actually recorded by the backend; it does
not claim that a responder was assigned, arrived, or completed a visit.

## Open on your phone

Connect the phone and computer to the same Wi-Fi. Keep both terminals running
and open Vite's **Network** URL in Safari or Chrome, for example
`http://192.168.0.211:5173`. Use the address and port printed by Vite; they can
change. On Windows, allow Node.js through Windows Defender Firewall for private
networks if prompted. Localhost on a phone points to the phone, so do not open
the Local URL there.

## Pages and navigation

- `/`: Screen 06's normal homepage, with incident variants using the selected state.
- `/alerts`: safety incidents only, with All / Falls / Unusual Activity filters.
  Each incident has one card that updates as its response progresses. Routine
  check-ins, medication reminders and connection updates remain in Home and History.
  Cards label the original time as Detected. Active and resolved incidents appear
  in separate sections; an incident is resolved when its visit is completed.
- `/history`: Screen 24, with dated groups and All / Check-ins / Medication filters.
- `/profile`: Screen 25, with approved account and linked-resident cards.
- `/incidents/:incidentId`: full incident, visit details or visit summary page.
- `/activities/:activityId`: full details for recorded routine activities.
- `/resident`: linked-resident and connection details. No dedicated resident-details
  design was supplied, so this reuses the approved profile and incident card styles.
- `/profile/:section`: read-only personal information, emergency contacts, privacy
  information and help pages. No contact details, addresses or medical information
  are invented. Log Out is visibly unavailable because authentication is not built.

Every tab is a real route. Recent records and alert cards link to full detail
pages. Back returns to the previous page, including its selected filter; direct
entry to a detail URL falls back to Home. There are no navigation dialogs.
Vite serves deep links during development. A future production host must rewrite
non-asset requests to `index.html` for BrowserRouter deep links.

## Demonstration states

Scroll below the page to **Demo scenarios** and select:

1. Normal monitoring
2. Possible fall detected
3. Unusual activity detected (a separate incident)
4. Assistance requested
5. Responder assigned
6. Responder on the way
7. Responder arrived
8. Resident checked
9. Visit completed

The scenario selector appears only in development; the data mode selector is
available in both development and production. Both persist in this tab's
session storage, including when refreshing or navigating to a detail page.
The production build starts in Demo Mode and omits the scenario selector.
Changing the scenario on an incident page updates the displayed incident; selecting
Normal returns Home. Scenarios change only when selected; there is no background
clock or automatic escalation. Mock data never calls or dispatches anyone.

The demonstration date is **16 October 2026**. The fall timeline contains only
events that have occurred at the selected stage:

| Time | Event |
| --- | --- |
| 10:32 AM | Possible fall detected |
| 10:32 AM | Resident check-in started |
| 10:47 AM | Assistance requested |
| 10:48 AM | Responder assigned |
| 10:50 AM | Responder on the way |
| 10:58 AM | Responder arrived |
| 11:03 AM | Resident checked |
| 11:20 AM | Visit completed |

Incident timelines run oldest to newest. Home, Alerts and History show the latest
records first. Yesterday's routine records use 15 October 2026. Unusual activity
uses 2:18 PM, as in Screen 23, and shows its check-in without future escalation.
Daniel Lim is the demonstration responder named in the approved references.

## Checks

```sh
npm run build
npm test
npm run preview
```

The build performs strict TypeScript checks and outputs `dist/`. The tests check
chronology, exact requested timestamps, isolation of the unusual incident, and
absence of future events in all scenario stages. Tests use Node's built-in test
runner and TypeScript stripping, without an extra test dependency.

Browser checklist: navigate all four tabs; filter Alerts and History; open a
routine activity, linked resident and incident; use Back; switch every scenario;
check the completion timeline and 375/390px layouts. All pages must remain full
pages, with no `<dialog>` or modal navigation.

## Source structure

- `src/App.tsx`: routes, page shell and scenario persistence.
- `src/pages/`: Home, Alerts, History, Profile, incident and other detail pages.
- `src/components/`: shared cards, portrait, icons, logo, filters, navigation and SVG foliage.
- `src/data/mockData.ts`: UI fixtures and scenario timeline selectors, separate from backend contracts.
- `src/styles.css`: mobile proportions, safe-area spacing, fixed navigation and responsive styles.
- `tests/scenarios.test.ts`: chronological scenario checks.

The local screenshot assets are used **only for the approved portrait regions**
through SVG viewports. The application interface is real React markup, never a
screenshot background. Replace these source references with standalone approved
portrait assets when supplied. Logo and botanical accents are local SVG recreations.
DM Sans loads from Google Fonts with system fallbacks.

The backend, models, Home Companion, sensor simulators and API contracts are
unchanged. Authentication, account editing and real responder dispatch remain
outside this frontend milestone. The coordinator demo is described below.


## SDP Coordinator Dashboard

Open **http://127.0.0.1:5173/coordinator** after running `pnpm dev` from `frontend/`.
The Family Dashboard stays at `/`; its development scenario controls still work.
All data uses **16 October 2026** as the fixed demonstration date.

### Navigation

- `/coordinator`: emergency triage overview with shared summary counts. New
  Assistance Requests opens Incidents / New Requests, Responders On Task opens
  Responders / On Task, and Completed Today opens Reports / Today.
- `/coordinator/incidents`: All, New Requests, In Progress and Resolved filters,
  plus resident/location/incident search. Each row opens that incident's details.
- `/coordinator/incidents/:id`: read-only resident information, confirmed timeline,
  automatic matching, assignment review and exceptional coordinator actions.
- `/coordinator/incidents/:id/track`: response milestones, simulated route, family
  notification status and reassign/escalate controls. A journey is shown only
  after acceptance and explicit departure. Direct links before departure explain
  the pending state instead of showing a journey.
- `/coordinator/responders`: All, Available, On Task and Unavailable filters,
  search, availability/capability information and links to actual assignments.
- `/coordinator/residents` and `/coordinator/residents/:id`: linked-resident
  directory and read-only profiles with related incidents.
- `/coordinator/reports` and `/coordinator/reports/:id`: submitted visit reports,
  Today filter, search, documented outcomes and actual submission times.
- `/coordinator/settings`: working notification-indicator and compact-directory
  preferences, persisted in local browser storage when available.

The collapsible sidebar highlights the current destination. Filters and search
use URL queries and work with browser Back. Reference cases for Mr. Tan and
Mdm. Lee have distinct incident URLs and read-only case details. Puan Mariam's
fictional completed visit is an existing demo report; its record also contributes
to Completed Today. The Aisha simulation contributes one incident record through
all updates, never separate records per milestone. Normal monitoring removes all
active incidents but retains the completed demonstration report.

### Main demonstration flows

1. Open the overview. A fresh coordinator load starts at Assistance requested,
   **10:47 AM**. Automatic matching begins after 1.5 seconds and offers the best
   eligible candidate after another 1.5 seconds. The timer continues across pages.
2. Open **View Incident Details**. Daniel is assigned at **10:48 AM**, awaiting
   acceptance. Before departure the map shows only the resident's mock location.
3. Use **Simulate Daniel Lim Accepting** for **10:49 AM**, then **Confirm Demo
   Departure** for **10:50 AM**. Track Incident now becomes available.
4. Advance to arrival at **10:58 AM** and resident check at **11:03 AM**. Submit
   Visit Report & Resolve records completion and Nur Aisha's mock outcome update
   at **11:20 AM**. The report and Completed Today counter update together.
5. Instead of accepting Daniel, simulate his decline. His offer stays in the audit
   history. Matching offers **Mei Chen**, the next eligible available candidate.
   She must separately accept and confirm departure; the old route is not reused
   as her confirmed journey. Replacement timings never move backwards.
6. Test **Reassign Responder** and **Escalate Incident** separately. Each opens a
   confirmation dialog; Cancel/Escape leaves state unchanged. Confirm shows an
   updating state and success feedback. Reassignment releases the current offer
   and tries the next eligible responder. Escalation records urgent supervisor
   support review and pauses routine progression without completing a report.
7. To test unavailable candidates, choose Possible fall detected, open Responders,
   and turn off Available in demo for Daniel and Mei. Advance to Assistance
   requested and wait for matching. The overview shows **Coordinator Action
   Required**. Review availability or escalate; no replacement is fabricated.
   Changing availability can allow waiting matching to resume.

Matching filters by configured service area, availability, suitable capability,
current assignments and exclusions, then ranks by deterministic simulated travel
minutes. A decline/release excludes that responder from the current attempt.
The demo exposes availability controls for eligible unassigned mock responders;
these are demonstration switches, not a live operational availability service.
Reset demo clears exclusions and availability switches.

The central state is owned by `App.tsx`. Pure transitions live in
`src/coordinator/demo.ts`; `records.ts` derives incident directories, responder
assignments, reports, filters and all summary counts. `familyBridge.tsx` supplies
that same coordinator record to the Family Dashboard without changing legacy
family scenario behavior. Family status, activity history, alert description and
incident timeline use the current responder, including replacements.
State is maintained across in-app navigation; reloading starts a fresh demo.
Preferences persist locally; separate tabs/users are not synchronized.

### Verification and integration

Run `pnpm test` and `pnpm build` from `frontend/`. Focused tests cover distinct
navigation destinations, filters/search, per-record URLs, counters, assignment
ranking, backup matching, unavailable candidates, audit history, chronology,
tracking gates, report submission and existing Family Dashboard scenarios.

All maps, distances, ETAs, assignments, visit outcomes and notification statuses
are mock-only. Only the approved portrait region is displayed from the responder
reference image. No live GPS, verified clinical assessment, real notification
receipt or external emergency-service integration is claimed.

Remaining dependencies are an agreed FastAPI incident/responder contract,
authentication and coordinator role checks, live responder availability and
milestone signals, stored visit reports, notification acknowledgements and
verified map/ETA data. No backend endpoints have been invented, and Python,
ML, sensor processing and Home Companion implementation remain unchanged.

### Files in this refinement

Coordinator interface and shared records:

- `src/coordinator/Coordinator.tsx`
- `src/coordinator/CoordinatorParts.tsx`
- `src/coordinator/DirectoryPages.tsx`
- `src/coordinator/coordinator.css`
- `src/coordinator/demo.ts`
- `src/coordinator/records.ts`
- `src/coordinator/familyBridge.tsx`

Routing and optional shared-state integration for the existing family screens:

- `src/App.tsx`
- `src/components/ResidentCard.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/AlertsPage.tsx`
- `src/pages/HistoryPage.tsx`
- `src/pages/IncidentPage.tsx`

Tests and documentation:

- `tests/coordinator.test.ts`
- `tests/coordinator-navigation.test.ts`
- `README.md`

Earlier uncommitted coordinator-milestone changes to the test command, shared
assignment timestamp, base styles and legacy scenario timestamp test are retained.
No additional dependencies were introduced by this refinement.
