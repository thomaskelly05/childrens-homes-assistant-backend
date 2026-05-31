# ORB Residential App Shell Parity Report

Sprint: **ORB Residential App Shell Parity — ChatGPT-Level Layout, Glass UI, Projects/Folders, Composer and Modal Polish**

## 1. ChatGPT comparison fixes

- Dark, full-viewport chat shell with centred column (`--orb-chat-column-max` / `--orb-composer-max`).
- Reduced header and sidebar border opacity; spacing and glass depth replace heavy rules.
- Residential composer defaults compact (pill glass, no mode divider row, subtle “Ask ORB” pill only on larger breakpoints).
- Empty state uses a single `GlassOrbMark` (no `OrbGlow` square artefact on residential).
- Station apps remain centred `OrbAppModal` surfaces (not right drawers).

## 2. Sidebar collapse

- Desktop collapse/expand control in residential sidebar header (`data-orb-sidebar-collapse` / `data-orb-sidebar-expand`).
- Collapsed rail (~68px) shows icon-only actions with accessible labels.
- Preference persisted in `localStorage` key `orb-sidebar-collapsed`.
- Main chat grid expands when collapsed (`orb-chat-shell` + `data-orb-sidebar-collapsed`).
- Mobile drawer behaviour unchanged (hamburger overlay).

## 3. Projects / folders

- Sidebar **Projects** section with default seeds: My Home, Inspection preparation, Safeguarding, Templates, Training & learning.
- Actions: new project, rename, delete (non-General), move chat to project, optional project memory notes.
- Workspace projects synced to `localStorage` key `orb-projects` for future backend wiring.
- `ensureResidentialWorkspaceProjects()` runs on residential hydrate.

## 4. Composer compact / expand

- `residentialSurface` enables compact layout: single row (attach + textarea + mic + send).
- Textarea auto-grows up to 140px mobile / 220px desktop, then scrolls internally.
- Placeholder: “Ask anything”.
- Mode row and “Mode: …” footer label hidden on residential.

## 5. Footer centring

- Centred two-line footer under composer on desktop (`data-orb-residential-footer`).
- Disclaimer + “ORB Residential · © 2026 IndiCare”.
- Hidden on small screens to save vertical space.

## 6. Glass UI improvements

- Premium tokens for shell grid, collapsed rail, compact composer, footer.
- Sidebar powered-by line uses cyan brand hue (`orb-sidebar-powered-tagline`).
- Composer dock uses dark gradient on residential (no light grey wash).

## 7. ORB visual changes

- `GlassOrbMark` sidebar size 28px (`glass-orb-mark--sm`).
- Consistent mark across sidebar, empty state, thinking (existing patterns retained).
- Hero/landing continue via `OrbHeroSphere` wrapping mark (no duplicate letter “O”).

## 8. Modal improvements

- Existing `OrbAppModal` / `orbStationShellProps(residentialSurface)` pattern retained.
- Templates, Knowledge Centre, Documents, Billing, Saved Outputs, Settings use centred glass modals.

## 9. Templates library

- Fallback library in `lib/orb/orb-templates-fallback.ts` (unchanged; verified in tests).

## 10. Knowledge Centre

- Built-in resources panel when API empty (unchanged; verified in tests).

## 11. Billing modal

- Plan, usage, spending cap, buy-more sections (unchanged; verified in tests).

## 12. Documents / Saved Outputs

- Documents: centred modal on residential.
- Saved Outputs: empty state copy for first-time users.

## 13. Settings / account

- Top-right profile opens `OrbAccountModal` on residential.
- Settings hides internal/developer language unless developer mode.

## 14. Answer-writing improvements

- Backend Ofsted sanitizer tests retained (residential-specific structure, no threshold closer in general answers).

## 15. Tests / build result

Run in CI / locally:

```bash
cd frontend-next
npm run test:orb
npm run typecheck
npm run build
```

New/updated assertions in `orb-residential-chatgpt-parity.test.ts` for sidebar collapse, projects, composer footer, and saved outputs empty state.

## 16. Remaining gaps

- Project memory UI is prompt-based (not a full in-modal editor).
- Plus-menu attach shortcuts (template / knowledge / learning) could be a single dropdown in a follow-up.
- `orb-projects` backend API not wired — client-only memory today.
- Voice status line hidden on residential compact composer (by design for calm UI).
- ESLint config for Next.js v9 still optional per AGENTS.md.

## Target

ORB Residential should read as **ChatGPT for residential childcare**: open → ask → answer, with folders, glass dark UI, and polished modals — not a dashboard or OS shell.
