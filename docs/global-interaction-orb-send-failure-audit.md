# Global interaction and ORB send failure audit

## Suspected cause

Operational ORB unification left **floating `OrbButton` overlays** active on routes that already have a full-page ORB composer (`/assistant/orb`). When the voice panel is open, **`orb-standalone-atmosphere` / `orb-screen-edge-pulse` layers** used `position: fixed; inset: 0` without a consistent `pointer-events: none` shell, so invisible viewport-sized layers could intercept clicks across the rest of the app.

Secondary issues:

- Operational ORB `submit()` lacked `try/finally`, so `pending` could remain `true` after failures (send button stuck disabled).
- Scope selector buttons used `disabled={busy || loading}` for the entire OS scope refresh cycle, making controls feel dead during background scope reloads.
- Standalone operational send errors did not always surface the standard retry copy.

## Files inspected

- `frontend-next/app/layout.tsx`
- `frontend-next/components/indicare/scope/os-app-providers.tsx`
- `frontend-next/components/indicare/app-shell.tsx`
- `frontend-next/components/orb-operational/*`
- `frontend-next/components/orb-standalone/*`
- `frontend-next/components/indicare/orb/orb-button.tsx`
- `frontend-next/lib/orb/orb-presence-rules.ts`
- `frontend-next/app/globals.css`
- `routers/orb_standalone_routes.py`, `routers/orb_operational_routes.py`

## Issues found

1. Floating ORB shown on `/assistant/orb` (conflicts with operational conversation UI).
2. ORB overlay shells missing `pointer-events: none` / interactive `pointer-events: auto` split.
3. Operational send handler missing guaranteed `pending` reset and unified retry message.
4. Scope selector over-disabling during scope provider `loading`.
5. `MobileConversationDrawer` missing `'use client'` directive.

## Fixes applied

1. **`shouldShowFloatingOrb`**: exclude `/assistant/orb`, `/select-scope`, and `/login`.
2. **CSS**: `.orb-overlay-shell` / `.orb-overlay-interactive` for decorative vs interactive layers.
3. **`OrbButton` / `EmbeddedOrbDock`**: apply overlay shell classes; immersive backdrop click closes.
4. **`OrbConversationExperience`**: `try/catch/finally` on send; `ORB_SEND_RETRY_MESSAGE`; test ids on form/send/error.
5. **Standalone client**: `STANDALONE_ORB_SEND_RETRY_MESSAGE` aligned with operational copy.
6. **`HomeChildSelector`**: disable only during initial scope + options load (`scopeBusy`).
7. **`RecordingReviewActions`**: visible error on failed review actions.
8. **`SlideOverPreview`**: backdrop click closes (no stuck invisible modal).
9. **`runAsyncAction` helper** for consistent async button error handling.

## Remaining limitations

- Floating ORB voice panel still covers the bottom-right viewport when active (by design); immersive mode must be closed to reach content underneath that region.
- Command-search slide-over preview still blocks the viewport while open (expected modal behaviour).
- Scope buttons remain disabled while `busy` during an in-flight home/child selection.
