# ORB Residential — premium viewport final pass

Final layout and visual hierarchy audit after PR #1505. Scope: **layout and CSS only** — no auth, security, bootstrap, or API changes.

## Goal

ORB Residential should feel like a simple premium ChatGPT-style product, not a dashboard. One browser viewport on desktop; only internal panels scroll.

## What changed

### 1. One-screen viewport discipline

- Reinforced `100dvh` lock on `.orb-chat-layout--residential` and main workspace stations.
- Workspace body uses `overflow: hidden`; library and studio content scrolls inside marked inner regions (`data-orb-knowledge-library-body`, `data-orb-template-list-scroll`, etc.).
- Documents, Templates, Saved Outputs, Dictate, ORB Write, and Voice stations inherit the same station flex discipline.

### 2. Login (front door)

- Desktop hero no longer forces `min-height: 100dvh` on the left column — brand block is vertically centred within the viewport.
- ORB sphere reduced (`scale-[0.72]` desktop, smaller mobile) with `max-height: min(9.5rem, 22vh)` so the sphere is never clipped.
- Sign-in card remains vertically centred on the right.

### 3. Chat home

- Six primary starter pills unchanged (`ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT = 6`); More examples drawer retained.
- Hero atmosphere and ORB presence scaled down (~12%) so the composer stays the focal point.
- Starter pill row capped at `42rem` width for a cleaner ChatGPT-like row.

### 4. Dictate

- Transcript panel borders/background softened — transcript reads as the primary canvas.
- ORB analysis panel uses lighter chrome and a **collapse toggle** (`data-orb-dictate-brain-collapse-toggle`) — collapses to a slim rail without changing Record / Analyse / Open in ORB Write behaviour.

### 5. ORB Write

- Document canvas remains default focus; Source and Guidance toggles unchanged.
- On desktop viewports ≤820px height, both side panels default closed (`data-orb-write-compact-height`) so the canvas fills the station.
- Toolbar grouping unchanged; panel borders softened.

### 6. Templates

- Recording library cards show title, purpose, when to use, ORB checks, and primary actions by default.
- Therapeutic prompts, writing-style chips, and spelling/grammar guidance moved into `<details>` (`data-orb-recording-writing-detail`).
- Card grid gap and padding reduced for lower visual density.

### 7. Voice

- Existing voice logic untouched.
- Premium abstract breathing/listening/thinking/speaking states from PR #1505 retained in `orb-premium-layout-pass.css`.

### 8. Account, Settings, Billing

- Settings rows use lighter borders and padding (`orb-settings-row`) — less admin-panel density.
- Billing sticky footer uses softer border, gradient, and reduced padding — CTA remains sticky but feels lighter.
- Account popover unchanged.

### 9. Documents & Guidance header fix

- Workspace chrome shows the station title (`compactChrome: false` on residential).
- Removed duplicate in-panel hero; search + tabs live in `data-orb-documents-station-header` (sticky).
- Tab content scrolls in `data-orb-knowledge-library-body` only — title/tabs no longer hide behind top chrome when scrolling.

## Contract tests

`frontend-next/components/orb-residential/orb-premium-layout-pass.test.ts` covers:

| Check | Marker |
|-------|--------|
| No page-level scroll | `100dvh`, `overflow: hidden` on shell |
| Internal station scroll | `data-orb-knowledge-library-body`, template/saved list scroll regions |
| Documents header visible | `data-orb-documents-station-header`, sticky CSS |
| ORB Write panels collapse | `data-orb-write-compact-height`, panel toggles |
| Login sphere not clipped | `max-height: min(9.5rem, 22vh)`, reduced scale |
| Six chat starters | `ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT = 6` |

Run:

```bash
cd frontend-next
npm run typecheck
node --experimental-strip-types --test components/orb-residential/orb-premium-layout-pass.test.ts
```

Or the full ORB test bundle:

```bash
cd frontend-next && npm run test:orb
```

## Manual visual QA checklist

- [ ] **Desktop `/orb` login** — no page scroll; sphere fully visible; sign-in card centred.
- [ ] **Chat home** — six pills visible; composer dominant; no page scroll.
- [ ] **Dictate** — transcript fills centre; analysis panel collapses; Record / Analyse / Write actions work.
- [ ] **ORB Write** — canvas focused; Source/Guidance toggle; short viewport collapses panels by default.
- [ ] **Templates** — cards readable at a glance; writing guidance in expandable detail.
- [ ] **Documents & Guidance** — title and tabs stay visible while list scrolls.
- [ ] **Voice** — subtle living ORB states; no cartoon motion.
- [ ] **Settings / Billing** — clean rows; billing footer feels light, not heavy.

## Files touched

- `frontend-next/app/orb/orb-premium-layout-pass.css` — final pass rules
- `frontend-next/app/orb/orb-login-center.css` — login viewport + sphere sizing
- `frontend-next/components/orb-residential/orb-login-screen.tsx`
- `frontend-next/components/orb-standalone/orb-document-panel.tsx`
- `frontend-next/components/orb/dictate/OrbDictateBrainPanel.tsx`
- `frontend-next/components/orb-write/orb-write-standalone-panel.tsx`
- `frontend-next/components/orb/recording/OrbRecordingLibraryCards.tsx`
- `frontend-next/components/orb-standalone/orb-templates-panel.tsx`
- `frontend-next/components/orb-standalone/orb-standalone-settings-panel.tsx`
- `frontend-next/components/orb-standalone/orb-billing-modal.tsx`
- `frontend-next/components/orb-residential/orb-premium-layout-pass.test.ts`
