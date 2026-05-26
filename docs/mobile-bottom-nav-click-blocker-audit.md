# Mobile bottom nav click blocker audit

## Console audit evidence (before fix)

On `/young-people/1/workspace` with DevTools narrow viewport:

| Metric | Value |
|--------|-------|
| visibleButtons | 4 |
| visibleLinks | 71 |
| forms | 0 |
| blockedOrSuspiciousControls | 52 |
| possibleFullScreenOverlays | 0 |

Repeated `topElementAtCentre` for blocked controls:

```html
<nav data-testid="mobile-child-bottom-nav" class="mobile-bottom-nav pointer-events-auto fixed inset-x-0 bottom-0 z-50 ...">
```

Many blocked controls were **below the viewport**; the audit clamped their Y centre to `window.innerHeight - 1`, so `elementFromPoint` always hit the fixed bottom nav — a false positive.

## Root cause

1. **Audit false positives**: Offscreen link centres were treated as viewport-bottom points, so bottom nav was reported as covering content that was not visible.
2. **Hitbox ambiguity**: `max-h-[calc(4.5rem+...)]` without explicit `height` let the fixed nav’s box sizing be unpredictable relative to inner padding.
3. **Stacking**: `z-50` on bottom nav competed with workspace controls; drawer already uses `z-[70]` but nav was higher than necessary.
4. **Padding**: Workspace used `120px` bottom padding; nav bar is `4.5rem` (~72px) — adequate but not aligned to the `7rem` content clearance target.
5. **Visibility**: Bottom nav could render on `/select-scope` when scope was set, which is not a workspace page.

## Files inspected

- `frontend-next/components/indicare/mobile/mobile-bottom-nav.tsx`
- `frontend-next/lib/navigation/mobile-shell.ts`
- `frontend-next/app/globals.css`
- `frontend-next/app/interaction-guard.css`
- `frontend-next/components/indicare/app-shell.tsx`
- `frontend-next/components/indicare/mobile/mobile-os-top-bar.tsx`
- `frontend-next/components/young-people/workspace/*`
- `frontend-next/app/homes/[id]/workspace/page.tsx`
- `frontend-next/app/young-people/[id]/workspace/page.tsx`
- `frontend-next/scripts/audit-interaction.mjs`
- `frontend-next/scripts/interaction-coverage-audit-logic.mjs`

## Fixes applied

| Area | Change |
|------|--------|
| Hitbox | Explicit `height: calc(4.5rem + env(safe-area-inset-bottom))`, inner row `h-[4.5rem]`, `overflow-hidden`, removed `max-h-*` |
| z-index | Bottom nav `z-40`; drawer remains `z-[70]` |
| Padding | `.mobile-os-workspace` and mobile child/home workspaces use `calc(7rem + env(safe-area-inset-bottom))` |
| Visibility | Hide on `/select-scope` (in addition to `/orb`, `/assistant/orb`, `/record`, `/login`) |
| Audit | `interaction-coverage-audit-logic.mjs` — no Y clamp; `offscreen_not_tested` vs `visible_in_viewport` |
| Avatar | `onError` → initials fallback; no re-render of broken `img` after failure |

## Remaining limitations

- Narrow DevTools / split-screen widths still show bottom nav (`lg:hidden`); content must scroll above the bar — padding handles this, not removal of nav.
- Browser console audit is manual; use snippet from `interaction-coverage-audit-logic.mjs` (`BROWSER_INTERACTION_AUDIT_SNIPPET`).
- Drawer open does not hide bottom nav; drawer stacks above it.

## Manual QA URLs

- Child: `/young-people/1/workspace`
- Home: `/homes/1/workspace`
- ORB (nav hidden): `/orb`, `/assistant/orb`
- Record (nav hidden): `/record?child_id=1`
