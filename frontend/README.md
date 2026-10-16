# FamilyCare mobile dashboard

React, TypeScript, Vite and React Router. The approved screenshots in
`designs/family-dashboard/` are the visual references. All records are mock data;
there is no backend connection or dispatch functionality.

## Run on your Mac

Install Node.js 22.12 or newer, then from the repository:

```sh
cd frontend
npm install
npm run dev
```

Open the Local URL printed by Vite, usually http://localhost:5173.
If you use pnpm, `pnpm install --frozen-lockfile` and `pnpm dev` also work.
The included pnpm lockfile records the validated dependency versions.

## Open on your phone

Connect the phone and Mac to the same Wi-Fi. Keep the server running and open
Vite's **Network** URL in Safari or Chrome, for example `http://192.168.0.211:5173`.
Use the address and port printed by your server; they can change. Allow Node
through the macOS firewall if prompted. Localhost on a phone points to the phone.

## Pages and navigation

- `/`: Screen 06's normal homepage, with incident variants using the selected state.
- `/alerts`: Screen 23, with All / Unusual Activity / Updates filters.
- `/history`: Screen 24, with dated groups and All / Check-ins / Medication / Alerts filters.
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

The controls appear only in development. The scenario persists in this tab's
session storage, including when refreshing or navigating to a detail page.
The production build starts in Normal monitoring and omits these controls.
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
| 10:47 AM | Responder assigned |
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
unchanged. Authentication, account editing, live integrations and the responder
dashboard remain outside this frontend milestone.
