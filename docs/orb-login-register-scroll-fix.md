# ORB Residential login/register scroll and presentation fix

## Live issue observed

Safari desktop and iPhone testing showed the ORB Residential login screen was not launch-ready:

- **Create account** sat below the visible viewport on common mobile and short desktop heights.
- The **passkey** section was partially visible but the passkey button could be unreachable.
- The login panel did not clearly scroll; the right card felt vertically trapped inside a centred full-height layout.
- Safari browser chrome, the iPhone home indicator, and the Mac dock could hide bottom actions.
- OAuth buttons were visible, but new-user registration was not prominent enough.
- Numbered steps (`1. Continue with work account`, `2. Continue with email`, `3. Use passkey`) made the screen feel like a long staged process.

## Screenshot-based finding

On iPhone-sized viewports (~390×667–844) and short desktop Safari (~1440×760), the centred `100dvh` shell with `overflow: hidden` on desktop prevented reaching Create account, passkey controls, and footer/legal links without awkward nested scrolling.

## Old layout problem

1. Desktop `.orb-login-shell` used `max-height: 100dvh` and `overflow: hidden`, centring a tall card without independent scroll.
2. Create account and provider hints were placed **after** email and passkey sections.
3. Visible numbering implied a multi-step funnel rather than a simple sign-in choice.
4. Email login used a two-step “continue then password” flow that pushed passkey and registration further down.

## New layout order

1. **Header** — Sign in to ORB Residential  
   Subtext: Use your work account, email or passkey.
2. **OAuth** — Continue with Apple / Google / Microsoft (`Continue with` heading)
3. **New user CTA** — New to ORB Residential? → **Create account** (full-width primary button)
4. **Email sign-in** — Sign in with email / Already have an account? → email + password + Sign in with email
5. **Passkey** — Use passkey (collapsible on compact heights; always visible as a section)
6. **Footer** — disclaimer + legal/support links

Numbered step labels were removed.

## Scroll/reachability fix

**CSS (`frontend-next/app/orb/orb-login.css`):**

- Mobile: natural page scroll on `.orb-login-root`; safe-area padding on bottom.
- Desktop: removed `overflow: hidden` trap; `.orb-login-panel` and `.orb-login-card` use `overflow-y: auto` with `max-height: calc(100dvh - safe spacing)`.
- `min-height` instead of fixed height; `env(safe-area-inset-bottom)` on panel and footer.

**Component (`orb-login-screen.tsx`):**

- Reordered sections for conversion (OAuth → Create account → Email → Passkey).
- Single email form (email + password together).
- Passkey toggle clearly labelled “Use passkey” on compact viewports.
- OAuth errors still surface at top of card; disabled providers show “unavailable” labels.

## Viewports tested

| Viewport | Purpose |
|----------|---------|
| 390×667 | iPhone SE / compact Safari |
| 390×844 | iPhone standard |
| 430×932 | iPhone Pro Max |
| 768×1024 | iPad portrait |
| 1440×760 | Short desktop Safari (dock + chrome) |
| 1440×900 | Standard desktop |

## Tests run

```bash
cd frontend-next
npm run typecheck
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run e2e:orb-auth
```

E2E coverage includes:

- `e2e/orb-passkey-mobile.spec.ts`
- `e2e/orb-auth-register-billing.spec.ts`
- `e2e/orb-auth-cookie-session.spec.ts`
- `e2e/orb-login-scroll-reachability.spec.ts` (new)

Assertions: scroll reachability, Create account link to `/orb/signup`, passkey toggle/button, footer/legal links, no horizontal overflow, presentation order, OAuth unavailable states, email login unchanged.

## Out of scope (provider console)

Google, Microsoft, and Apple OAuth **provider console configuration** (client IDs, redirect URIs, Apple Services ID, etc.) are separate provider-console tasks. This PR fixes login/register **presentation and scroll reachability only** — it does not change backend auth, OAuth logic, Stripe/billing, or public routes.
