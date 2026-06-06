# ORB Production Smoke Test Contract

Manual checklist for Render / live deployment validation. Run in a private browser session unless noted. Do not paste secrets, tokens, or child-identifiable content into tickets.

**Prerequisites:** Production `APP_ENV=production`, Stripe webhook configured, `SESSION_SECRET` set, SSL cookies enabled.

## Auth and gating

| # | Check | Pass criteria |
|---|-------|---------------|
| 1 | Incognito `/orb` | Redirects to `/orb/login` (or embedded login); no product shell |
| 2 | Incognito `/orb/write` | Redirects to login; no Write editor |
| 3 | Incognito `/orb?station=dictate` | Redirects to login; no Dictate station |
| 4 | Login | Email/password, OAuth, or passkey completes; session cookie set |
| 5 | Active subscriber | Full ORB product loads after safety acceptance if required |
| 6 | Inactive / expired user | Billing or upgrade screen; premium APIs return 402 |
| 7 | Billing checkout | Stripe Checkout opens from billing/upgrade UI |
| 8 | Safety acceptance | Modal appears when required; blocks AI until accepted |

## Core product flows

| # | Check | Pass criteria |
|---|-------|---------------|
| 9 | Chat | Send message; receive streamed or complete reply |
| 10 | Dictate | Record/analyse; generate output; open in ORB Write |
| 11 | Voice | Voice station opens; high-risk auto-speech blocked by safety rules |
| 12 | ORB Write | Open document; edit; save; export (PDF/DOCX as configured) |
| 13 | Templates | Open template; launches Dictate or ORB Write as designed |
| 14 | Documents | Compare documents; open result in ORB Write |
| 15 | Saved Outputs | Open saved item in ORB Write |

## Account and session

| # | Check | Pass criteria |
|---|-------|---------------|
| 16 | Settings / Profile / Billing drawers | Open from account menu without errors |
| 17 | Sign out | Returns to login; session cookie cleared |
| 18 | Browser back after sign-out | No usable product UI; re-auth required (`no-store` + gate) |

## Security

| # | Check | Pass criteria |
|---|-------|---------------|
| 19 | Unsafe upload | Executable or disallowed type rejected with safe error |
| 20 | Brain metadata | No internal routing/model metadata visible in UI |
| 21 | Console secrets | No API keys or session tokens in browser console |
| 22 | Network while logged out | No authenticated ORB API calls succeed (401/403/redirect) |

## Legacy routes (post follow-up)

| Route | Expected |
|-------|----------|
| `/orb/ask` | Login gate when logged out; product or upgrade when signed in |
| `/orb/profile` | Same |
| `/orb/intelligence-map` | Same |

## WebSocket / voice (production)

- Voice WebSocket connects with session cookie only (no `?token=` in URL).
- Revoked session cannot open voice or realtime sockets.

## Automated contract tests

Run before deploy:

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_websocket_auth_security.py tests/test_orb_session_revocation_security.py -q

cd frontend-next
npm run typecheck
node --experimental-strip-types --test \
  components/orb-residential/orb-legacy-route-gating.test.ts \
  components/orb-residential/orb-production-smoke-contract.test.ts \
  components/orb-residential/orb-auth-gate.test.ts \
  components/orb-residential/orb-security-no-product-flash.test.ts
```

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | |
| Security review | | | |
