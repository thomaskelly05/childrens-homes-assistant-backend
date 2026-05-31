# ORB Residential — ChatGPT Parity Product Report

Sprint: **ORB Residential ChatGPT Parity Reset — Premium Unified App Shell, Modals, Libraries and Billing**

## 1. What was wrong

- Main chat could still read as washed-out (light badges, pale empty-state chrome, bright privacy pill in header).
- Station apps (Templates, Knowledge, Documents, Saved Outputs, Profile) used **right-side drawer** panels instead of centred modals.
- **Templates** and **Knowledge Centre** often showed empty or “coming soon” states when APIs returned no data.
- **Billing** was only a thin settings subsection, not a full subscription/usage experience.
- **Profile** opened a full profile drawer rather than a compact account modal from the top-right.
- Duplicate orb visuals (`PremiumMobileOrb` empty state vs `GlassOrbMark` elsewhere).
- Missing `lib/orb/orb-safe-array.ts` caused TypeScript failures on sidebar chat lists.
- Internal labels (e.g. cognition toggles) visible to normal users in Settings.

## 2. Unified ORB shell changes

- Residential `/orb` remains `OrbCareCompanion` + `OrbResidentialSidebar` with **100dvh** locked layout, dark theme lock, and internal scroll regions.
- Header privacy pill hidden on residential (boundary copy remains in Settings → Privacy & data).
- Empty state: **one `GlassOrbMark`** (`empty` size), desktop heading **“What are you working on?”**, mobile personalised **“Ready when you are, {name}.”**
- Brand lockup in empty state moved to screen-reader-only so the composer stays the focus.

## 3. Modal app changes

- Added **`OrbAppModal`** + **`orbStationShellProps()`** wrapping `OrbStandalonePanelShell` with `layout="center"`, `modalSize` tokens (`compact` / `standard` / `wide` / `fullscreenMobile`), and `data-orb-app-modal`.
- Residential stations now open as **centred dark glass modals** (backdrop blur) instead of right drawers:
  - Settings (compact ~720px)
  - Templates, Knowledge, Documents, Saved Outputs (wide ~1000px)
  - Billing (compact)
  - Account (compact)

## 4. Templates library changes

- Added **`lib/orb/orb-templates-fallback.ts`** with 35+ residential templates across Safeguarding, Recording, Care Planning, Ofsted/SCCIF, Leadership, Locality, Learning, Supervision.
- When API returns empty or errors (non-auth), UI loads fallback registry — no broken empty library.
- **Use template** inserts `Create a {title} for me.` into chat and closes the modal.

## 5. Knowledge Centre changes

- Removed **“Guidance library coming soon”** as the primary experience.
- Added **`lib/orb/orb-knowledge-builtin.ts`** and **`OrbKnowledgeBuiltinPanel`** with tabs (Official guidance, Inspection, Safeguarding, Learning reviews, Templates, Uploaded, Saved).
- Built-in resource cards with **Ask ORB about this** / **Use in answer**; auth failures show reconnect banner while built-ins remain browsable.
- Connected API sources shown under “Connected sources” when present.

## 6. Billing changes

- New **`OrbBillingModal`**: plan card (£9.99/month + feature list), subscription status, usage, spending cap UI (set cap wired when meter API ready), buy-more copy, trial/subscribe/portal/refresh actions.
- Sidebar **Billing** opens modal (no full-page navigation).
- Stripe-not-ready fallback copy included.

## 7. Documents app changes

- Documents station in sidebar; modal copy aligned to residential spec.
- Centred modal on residential; polished standalone disclaimer.

## 8. Profile/account changes

- New **`OrbAccountModal`** from top-right (and sidebar profile): name, subscription, passkeys, Settings / Billing / Sign in.
- Residential uses account modal; full **`OrbAdultProfileDrawer`** retained for non-residential standalone.
- Settings → Manage profile routes to account flow on residential.

## 9. Visual/contrast fixes

- Premium tokens: modal surfaces, **#5ec8ff** tagline hue aligned with orb, `glass-orb-mark` size scale (tiny → hero).
- Residential assistant text remains **#f7faff** on **#05070d** deep background.
- Header temporary/privacy chips suppressed or darkened on residential where appropriate.

## 10. Answer-quality changes

- No backend intelligence rebuild in this sprint; existing Ofsted sanitizer tests retained (`test_general_ofsted_sanitize_strips_threshold_closer`).
- Residential copy constants updated for empty state and Knowledge/Templates headers.

## 11. Error recovery fixes

- Added **`orb-safe-array.ts`** (`asArray`, `mapArray`) — sidebar and prior guard patterns documented.
- Error boundary behaviour unchanged: user-safe copy, developer detail only in dev mode.

## 12. Tests / build result

| Command | Result |
|---------|--------|
| `npm run test:orb` | **227 passed** (includes new `orb-residential-chatgpt-parity.test.ts`) |
| `npm run typecheck` | **Pass** |
| `npm run build` | **Pass** |

## 13. Remaining gaps

- Spending cap **set cap** button awaits full meter API wiring.
- **Buy more** top-up needs dedicated Stripe price/checkout endpoint.
- **Share/export** per message still “coming soon” in assistant actions.
- **Voice conversation** (duplex) not implemented — push-to-talk only.
- **Delete single message** not implemented.
- Legacy full-page station screens under `components/orb-residential/` still exist but are not canonical routes.
- Appearance section in Settings still visible on residential though theme is locked dark (could be hidden in a follow-up).

---

**Target achieved (frontend):** ORB Residential is structurally closer to ChatGPT — dark shell, sidebar + centred chat, modal apps, populated Templates/Knowledge fallbacks, billing/account modals, one glass orb mark — while staying powered by IndiCare Intelligence for children’s homes practice.
