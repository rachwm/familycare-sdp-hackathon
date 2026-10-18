# Field Responder demo

From the repository root:

```sh
cd frontend
pnpm dev --host 127.0.0.1
```

Open **http://127.0.0.1:5173/responder**. A direct load starts with Daniel Lim's
mock assignment for Puan Aisha. `/responder/` also works.

For the five-minute demo:

1. Accept Assignment — 10:49 AM.
2. I'm On the Way — 10:50 AM.
3. Confirm Arrival — 10:58 AM.
4. Select Safe or Needs further assistance; optionally enter visit notes.
5. Submit Report & Complete Visit — stores the check at 11:03 AM and the report
   at 11:20 AM, then shows the visit confirmation.
6. View Family Demo Update — opens the existing Family incident view in Demo
   Mode with the same timeline, condition and notes. Return to Responder Dashboard
   preserves the submitted report. Start a new demo visit resets the shared demo.

A Safe report resolves the demo incident. Needs further assistance completes the
visit report but keeps the incident open for coordinator follow-up. Neither sends
real notifications or contacts emergency services.

All field actions are explicitly simulated. There are no responder API calls,
GPS/maps or automatic matching. Existing Family Live Mode still uses its original
API integration; entering `/responder` does not poll or write to that API.

The report lives in the existing App-owned demo state, not a separate store. It
persists across in-app navigation, but a page reload starts a fresh demonstration;
separate tabs are not synchronized. No backend persistence is claimed.

The page reuses Brand, Botanical, Avatar and Icon. New styles use the
`field-responder-` prefix to avoid changing Family/Coordinator layouts.

Run `pnpm build` and `pnpm test` from `frontend/`. Focused reducer tests are in
`tests/responder.test.ts`; existing family, coordinator and live API tests remain
part of the same test command.
