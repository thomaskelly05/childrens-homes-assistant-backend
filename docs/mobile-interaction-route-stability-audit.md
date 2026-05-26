# Mobile interaction & route stability audit

**Date:** 2026-05-26  
**Branch:** `cursor/mobile-interaction-stability-da18`  
**Scope:** Mobile drawer, ORB composers (`/orb`, `/assistant/orb`), child/home workspace buttons, bottom nav, click blockers.

## Observed symptoms (iPhone Safari)

| # | Symptom |
|---|---------|
| 1 | Standalone `/orb` composer bounces/jumps while typing |
| 2 | ORB input/send area unstable |
| 3 | Mobile menu drawer opens but workspace bleeds through |
| 4 | Menu content hidden/overlapped |
| 5 | Buttons appear dead (no navigation) |
| 6 | Workspace cards missing routes |
| 7 | Home workspace missing expected areas |
| 8 | Child/home buttons not matching intended pages |
| 9 | Bottom nav / Safari bars interfering with taps |
| 10 | Layout feels like squeezed desktop |

## Suspected causes

- Drawer used `w-[min(100%,280px)]` without full-height solid panel layering; backdrop not clearly separated from drawer z-index.
- `scrollIntoView({ behavior: 'smooth' })` on message list tied to broad deps; voice transcript syncing into input during typing.
- `100vh` / keyboard resize on Safari shifting sticky composer.
- Floating ORB companion overlapping send on small screens (mitigated earlier; reinforced `display: none` on mobile).
- Scope mobile tabs used legacy `childWorkspaceNavigation` paths (`/life_echo`, old record URLs).
- Missing scope nav items (Archive, Alerts, SCCIF, Reg 44/45) in drawer.
- Full-screen overlays without `pointer-events-none` (ORB decorative layers).

## Files inspected

- `frontend-next/app/globals.css`
- `frontend-next/components/indicare/app-shell.tsx`
- `frontend-next/components/indicare/mobile/*`
- `frontend-next/components/mobile-nav.tsx`
- `frontend-next/lib/navigation/scope-routes.ts`, `scope-navigation.ts`, `mobile-shell.ts`
- `frontend-next/components/orb-standalone/*`
- `frontend-next/components/orb-operational/orb-conversation-experience.tsx`
- `frontend-next/components/young-people/workspace/*`
- `frontend-next/app/homes/[id]/workspace/page.tsx`

## Overlay / pointer-events findings

- `.orb-overlay-shell` and `.orb-cinematic-light-field` use `pointer-events: none` (correct).
- `.orb-floating-dock` is `pointer-events: none` with interactive children `pointer-events: auto`.
- Mobile menu: closed = not mounted; open = backdrop + drawer both `pointer-events: auto`.
- Bottom nav: `pointer-events-auto`, max-height capped, safe-area padding via `env(safe-area-inset-bottom)`.

## ORB composer findings

- Standalone: `100dvh` layout, sticky composer, reserved voice status slot, scroll only on new messages / pending, voice transcript no longer overwrites manual typing.
- Operational: sticky composer with safe-area padding, `data-testid="orb-operational-composer"` / send button markers.
- Floating companion hidden on mobile (`max-width: 767px`).

## Menu drawer findings

- Full-height left drawer `min(86vw, 360px)`, solid `bg-slate-950`.
- Backdrop `bg-slate-950/70`, closes on tap / Escape.
- Body scroll locked while open.
- Scope nav filtered for invalid IDs; expanded child/home item lists.

## Button route findings

- Central maps: `scope-routes.ts` (`CHILD_WORKSPACE_WORKFLOW_HREFS`, `HOME_WORKSPACE_WORKFLOW_HREFS`).
- Child quick actions & lifecycle cards use scoped hrefs (no `#`).
- Home workspace sections use `HOME_WORKSPACE_WORKFLOW_HREFS`.
- Mobile tabs use `childWorkspaceMobileTabs` / `homeWorkspaceMobileTabs`.

## Fixes applied

1. Rebuilt mobile drawer (`mobile-os-top-bar.tsx`) with backdrop, test IDs, scroll lock.
2. Expanded `scope-navigation.ts` for child/home drawer items.
3. Mobile tabs routed via `mobile-shell.ts` helpers.
4. ORB composer stability (scroll, voice sync, CSS).
5. QA `data-testid` markers on composers, drawer, workspaces, bottom nav.
6. Regression tests under `tests/test_mobile_*.py`.

## Remaining limitations

- Manual iPhone Safari verification still required for keyboard bounce edge cases on older iOS.
- Some secondary routes (e.g. legacy journey tabs) remain on desktop-only patterns.
- `scope-nav-logout` in `noScopeNavigation` still points to `/login` (session logout uses button in drawer).
- Safety pytest (`test_indicare_intelligence_spine.py` etc.) may fail in cloud env without full DB — documented per run output.

## Manual test URLs

- https://app.indicare.co.uk/orb
- https://app.indicare.co.uk/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review
- https://app.indicare.co.uk/young-people/1/workspace
- https://app.indicare.co.uk/homes/1/workspace
