# IndiCare Frontend Next — PARKED

This folder is **not** the live production frontend.

The single live front door is:

```txt
frontend-next
```

Render service: `indicare-frontend-next`  
Render root directory: `frontend-next`  
Production domain: `app.indicare.co.uk`

## Why this folder is parked

This folder was created during a frontend consolidation attempt. The decision has now been made to stop moving front doors and continue building inside the already-live `frontend-next` app.

Do not point Render at this folder unless a future migration is deliberately planned, reviewed and build-tested.

## Current rule

- Build live IndiCare OS in `frontend-next`.
- Do not delete `frontend-next`.
- Do not symlink `frontend-next`.
- Do not change Render rootDir away from `frontend-next`.
- Use this folder only as reference/staging until deliberately revived.

## Brief-led OS work to harvest if useful

Some brief-led route/component ideas were started here and may be copied into `frontend-next` carefully:

- story-first landing language
- home selection language
- child story route concepts
- ORB diagnostics UI concepts
- `IndiCareOsShell` component ideas

Copy ideas, not the front door.
