# ORB Premium Interaction — Final Audit

Audit date: 2026-06-06  
Scope: Residential `/orb` product shell — sidebar, account menu, sign out, voice companion, settings/billing modals, Documents & Guidance, ORB Write.

## Executive summary

Live QA reported seven interaction polish gaps. Root causes were **visual wiring gaps** (voice still used legacy `GlassOrbMark`), **incomplete collapsed sidebar rail** (partial nav + missing layout markers), **account menu UX** (no toggle, weak positioning), and **sign-out teardown** (soft logout on `/orb` left auth gate verdict `ready` while session cleared). No new auth, billing, or AI routes were required.

## Findings by area

### 1. Sidebar collapse

| Issue | Root cause |
|-------|------------|
| Collapse not reclaiming width | `data-orb-sidebar-collapsed` lived on inner rail only; grid CSS on `.orb-chat-shell` worked but aside lacked state markers |
| Half-collapsed feel | Collapsed rail exposed only 3 stations (Dictate, Templates, Documents) — missing Chat, Voice, Write, Saved |
| Missing contract markers | No `data-orb-sidebar-state`, `data-orb-sidebar-collapse-toggle`, `data-orb-sidebar-icon-rail` |

**Fix:** Full icon rail, state markers on shell + aside, collapse toggle marker, CSS icon-rail discipline.

### 2. Account menu

| Issue | Root cause |
|-------|------------|
| Menu stayed open / pinned | Trigger always called `setAccountMenuOpen(true)` — no toggle |
| Awkward position in collapsed sidebar | Menu always opened below anchor; bottom sidebar account icon needs upward placement |
| Missing markers | No `data-orb-account-menu-open`, `data-orb-account-menu-signout` |

**Fix:** Toggle on trigger, auto placement above/below anchor, open marker, sign-out marker.

### 3. Sign out

| Issue | Root cause |
|-------|------------|
| Sign out appeared broken | `logout()` on `/orb` returns early (no navigation); `OrbAuthGate` bootstraps from front-door **verdict**, not `auth.status` alone — product shell remained mounted |
| Docs expected hard teardown | `docs/orb-sign-out-flow.md` specifies `window.location` to `/orb` |

**Fix:** `handleResidentialSignOut` closes overlays, awaits canonical `logout()`, then `window.location.replace('/orb')` for full gate remount. No new logout route.

### 4. ORB Voice companion

| Issue | Root cause |
|-------|------------|
| Large static orb | Desktop voice branch used `GlassOrbMark`; living-sphere CSS targeted `.orb-presence--voice` which was never rendered |

**Fix:** New `OrbVoiceCompanion` wrapping `OrbPresence` variant `voice`, driven by existing UI/transport state with safe fallbacks.

### 5. Settings & Billing modals

| Issue | Root cause |
|-------|------------|
| Too heavy | Full workstation drawer sizing, large padding, sticky billing footer could overlap scroll body |

**Fix:** Compact modal max dimensions, internal scroll on body only, billing footer padding guard.

### 6. Documents & Guidance clipping

| Issue | Root cause |
|-------|------------|
| Half-hidden title / clipped tabs | Workspace chrome + station header stacked; `orb-workspace-body` default `overflow-y: auto` fought internal scroll contract |

**Fix:** `compactChrome` for documents workspace, `data-orb-documents-header` / `data-orb-documents-content-scroll`, workspace body `overflow: hidden` for documents panel.

### 7. ORB Write density

| Issue | Root cause |
|-------|------------|
| Panels default open | Source + guidance both `useState(true)` — canvas not visually dominant |
| Missing document-first markers | No `data-orb-write-document-first` contract |

**Fix:** Default panels closed on desktop; document-first data markers; slimmer studio header CSS.

## Out of scope (preserved)

- Auth gating / verdict routing / bootstrap security
- Billing logic, OAuth, Stripe, AI routes
- Product access controls
- Route removals or new product features

## Verification

```bash
cd frontend-next && npm run typecheck && npm run test:orb
```

Contract docs: `orb-sidebar-collapse-contract.md`, `orb-account-menu-signout-contract.md`, `orb-voice-living-companion.md`, `orb-document-first-write-layout.md`.
