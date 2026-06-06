# ORB Security Headers and CSP

## Backend (FastAPI)

`middleware/security_middleware.py` → `SecurityHeadersMiddleware` sets:

| Header | Value / notes |
|--------|---------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` when HTTPS or `FORCE_HSTS=true` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera off; microphone self; payment off |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` (API); `cross-origin` for public static assets |
| `Cache-Control` | `no-store` on non-static responses |
| CSP | See below |

### CSP mode

| `ORB_CSP_MODE` | Header sent |
|----------------|-------------|
| `report-only` (default) | `Content-Security-Policy-Report-Only` |
| `enforce` | `Content-Security-Policy` |

Optional: `ORB_CSP_REPORT_URI` for violation reports.

### Allowed sources (backend CSP)

- **Scripts/styles:** `'self' 'unsafe-inline'` (legacy ORB bootstrap and vanilla frontend)
- **Images:** `'self' data: blob: https:`
- **Connect:** `'self'`, OpenAI API/WSS, Stripe API/checkout/billing
- **Frames:** `'self'`, `js.stripe.com`, `hooks.stripe.com`, `checkout.stripe.com`
- **frame-ancestors:** `'self'`

## Frontend (Next.js)

`frontend-next/middleware.ts` adds on **ORB product paths** (`/orb/*` excluding public login/signup/billing):

- `Cache-Control: no-store`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`, `Permissions-Policy`
- `X-Frame-Options: SAMEORIGIN`
- CSP report-only (or enforce if `ORB_CSP_MODE=enforce`)

Next.js dev requires `'unsafe-eval'` in script-src for hot reload — applied only on ORB product shell headers.

## Compatibility checklist

| Integration | Supported |
|-------------|-----------|
| Next.js app shell | Yes (report-only CSP) |
| OAuth redirects | Yes (no CSP on callback host blocking redirects) |
| Stripe checkout/portal | Yes (`frame-src` + `connect-src` Stripe domains) |
| WebSockets / voice realtime | Yes (`wss:` in frontend connect-src; OpenAI wss on backend) |
| PDF/export download | Yes (`blob:` img-src; same-origin downloads) |
| Inline ORB appearance bootstrap | Yes (`unsafe-inline` — migrate to nonce/hash before strict enforce) |

## Rollout recommendation

1. **Now:** Report-only CSP in production (`ORB_CSP_MODE=report-only`)
2. **Monitor:** Collect violations via `ORB_CSP_REPORT_URI` if configured
3. **Later:** Tighten to enforce after inline script audit on ORB residential shell

## Tests

`tests/test_orb_security_headers.py` asserts headers on protected ORB API paths.
