# ORB Auth, Register, Billing & Cookie E2E

End-to-end Playwright coverage for the ORB Residential access journey (login, register, billing, passkey, cookies/sessions). Tests run against the Next.js dev server with `NEXT_PUBLIC_E2E_TEST_MODE=1` and **mocked** backend APIs — no real Stripe, OAuth providers, or WebAuthn biometrics.

## Routes tested

| Route | Coverage |
|-------|----------|
| `/orb` (canonical login front door) | Logged-out gate, login form, post-login redirect |
| `/orb/login` | Redirect to `/orb` + embedded login gate |
| `/orb/signup` | Form fields, validation, mocked signup → `/orb/setup` |
| `/orb/billing` | Inactive subscribe/trial CTAs, active manage billing, checkout copy |
| `/orb/billing/success` | Access refresh status, continue to ORB |
| `/orb/billing/cancel` | Retry, return, create account / trial |

## Viewports tested

| Size | Label |
|------|-------|
| 390×844 | iPhone 14 class |
| 390×667 | Compact phone (passkey collapse) |
| 430×932 | Large phone |
| 768×1024 | Tablet login scroll |

## Test files

| File | Focus |
|------|-------|
| `frontend-next/e2e/orb-passkey-mobile.spec.ts` | Mobile scroll, passkey reachability, WebAuthn mocks |
| `frontend-next/e2e/orb-auth-register-billing.spec.ts` | Signup, billing, checkout handoff, OAuth buttons |
| `frontend-next/e2e/orb-auth-cookie-session.spec.ts` | Stale cookies, failed login, logout, redirects |
| `frontend-next/e2e/orb-audit-helpers.ts` | Shared mocks (`setupOrbAuthE2eMocks`, scroll helpers) |

## Commands

```bash
cd frontend-next
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run e2e:orb-auth
```

Run a single file:

```bash
cd frontend-next
NEXT_PUBLIC_E2E_TEST_MODE=1 npx playwright test e2e/orb-passkey-mobile.spec.ts
```

## Pass / fail summary

| Area | Status | Notes |
|------|--------|-------|
| Login mobile scroll (4 viewports) | PASS | Vertical scroll + reachability for passkey, create account, legal footer |
| `/orb/login` redirect | PASS | Legacy path → canonical `/orb` gate |
| Register `/orb/signup` | PASS | Fields, HTML validation, mocked signup → setup |
| Billing inactive / active | PASS | Subscribe, trial, manage billing states |
| Checkout handoff | PASS | POST to checkout endpoint; mock Stripe URL navigation |
| Success / cancel routes | PASS | Refresh copy; clear next actions |
| Stale cookie | PASS | Invalid session cookie does not trap user |
| Failed → successful login | PASS | No manual cookie clear required |
| Logout | PASS | Sign out → login gate on revisit |
| OAuth buttons | PASS | Enabled/disabled copy; `oauth_error` message |
| Passkey (mocked WebAuthn) | PASS | Email required, cancel message, success sign-in |
| Horizontal overflow (login) | PASS | 390px width audit |

## Cookie / session findings

- **Logged out:** Clearing cookies and visiting `/orb` shows the embedded login gate (`data-orb-login-page`); product shell does not mount.
- **Stale cookie:** Injecting `indicare_session=invalid` with a 401 `/auth/me` mock and `clear_session` verdict does not block the login form; users can sign in again without manually clearing cookies.
- **E2E auto-auth bypass:** `sessionStorage.setItem('e2e-auth-auto', '0')` (via `disableE2eAutoAuth`) disables compile-time E2E auto-login so real login/logout flows can be exercised with route mocks only.
- **Logout:** Account menu sign-out clears frontend auth state; reloading `/orb` with unauthenticated verdict shows login again.

## Passkey findings

- On viewports under 720px height, the passkey section collapses behind `data-orb-passkey-toggle`; E2E verifies toggle → reveal → button reachability.
- Unsupported browsers show `data-orb-passkey-unavailable`.
- Email is required before passkey attempt.
- Cancelled WebAuthn (`NotAllowedError`) surfaces a friendly error.
- Mocked successful passkey completes sign-in when front-door verdict switches to `ready`.

## Signup findings

- Required fields and create-account CTA are visible on mobile.
- HTML `minLength={12}` blocks weak passwords before submit.
- Mocked `POST /orb/standalone/auth/signup` + login redirects to `/orb/setup` (no real account creation).

## Billing findings

- Inactive users see **Start ORB Residential** and subscribe/trial CTAs.
- Active users with `manage_billing_available` see **Manage billing**.
- Checkout uses `POST /orb/subscription/checkout` (or legacy standalone path); tests assert mock URL handoff.
- Copy on billing upgrade screen: *"Pay securely by card, Apple Pay or Google Pay where available via Stripe Checkout."* — no false Face ID / Touch ID wallet promises outside Stripe.

## Presentation fixes applied (launch blockers only)

1. **OAuth order on login (mobile):** Apple → Google → Microsoft → email → passkey.
2. **Create account CTA:** Prominent full-width button — *"New to ORB? Create account"*.
3. **Billing checkout copy:** Stripe wallet wording when checkout is available.

## Remaining blockers

None identified by this E2E suite in mocked mode.

## Non-blocking improvements

- Add Playwright visual regression snapshots for login at 390×667.
- Wire CI job to run `e2e:orb-auth` on every PR (dev server startup ~2 min).
- Extend passkey E2E to post-login passkey setup prompt when setup UI is stable.
- Real-backend smoke (optional): single authenticated journey against staging with test credentials.

## Guards verified

- Auth is **not** bypassed in production — mocks and `e2e-auth-auto` are test-only.
- Billing gates and ORB/OS boundaries unchanged.
- No real Stripe or OAuth calls in CI.
