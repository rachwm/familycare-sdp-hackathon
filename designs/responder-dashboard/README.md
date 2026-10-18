# FamilyCare — Responder Dashboard UI References

**Prototype design assets for the Sime Darby Property hackathon.**

These screenshots are **visual references** for the interactive React application. They are *not* working screens, approved medical workflows, or evidence that a real SDP emergency-response service, GPS system, or response-time SLA is in place.

## Reference files

| File | Interface | Scope |
|---|---|---|
| `01_response_centre_overview.png` | SDP Response Centre overview | Urgent new requests and other active cases. Sidebar hidden behind hamburger navigation. |
| `02_incident_details_auto_assignment.png` | Incident Details | **User-selected visual reference** for viewing Puan Aisha's incident, incident timeline, resident/family information (read-only), and responder assignment/oversight. |
| `03_track_incident.png` | Track Incident | Assigned responder progress, illustrative route, confirmation milestones and family notification. |
| `04_field_responder_dashboard.png` | Field Responder | Daniel Lim's mobile screen for a confirmed assignment, departure, arrival and directions. |
| `05_responder_visit_flow_reference.png` | Resident check and visit | Visit workflow storyboard; implementation can split stages into separate pages. |

## Authoritative demo scenario (use over inconsistent mockup labels)

| Local demo time (16 Oct 2026) | Confirmed event or workflow state |
|---|---|
| 10:32 AM | Possible fall detected; Home Companion check-in initiated. |
| 10:47 AM | No response after 15 minutes; assistance requested, automatic matching begins. |
| 10:48 AM | Daniel Lim assigned (simulated). |
| 10:49 AM | Daniel accepts assignment (simulated). |
| 10:50 AM | Daniel confirms departure; status becomes **Responder on the way**. |
| 10:58 AM | Daniel confirms arrival. |
| 11:03 AM | Resident check performed/recorded. |
| 11:20 AM | Visit/report completed, resident outcome confirmed and family notified. |

**Important:** `02_incident_details_auto_assignment.png` is the user's **preferred visual composition**, but contains contradictory status details: its header shows 10:47 AM while Daniel is shown as already accepted/en route. In the implementation at 10:47 AM, treat Daniel as an available candidate under matching/awaiting acceptance, NOT dispatched. An implementation at 10:50 AM may show him en route, with all timestamps adjusted to fit. Do not display future timeline milestones as completed. The screenshot itself has been kept unchanged to preserve the user's chosen design.

## Role access, incident state and simulation safeguards

- **Coordinator** reviews incident details, monitors matching and dispatch, may reassign or escalate via distinct confirmation dialogs, and may read approved resident information. The coordinator **cannot edit a resident's profile**.
- **Field responder** accepts/declines an offered job, confirms departure/arrival, performs the check and submits a visit report. Field responders **cannot edit a resident's profile**.
- Auto-assignment should filter by service area, availability, suitability and available estimated travel information; a candidate is not treated as dispatched until accepted and departure is confirmed. Manual reassignment is a fallback.
- **Family dashboard** must show updates from the same incident record, not independent fabricated incidents.
- If urgent medical attention is required, trigger the defined escalation process, **not** automatic resolution or an unsupported ambulance-dispatch claim.
- Route/maps, kilometres, ETA, names, contact details, availability and timestamps in these mockups are **demonstration data**. Do not misrepresent simulated information as verified live GPS or real SDP operations. Avoid exposing private contact information in publicly accessible demos.
- The final workflow should be **confirm arrival → resident check → review & submit visit report → completion**, with no completion until submitted. Some storyboard button labels/times are outdated; implementation rules take priority.

## Where to put these files

Copy this **`responder-dashboard`** directory to:

`familycare-sdp-hackathon/designs/responder-dashboard/`

The code implementation belongs under `frontend/`, not in this designs folder. Commit and push design files to **`feature/family-responder`**, and request a PR to `main` only when the team is ready.
