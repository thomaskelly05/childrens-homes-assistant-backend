# ORB Residential Desktop QA and Error Recovery Report

## 1. Theme leakage fixed

- `useOrbResidentialThemeLock` sets `data-orb-residential="1"`, `data-orb-theme="dark"`, `color-scheme: dark`, and `.orb-residential-root` on `html`/`body`.
- Applied on `/` (front door), `/orb/login`, and `/orb` experience.
- `orb-premium-tokens.css` forces dark backgrounds on chat, sidebar, panels, markdown answers, and overrides `.orb-theme-light` under residential.
- Station panel inputs forced dark.

## 2. Landing desktop polish

- Hero max width ~68rem (1088px); card padding increased.
- Single `OrbHeroSphere` (PremiumMobileOrb) — no `OrbGlowHero` square artefact.
- One-screen layout preserved.

## 3. Login desktop polish

- Same clean sphere on desktop column.
- `orb-login-input` class with webkit autofill overrides for dark fields.
- Disabled OAuth buttons use muted styling without looking broken.

## 4. ORB sphere artefact removed

- Landing, login, empty state, sidebar (`GlassOrbMark`), and assistant avatars use CSS-only circular spheres.
- Residential CSS hides legacy `OrbSphere` halos under `data-orb-residential`.

## 5. Main chat desktop polish

- Sidebar ~280px (`17.5rem`); chat column max ~800–860px (`50rem` / `53.75rem`).
- Viewport-locked layout; 16px / line-height 1.6 answer text on dark.
- Empty state: one responsive `PremiumMobileOrb` (no double orb).

## 6. Sidebar desktop polish

- Dark premium sidebar retained; chat list guarded with `asArray(workspace.chats)`.

## 7. Station panel polish

- Dark glass tokens and input overrides under residential root.
- Review screen `mapArray` guards prevent malformed API arrays crashing UI.

## 8. Profile/settings internal language removed

- `Active agent · …`, admin bypass, and cognition preferences hidden unless `localStorage orb-developer-mode=1` or `NEXT_PUBLIC_ORB_DEVELOPER_MODE=1`.

## 9. User-safe error boundary added

- `OrbResidentialErrorBoundary` on `/orb` experience.
- `app/orb/error.tsx` and ORB-aware `app/error.tsx` show “Something went wrong” with Start new chat / Back to ORB.
- Raw `error.message` only when developer mode is on.

## 10. p.map / root cause fixed

- `lib/orb/orb-safe-array.ts` (`asArray`, `mapArray`).
- `collectCognitionDisplayLabels` coerces labels to arrays.
- `orb-review-screen` uses `mapArray` for optional list fields.
- `OrbPromptDrawer` and residential sidebar guard `.map` inputs.

## 11. Tests / build result

Run in `frontend-next`:

```bash
npm run test:orb
npm run typecheck
npm run build
```

Backend Ofsted closer: `tests/test_orb_professional_curiosity_depth.py::test_general_ofsted_sanitize_strips_threshold_closer`.

## 12. Remaining real-device checks

- Safari desktop autofill on login (webkit overrides added; verify on device).
- Full live LLM Ofsted answer wording (sanitizer covered in pytest).
- Voice / passkey flows on physical hardware.
- Regression: mobile empty state, composer safe-area, safety modal.

**Target:** ChatGPT for residential childcare — premium, dark, simple, readable, no OS leakage, no raw errors, no square orb artefacts, no internal cognition language for normal users.
