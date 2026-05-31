# ORB Residential Mobile UX Fix — Report

Sprint: **ORB Residential Mobile UX Fix — ChatGPT Simplicity and Proportions**

## 1. Mobile issues fixed

| Area | Fix |
|------|-----|
| Viewport | `100dvh` shell with `overflow: hidden` on html/body when ORB chat is active; only chat thread, sidebar, composer textarea, and profile panel scroll |
| Header | ~56–64px band, 16px title, truncated chat title, saved-outputs shortcut on mobile |
| Empty state | Compact ORB sphere (72–96px), personalised heading, small “ORB Residential” label; hero wordmark hidden on mobile |
| Answer typography | 16px body, 1.6 line-height, smaller headings on mobile |
| User bubbles | 15–16px text, 82% max width, tighter padding |
| Lenses / “Using…” | Collapsed **ORB lenses used** row; expand for compact horizontal chips |
| Message actions | Icon-only on mobile (36–40px), `aria-label` + visually hidden labels |
| Suggestion chips | Single horizontal scroll row, 13–14px, no forced wrap |
| Composer | ~64px min height, shorter padding, internal textarea scroll cap |
| Sidebar chats | Three-dot menu: Rename, Pin, Archive, Delete |
| Profile | Settings-style collapsible sections; save only when dirty |
| Login | Passkey wording, authenticator fallback label, unavailable-device message |
| Footer disclaimer | Hidden on mobile composer |

## 2. Files changed

- `frontend-next/app/orb/orb-mobile.css` — mobile design layer rewrite
- `frontend-next/components/orb-standalone/orb-assistant-message.tsx` — lenses, actions, chips
- `frontend-next/components/orb-standalone/orb-sidebar-chat-menu.tsx` — shared chat row menu (new)
- `frontend-next/components/orb-residential/orb-residential-sidebar.tsx` — chat controls
- `frontend-next/components/orb-standalone/orb-care-companion.tsx` — empty state, header, workspace wiring
- `frontend-next/components/orb-standalone/orb-adult-profile-drawer.tsx` — grouped settings
- `frontend-next/components/orb-residential/orb-login-screen.tsx` — passkey / MFA copy
- `frontend-next/components/orb-residential/ui/orb-auth-button.tsx` — compact auth buttons
- `frontend-next/components/orb-residential/orb-residential-mobile-ux.test.ts` — structure tests (new)
- `frontend-next/package.json` — include new test in `test:orb`
- `frontend-next/docs/orb-residential-mobile-ux-fix-report.md` — this report

## 3. Chat action changes

- Primary bar uses `orb-response-action-bar--icons` with nowrap + horizontal scroll
- Each `ActionChip` has `aria-label` and `.orb-action-chip__label` (visually hidden ≤640px)
- Copy, Regenerate, Speak, Save, More remain; desktop can still show labels via CSS defaults

## 4. Lens / explainability changes

- Replaced oversized “Using · …” pill with collapsed `ORB lenses used` toggle (`data-orb-lenses-collapsed="true"` by default)
- Expanded panel shows compact chips from `collectCognitionDisplayLabels`
- `OrbExplainabilityPanel` (“Why ORB said this”) unchanged — still secondary, collapsed by default

## 5. Sidebar rename / delete / edit

- `OrbSidebarChatList` + overflow menu on each residential chat row
- Rename via prompt; Pin, Archive, Delete wired through `onWorkspaceChange`

## 6. Composer changes

- Mobile min-height ~4rem glass shell, textarea max ~8.75rem then internal scroll
- Attach / mic / send sizing 40–48px
- Disclaimer hidden on mobile

## 7. Profile / settings simplification

- Top summary card (account + passkey status)
- Collapsible: Account, Personalisation, Home context, Memory, Security, Data & privacy
- **Save profile** footer button only when `isDirty`

## 8. Passkey / auth language

- Login: “Use Face ID, Touch ID or device passkey”
- Unavailable: “Passkeys are not available on this device”
- Email form: “Use authenticator app instead”
- Profile summary uses same passkey phrasing
- OAuth buttons retain provider icons (`OrbAuthProviderIcon`)

## 9. Tests / build results

| Command | Result |
|---------|--------|
| `npm run test:orb` | 187 tests pass (includes new mobile UX suite) |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |

## 10. Remaining gaps

- **Long-press** on chat rows not implemented (three-dot menu only)
- **Bottom sheet** for chat actions on mobile is optional; floating menu used instead
- **Station panels** still route/panel-based; full-screen in-shell station shell could be tightened further
- **Profile → Settings → Security** deep-link for passkey management still points to general access/billing flow
- **Desktop** action labels remain visible; fine-tune breakpoint if hybrid tablet layout needs labels

## Target outcome

ORB Residential mobile now follows a ChatGPT-style loop: open → ask → read compact answer → icon actions → stations via sidebar when needed, without page-level scroll or oversized chrome.
