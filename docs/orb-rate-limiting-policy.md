# ORB Rate Limiting Policy

Central rate limiting is implemented in:

- `services/security_rate_limit_service.py` — policies and sliding-window counters
- `middleware/orb_rate_limit_middleware.py` — uniform enforcement

Disable for local debugging: `DISABLE_RATE_LIMITING=true`

## Response shape (429)

```json
{
  "code": "rate_limit_exceeded",
  "message": "Too many requests. Please wait a moment and try again.",
  "policy": "orb_chat"
}
```

No stack traces. No request body content in logs.

## Policies (defaults)

| Policy name | Routes | Scope | Limit | Window |
|-------------|--------|-------|-------|--------|
| `auth_login` | `POST /auth/login` | IP | 12 | 1 min |
| `orb_signup` | `POST /orb/standalone/auth/signup` | IP | 5 | 15 min |
| `oauth_start` | `GET /orb/standalone/auth/oauth/*/start` | IP | 30 | 1 hour |
| `mfa_routes` | `POST /mfa/*` | IP + user | 20 | 1 min |
| `passkey_auth` | `POST /auth/passkeys/authenticate/*` | IP | 20 | 1 min |
| `orb_chat` | `POST /orb/standalone/conversation`, `/stream`, `/orb/ask` | User | 30/min, 500/day | 1 min / 24 h |
| `orb_dictate_ai` | Dictate transcribe/analyse/generate/finalise/edit/export/save/realtime | User | 20 | 1 min |
| `orb_voice` | Voice speak/transcribe/session/realtime/webrtc | User | 25 | 1 min |
| `orb_documents` | `POST /orb/standalone/documents/*` | User | 12 | 1 min |
| `orb_saved_outputs` | `POST/PATCH/DELETE /orb/standalone/outputs*` | User | 30 | 1 min |
| `orb_templates` | `POST /orb/standalone/templates*` | User | 20 | 1 min |
| `orb_billing` | Checkout, portal, trial start | User | 10 | 1 min |
| `admin_ai_settings` | `PATCH /api/admin/ai-settings` | User | 6 | 1 min |
| `admin_ai_usage_audit` | `GET /api/admin/ai-usage-audit` | User | 30 | 1 min |

## Exempt routes

- `POST /orb/standalone/billing/webhook` (Stripe retries must not be blocked)
- `GET /health`
- Static assets (`/css`, `/js`, `/assets`, `/components`)

OAuth **callbacks** are not rate-limited; only OAuth **start** endpoints are.

## Environment overrides

| Variable | Purpose |
|----------|---------|
| `ORB_RL_LOGIN_PER_MINUTE` | Login request cap |
| `ORB_RL_SIGNUP_PER_WINDOW` | Signup cap per window |
| `ORB_RL_SIGNUP_WINDOW_SECONDS` | Signup window |
| `ORB_RL_OAUTH_START_PER_HOUR` | OAuth start cap |
| `ORB_RL_CHAT_PER_MINUTE` | Chat per minute |
| `ORB_RL_CHAT_PER_DAY` | Chat per day |
| `ORB_RL_DOCUMENTS_PER_MINUTE` | Document AI routes |
| `ORB_RL_VOICE_PER_MINUTE` | Voice routes |
| `DISABLE_RATE_LIMITING` | Disable all middleware limits (dev/test) |

## Login failure lockout (separate)

`auth_routes.py` maintains failure-based lockout (`AUTH_MAX_FAILED_ATTEMPTS_PER_IP`, `AUTH_LOCKOUT_SECONDS`, etc.). This is complementary to request rate limiting.

## Multi-instance note

Counters are **in-memory per process**. For multi-node production, plan a shared store (Redis) — currently deferred.

## Audit events

Blocked requests emit `security.rate_limit_exceeded` with policy name, method, path, and scope only.
