# IndiCare Frontend Next Migration Plan

This folder is the safe convergence target for the brief-led IndiCare OS frontend.

## Current rule

Do not delete, symlink or replace existing frontend folders until this folder is fully buildable and reviewed.

## Source folders to harvest from later

- `frontend-next` — mature OS routes, components, lib tree and ORB operational UI.
- `indicare-app` — child workspace experiments, typed record forms, review state badges and workspace interaction patterns if needed.

## Safe convergence order

1. Create folder structure only.
2. Copy foundational app files into this folder.
3. Copy the full `lib/` tree before importing any `@/lib/*` modules.
4. Copy shared components.
5. Copy routes one group at a time.
6. Run build after each route group.
7. Only update Render rootDir once the build passes.
8. Only remove or symlink legacy frontend folders after production is verified.

## Non-negotiables

- No destructive deletions during migration.
- No symlink replacement until final review.
- No Render rootDir change until `npm run build` passes inside `indicare-frontend-next`.
- ORB OS route should use `/api/assistant/orb/conversation`.
- ORB diagnostics should use `/api/assistant/orb/evidence-diagnostics`.

## Desired final product

The finished app should feel like one coherent IndiCare OS:

- story-first young person pages
- clear home/provider selection
- calm operating shell
- ORB as the evidence-aware OS brain
- recording, chronology, plans, documents, handover, archive and reviews under one visual system
- no duplicate-looking operating systems
