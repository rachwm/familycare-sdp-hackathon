# FamilyCare API Contract

This document defines how the sensor and simulator inputs, Home Companion,
Family Dashboard, SDP Coordinator Response Center, and Responder Dashboard
communicate with the FamilyCare FastAPI backend.

## Current version

- Schema version: `1.0`
- Production API base URL: `https://familycare-sdp-hackathon.onrender.com`
- Local API base URL: `http://127.0.0.1:8000`
- Content type: `application/json`
- Confidence scale: `0.0` to `1.0`
- Timestamp format: ISO 8601 with Malaysia's UTC+08:00 offset
- Live API documentation: `https://familycare-sdp-hackathon.onrender.com/docs`
- WebSocket: `wss://familycare-sdp-hackathon.onrender.com/ws`

The deployed frontend and API share one origin. Browser requests therefore use
relative paths such as `/api/incidents`. Connected prototype views poll the
incident API and also receive incident and reminder updates over `/ws`.

## Component responsibilities

| Component | API responsibility |
| --- | --- |
| Fall detector or sensor simulator | Creates a possible-fall event |
| Routine-anomaly detector or simulator | Creates an unusual-activity event |
| Home Companion | Sends `resident_okay`, `resident_needs_help` or `timeout` |
| Family Dashboard | Reads the incident list and current incident status |
| SDP Coordinator | Requests or assigns a responder and reviews incident progress |
| Responder Dashboard | Records acceptance, travel, arrival, and the visit outcome |
| FastAPI backend | Validates data, stores demo state, broadcasts updates, and manages transitions |

## Incident flow

```text
Fall score reaches threshold
        |
        v
awaiting_resident_response
        |
        +-- resident_okay ------> resolved
        |
        +-- resident_needs_help -> resident_needs_help
        |
        +-- timeout ------------> no_response
```

Both `resident_needs_help` and `no_response` set:

```json
{
  "severity": "critical",
  "requires_responder": true
}
```

## Fall-event object

The detector sends this object when its fall score reaches the decision
threshold. A below-threshold result is not sent to the backend.

```json
{
  "schema_version": "1.0",
  "event_id": "fall-a1b2c3d4e5f6",
  "event_type": "possible_fall",
  "source": "fall_detector",
  "resident_id": "resident-01",
  "location": "living_room",
  "severity": "warning",
  "status": "awaiting_resident_response",
  "confidence": 0.92,
  "timestamp": "2026-10-16T10:30:00+08:00",
  "requires_resident_check_in": true,
  "simulation": false,
  "details": {
    "model_version": "random-forest-v1",
    "decision_threshold": 0.45,
    "source_file": "Areeb_back_1.csv",
    "evidence": {
      "number_of_frames": 30,
      "total_detected_points": 420,
      "z_centroid_start": 1.42,
      "z_centroid_end": 0.24,
      "z_centroid_change": -1.18,
      "maximum_downward_z_step": 0.71,
      "mean_absolute_velocity": 0.36,
      "maximum_absolute_velocity": 1.84,
      "centroid_path_length": 2.17
    }
  }
}
```

For a simulated fall, set `simulation` to `true`. If the field is omitted,
the backend stores it as `false`.

### Required fields

| Field | Type | Allowed value or meaning |
| --- | --- | --- |
| `schema_version` | string | Must be `1.0` |
| `event_id` | string | Unique event identifier; maximum 100 characters |
| `event_type` | string | Must be `possible_fall` |
| `source` | string | Must be `fall_detector` |
| `resident_id` | string | Resident identifier such as `resident-01` |
| `location` | string | Normalized room name such as `living_room` |
| `severity` | string | `warning` when first detected; `critical` after escalation |
| `status` | string | Current incident state |
| `confidence` | number | Random Forest score from `0.0` to `1.0` |
| `timestamp` | string | ISO 8601 timestamp with `+08:00` offset |
| `requires_resident_check_in` | boolean | `true` for a newly detected fall |
| `details` | object | Model version, threshold, source file and evidence |

### Fields managed by the backend

The frontend should read these fields but should not manually calculate them.

| Field | Initial value | Meaning |
| --- | --- | --- |
| `resident_response` | `null` | Final response received from the resident |
| `response_timestamp` | `null` | Time the response or timeout was recorded |
| `requires_responder` | `false` | Whether family or an SDP responder should act |
| `responder_status` | `not_requested` | `not_requested`, `requested`, `assigned`, `accepted`, `on_the_way`, `arrived` or `resolved` |
| `responder_request_timestamp` | `null` | Time a responder was requested |
| `resolution_timestamp` | `null` | Time the incident was resolved |

### Evidence guidance

Evidence supports the decision and helps the team explain an alert. It must
not be presented as a medical diagnosis.

- `z_centroid_start` and `z_centroid_end` describe estimated radar height.
- `z_centroid_change` describes the overall height change.
- `maximum_downward_z_step` is the largest inter-frame height decrease. It is
  not currently a metres-per-second measurement.
- Velocity fields come from radar Doppler measurements.
- `floor_dwell_seconds` and `post_event_movement` may appear in simulated
  evidence but are not currently part of the trained dataset features.
- `confidence` is a model score, not a medically calibrated probability.

## Endpoints

### Health check

```http
GET /health
```

