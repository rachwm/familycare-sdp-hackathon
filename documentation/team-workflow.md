# FamilyCare team workflow

## Branches

- `main` is the submission-ready branch.
- Create a short-lived branch for each feature, fix, or documentation update.
- Open a pull request into `main`; do not develop directly on the deployed branch.
- Keep the live Render deployment pointed at `main`.

## Before merging

1. Pull or branch from the latest `main`.
2. Run the relevant backend and frontend tests.
3. Confirm that demo-only behavior is labelled as simulated.
4. Check that no credentials or real resident data were added.
5. Update the README or API contract when routes or demo steps change.
6. Ask another teammate to exercise the affected end-to-end flow when practical.

## Definition of done

A change is ready when:

- automated tests pass;
- the frontend production build succeeds;
- the live demo flow has no broken links;
- claims match the implemented behavior;
- limitations are documented; and
- the pull request can be merged without conflicts.

## Submission freeze

During the final submission window, merge only fixes for broken access, incorrect claims, or critical demo failures. Record the final commit SHA, test every submitted link in a private browser window, and save the submission confirmation.
