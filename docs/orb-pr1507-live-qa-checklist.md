# ORB PR #1507 live QA checklist

Manual verification pass for premium interaction fixes (sidebar collapse, dictate/voice companion, Documents viewport, ORB Write document-first layout, account menu, sign-out). Run after deploy to staging or production.

## Desktop Chrome

- [ ] Sign in and land on ORB Residential product shell (not stuck on loading gate).
- [ ] **Sidebar expanded**: full labels, New chat, search, Main + Library sections, account footer reachable without scroll clipping.
- [ ] **Sidebar collapse**: chevron/toggle collapses to icon rail with stations from Chat through Saved Outputs; workspace width expands; toggle expands again.
- [ ] **Account menu**: profile control toggles open/closed; menu anchors correctly in expanded and collapsed sidebar; closes on outside click, Escape, and after choosing an action.
- [ ] **Sign out**: Sign out from account menu returns to `/orb` login/front door; product shell is gone; browser Back does not restore a usable authenticated workspace.
- [ ] **Voice**: living companion/head visual renders (breathing/listening/thinking states); no static glass orb-only placeholder on desktop voice station.
- [ ] **Documents & Guidance**: header and tab content fully visible; internal scroll works; no clipped title or policy cards.
- [ ] **ORB Write**: opens document-first; source and guidance panels collapsed by default; panel toggles expand/collapse without breaking canvas width.

## Desktop Safari

- [ ] Repeat sidebar collapse/expand and account menu placement (collapsed rail positions menu above trigger).
- [ ] Voice companion renders and animates; mic permission prompt behaves as expected.
- [ ] Documents & Guidance scroll and header discipline match Chrome.
- [ ] ORB Write document canvas and panel toggles usable at 1280px and 1440px widths.
- [ ] Sign out hard-navigates to `/orb`; no flash of product chrome on reload.

## iPhone Safari

- [ ] Mobile header menu and account entry open account menu; sign out returns to `/orb` login.
- [ ] Sidebar drawer lists Dictate, Voice, ORB Write, Documents & Guidance, Saved Outputs.
- [ ] Voice mobile experience shows companion visual (not hero-sized empty-state orb).
- [ ] Documents station: no horizontal overflow; header readable; content scrolls inside panel.
- [ ] ORB Write: document canvas readable; optional panels stay collapsed until opened.

## Sign-out checks (all browsers)

- [ ] Open account menu from sidebar footer or mobile header.
- [ ] Click **Sign out** — network shows `POST /auth/logout` (or E2E bypass in dev).
- [ ] URL becomes `/orb` via `location.replace` (no soft client-only logout leaving product mounted).
- [ ] Login/front door visible; no sidebar, composer, or workspace panels.
- [ ] Hard refresh on `/orb` stays on login gate when session cleared.
- [ ] Browser Back from login does not expose prior chat or workspace state.

## Sidebar collapse checks

- [ ] `data-orb-sidebar-state` toggles `expanded` / `collapsed` on shell and sidebar.
- [ ] Collapsed rail shows icon tooltips/labels for Chat, Dictate, Voice, ORB Write, Templates, Documents & Guidance, Saved Outputs.
- [ ] Main workspace uses reclaimed horizontal space (no empty gutter where expanded sidebar was).

## Account menu checks

- [ ] Toggle: second click on profile control closes menu.
- [ ] Outside click closes menu.
- [ ] Escape closes menu.
- [ ] Profile, Settings, Billing actions close menu and open correct destination.
- [ ] Sign out closes menu before navigation.

## Voice companion checks

- [ ] Desktop voice station shows `OrbVoiceCompanion` with state-driven head visual.
- [ ] States: idle, listening, thinking, speaking, error (where applicable) update without layout jump.
- [ ] Start voice flow unchanged (explicit start; no auto-connect regression).

## Documents / Write viewport checks

- [ ] Documents: `data-orb-documents-header` visible; content scroll region does not clip first line of tabs or upload zone.
- [ ] ORB Write: `data-orb-write-document-first="true"`; source/guidance collapsed markers true on first open.
- [ ] Zoom, toolbar, and status footer remain visible when panels collapsed.

## Automated contract (CI)

```bash
cd frontend-next
npm run typecheck
npm run test:orb
```

Key regression tests: `orb-premium-interaction.test.ts`, `orb-sign-out-flow.test.ts`, `orb-premium-layout-pass.test.ts`.
