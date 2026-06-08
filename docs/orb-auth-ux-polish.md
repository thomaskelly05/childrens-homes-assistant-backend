# ORB Residential auth UX polish

Summary of the ORB Residential login, access and billing-gate improvements.

## Login redesign

- Two-column desktop layout: product story on the left, auth card on the right.
- Warm purple/blue gradients, glowing ORB hero, value chips and trust note.
- Auth card heading: **Welcome to ORB Residential** with social sign-in prominent.
- Provider order: Google → Microsoft → Create account → Email → Passkey.

## Apple remains disabled

- `APPLE_AUTH_ENABLED` defaults false.
- Apple is omitted from `/orb/auth/providers`.
- Disabled Apple routes return 404; no Apple env vars are required for startup.

## Legal and support footer links

- Login/signup footers render **Privacy · Terms · Cookies · Support** as separate internal links.
- Default hrefs: `/privacy`, `/terms`, `/cookies`, `/support`.
- Backend `/orb/auth/providers` returns the same legal map.
- Placeholder pages exist for cookies and support.

## OAuth loading states

- Clicking Google or Microsoft immediately shows **Redirecting to Google…** / **Redirecting to Microsoft…**.
- Buttons disable repeated clicks during redirect.
- After handoff, the gate shows **Finishing sign in…** while the session is confirmed.

## OAuth performance (backend)

- HTTP timeouts reduced to 8 seconds.
- Token exchange and profile fetch share a single httpx client where possible.
- Microsoft prefers `id_token` claims and skips Graph `/me` when email and subject are present.
- Safe timing logs around start, token exchange, profile fetch, user lookup and callback total time.
- No tokens or secrets are logged.

## Access / billing gate escape routes

Every billing gate state includes:

- **Return to ORB** — always available.
- **Switch account** — logs out and returns to the ORB front door to choose another provider.
- **Manage billing** — when Stripe portal is available.
- **Refresh status** — re-fetches access from the backend.

Copy explains the signed-in email, subscription state, and duplicate-provider guidance when a user may have subscribed with a different sign-in method.

## Switch account behaviour

- Clears the ORB browser session via the standard logout flow.
- Redirects to `/orb` (canonical front door) with a safe `returnUrl`.
- Does not modify Stripe customer/subscription records server-side.

## Account linking by verified email

When Google or Microsoft OAuth completes:

1. Provider email is normalised.
2. If an existing ORB Residential user has the same verified email, the new provider is linked to that user.
3. Subscription/trial state is preserved on the existing user record.
4. IndiCare OS-scoped accounts are still rejected.
5. Audit logs record `linked_via=verified_email` without tokens or secrets.

## Route loop safety

- Client loop guard tracks `/orb`, `/orb/billing` and login aliases.
- Repeated automatic redirects within a short window are blocked.
- OAuth, billing success/cancel and MFA paths are exempt.
- Legacy `/orb/login` URLs redirect to `/orb`; OAuth errors land on `/orb?oauth_error=…`.

## Tests

Backend:

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_auth_production_readiness.py tests/test_orb_oauth_routes.py tests/test_orb_billing_routes.py -q
```

Frontend:

```bash
cd frontend-next
npm run typecheck
npm run build
npm test -- --runInBand
```