Example response:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "development",
  "timezone": "Asia/Kuala_Lumpur"
}
```

This checks the backend service, not the health of a resident.

### Create a possible-fall event

```http
POST /api/fall-events
Content-Type: application/json
```

Request body: one fall-event object.

Success status: `201 Created`

```json
{
  "accepted": true,
  "message": "Possible fall accepted; resident check-in is required.",
  "event": {
    "event_id": "fall-a1b2c3d4e5f6",
    "status": "awaiting_resident_response"
  }
}
```

The actual response contains the complete event object. A duplicate
`event_id` returns `409 Conflict`; invalid fields return `422 Unprocessable
Entity`.

### List fall events

```http
GET /api/fall-events
```

Returns an array containing every fall event held by the prototype server.

### Get one fall event

```http
GET /api/fall-events/{event_id}
```

Returns the complete event, or `404 Not Found` when the ID does not exist.

### Submit the resident's response

```http
POST /api/incidents/{event_id}/response
Content-Type: application/json
```

This shared route accepts a response for either a fall or routine-anomaly
check-in. The fall-specific route remains available for compatibility. The
Home Companion sends one of the following request bodies.

Resident selected **I'm okay**:

```json
{
  "response": "resident_okay"
}
```

Resident selected **I need help**:

```json
{
  "response": "resident_needs_help"
}
```

Countdown ended without a response:

```json
{
  "response": "timeout"
}
```

An optional timestamp may be supplied:

```json
{
  "response": "resident_okay",
  "timestamp": "2026-10-16T10:31:12+08:00"
}
```

If no timestamp is supplied, the backend records the current Malaysia time.

Success response:

```json
{
  "accepted": true,
  "action": "resident_okay",
  "message": "Resident confirmed they are okay. The incident has been resolved.",
  "event": {
    "event_id": "fall-a1b2c3d4e5f6",
    "status": "resolved",
    "severity": "warning",
    "resident_response": "resident_okay",
    "requires_resident_check_in": false,
    "requires_responder": false
  }
}
```

The actual response contains the complete updated event. An unknown ID
returns `404 Not Found`. A second response to an already handled incident
returns `409 Conflict`.

### List all current incidents

```http
GET /api/incidents
```

This is the recommended shared dashboard endpoint. It returns both possible-fall
and unusual-activity incidents using the same incident view.

It can be filtered by one status:

```http
GET /api/incidents?status=awaiting_resident_response
GET /api/incidents?status=resident_needs_help
GET /api/incidents?status=no_response
GET /api/incidents?status=resolved
```

### Get the current status of one incident

```http
GET /api/incidents/{event_id}
```

This is the recommended endpoint when the Home Companion or Family Dashboard
already knows the incident ID and needs its latest state.

### Apply a dashboard action

```http
POST /api/incidents/{event_id}/actions
Content-Type: application/json
```

The dashboard may request a responder after the resident selects **I need
help** or the check-in times out:

```json
{
  "action": "request_responder"
}
```

It may also resolve an active incident:

```json
{
  "action": "resolve"
}
```

There is no `acknowledge` action. Requesting a responder preserves the
resident status and sets `responder_status` to `requested`. Resolving sets
the incident status and responder status to `resolved`.

A responder request made before escalation, a repeated responder request or
an action on a resolved incident returns `409 Conflict`.

### Simulate a fall scenario

```http
POST /api/simulator/fall
Content-Type: application/json
```

Example request:

```json
{
  "scenario": "fall",
  "resident_id": "resident-01",
  "location": "living_room"
}
```

Allowed scenarios:

| Scenario | Creates an incident? | Demo purpose |
| --- | --- | --- |
| `fall` | Yes | Trigger the emergency check-in workflow |
| `false_positive` | Yes | Let the resident dismiss an incorrect alert with **I'm okay** |
| `sitting` | No | Demonstrate normal controlled movement |
| `lying_down` | No | Demonstrate a gradual posture transition |
| `exercise` | No | Demonstrate high activity without a fall |

Example response when an incident is created:

```json
{
  "scenario": "fall",
  "event_created": true,
  "message": "Simulated fall created; resident check-in is required.",
  "event": {
    "event_id": "fall-a1b2c3d4e5f6",
    "simulation": true,
    "status": "awaiting_resident_response"
  },
  "detection": null
}
```

The actual `event` contains the complete fall-event object. Normal-activity
responses set `event_created` to `false`, return `event` as `null`, and place
the below-threshold result in `detection`.

## Status and UI mapping

| API status | Home Companion | Family Dashboard |
| --- | --- | --- |
| `awaiting_resident_response` | Show check-in and countdown | Show possible fall; awaiting response |
| `resolved` | Show reassurance message | Show resident confirmed okay |
| `resident_needs_help` | Show help-is-coming message | Show critical help request |
| `no_response` | Show escalation message | Show critical no-response alert |

## Frontend request examples

### Home Companion response

```typescript
await fetch(
  `/api/incidents/${eventId}/response`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: "resident_okay" }),
  },
);
```

### Family Dashboard polling

```typescript
const response = await fetch(
  "/api/incidents",
);

const incidents = await response.json();
```

## Prototype limitations

- Authentication and role-based authorization are outside the hackathon demo.
- The public simulator, reset actions, dashboards, and API must not be used for
  real resident monitoring or emergency response.
- Demo incidents and reminders use lightweight prototype persistence and may
  disappear after a Render restart, redeploy, or free-tier spin-down.
- WebSocket delivery is best-effort and is not a guaranteed emergency
  notification channel.
- Sensor events, assignments, locations, travel estimates, and visit outcomes
  shown in the demonstration are simulated unless explicitly identified as
  model-evaluation evidence.
- The fall model is preliminary and not clinically validated.
