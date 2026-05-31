# ORB Residential Premium Identity Recovery Report

Sprint: **ORB Residential Premium Identity Recovery — Keep ChatGPT Simplicity, Restore Premium Feel**

## 1. What looked cheap before

- Empty state used `OrbGlow` at `dock` size with large blur halos (`blur-3xl`, `inset-[-22%]`), so the sphere dominated the viewport and text sat on top of the glow.
- Mobile CSS allowed the empty sphere up to `6rem` with heavy uppercase brand tracking, oversized heading type, and hidden subline guidance.
- Sidebar and panels used flat light gradients on mobile that clashed with the residential dark product.
- Settings nav used a bright `#EAF6FF` selected row — jarring on dark ORB Residential.
- Station panels surfaced raw red error strings (e.g. authentication failures) with no recovery path.
- Saved Outputs / Knowledge Library empty states were single grey lines with no brand context.
- Composer and action chips used generic flat borders without glass depth.

## 2. Visual system restored

Shared premium tokens in `app/orb/orb-premium-tokens.css` and `lib/orb/design-tokens.ts`:

| Token | Value |
|-------|--------|
| Background deep | `#05070d` |
| Background mid | `#070b14` |
| Accent | `#168bff` |
| Cyan | `#42d7ff` |
| Violet | `#7c5cff` |
| Text primary | `#f7faff` |
| Glass | `rgba(255,255,255,0.045–0.07)` |
| Borders | `rgba(255,255,255,0.10)`, glow `rgba(66,215,255,0.18)` |

Applied on `.orb-chat-layout--residential` for chat, composer, messages, sidebar, settings, and station panels.

## 3. Empty state changes

- Residential empty state uses `PremiumMobileOrb` (72px mobile, larger on desktop) instead of `OrbGlow`.
- Brand stack: **ORB Residential** + **Powered by IndiCare Intelligence** (no overlap with orb).
- Greeting from `personalisedEmptyHeading`; subline: *Ask about recording, safeguarding, Ofsted, templates or practice.*
- Centred layout with room for fixed composer; starter cards remain desktop-only (hidden on mobile per existing rules).

## 4. ORB sphere changes

- New `PremiumMobileOrb` component: CSS-only radial core, soft glow, breathing animation, `prefers-reduced-motion` support, no square halo box.
- Mobile capped at 4.5–5.5rem; desktop variant up to ~7.5rem.

## 5. Composer changes

- Glass gradient background, `1.75rem` radius, cyan border glow, premium shadow.
- Safe-area padding preserved; min height ~4rem; textarea max height unchanged.
- Send button gradient aligned to electric blue accent on residential layout.

## 6. Sidebar changes

- Drawer width `min(86vw, 22.5rem)`; midnight gradient background.
- Dark overlay on main content; chat overflow menu remains visible on mobile.
- Brand line: Powered by IndiCare Intelligence.

## 7. Profile / settings changes

- Profile header: name, account subtitle, status chips (signed in, passkey, plan).
- Section cards use `data-orb-profile-section-card` glass styling.
- Settings: `orb-settings-nav-item--active` dark glass + cyan accent; removed bright blue selected block.

## 8. Station panel error / empty state changes

- `orb-station-panel-states.tsx`: `OrbStationAuthError` (Reconnect / Sign in again / Details) and `OrbStationEmptyState`.
- Saved Outputs: friendly empty copy; auth-aware error handling.
- Knowledge Library: matching empty and error patterns.

## 9. Tests / build results

Run from `frontend-next/`:

```bash
npm run test:orb
npm run typecheck
npm run build
```

Extended `orb-residential-mobile-ux.test.ts` covers compact orb, settings dark select, station states, sidebar menu actions, and premium token wiring.

## 10. Remaining UI polish

- Settings nav icons per section (Appearance, Voice, etc.) — structure ready, icons optional follow-up.
- Light-mode residential pass (tokens target dark residential default).
- Fine-tune assistant lens chip colours in expanded state.
- Optional `OrbStationEmptyState` illustration micro-mark for stations.

**Target achieved:** Login → Ask ORB → Get answer, with premium midnight glass identity and no dashboard clutter.
