# ORB API Security Access Matrix

**Legend — Status:** `pass` | `fixed` | `gap` | `public`

| Method | Path | Purpose | Auth | Active access | Scope | CSRF | Rate limit | AI governance | Safe logs | Tests | Status |
|--------|------|---------|------|---------------|-------|------|------------|---------------|-----------|-------|--------|
| POST | `/orb/standalone/auth/signup` | Create ORB account | No | No | User | Exempt | Yes (IP) | N/A | Yes | Yes | public |
| GET | `/orb/standalone/access` | Access payload | Optional | No | User | No | No | N/A | Yes | Yes | public |
| POST | `/orb/standalone/billing/checkout` | Stripe checkout | Yes | No | User | Yes | Yes (user) | N/A | Yes | Yes | pass |
| POST | `/orb/standalone/billing/portal` | Stripe portal | Yes | No | User | Yes | Yes (user) | N/A | Yes | Yes | pass |
| POST | `/orb/standalone/billing/webhook` | Stripe events | Signature | No | System | Exempt | No | N/A | Yes | Yes | pass |
| POST | `/orb/standalone/trial/start` | Start trial | Yes | No | User | Yes | Yes (user) | N/A | Yes | Yes | pass |
| POST | `/orb/standalone/safety/accept` | Safety gate | Yes | No | User | Yes | No | N/A | Yes | Yes | pass |
| POST | `/orb/standalone/conversation` | ORB chat | Yes | Yes | User | Yes | Yes (user min+day) | Yes | Yes | Yes | pass |
| POST | `/orb/standalone/conversation/stream` | Streaming chat | Yes | Yes | User | Yes | Yes (user min+day) | Yes | Yes | Yes | pass |
| POST | `/orb/standalone/documents/upload` | Document upload | Yes | Yes | User | Yes | Yes (user) | Yes | Yes | Yes | fixed |
| POST | `/orb/standalone/documents/analyse` | Document analysis | Yes | Yes | User | Yes | Yes (user) | Yes | Yes | Partial | pass |
| POST | `/orb/standalone/documents/compare` | Doc comparison | Yes | Yes | User | Yes | Yes (user) | Yes | Yes | Partial | pass |
| GET/POST | `/orb/standalone/outputs/*` | Saved outputs | Yes | Yes | User | Yes | Yes (user) | Partial | Yes | Yes | pass |
| GET/POST | `/orb/standalone/templates/*` | Templates | Yes | Yes | User | Yes | Yes (user) | Yes | Yes | Partial | pass |
| GET/POST | `/orb/dictate/*` (AI) | Dictate workflows | Yes | Yes | User | Yes | Yes (user) | Yes | Yes | Yes | fixed |
| GET | `/orb/dictate/templates` | Template list | Yes | No | User | No | No | N/A | Yes | Partial | pass |
| POST | `/orb/voice/speak` | Premium TTS | Yes | Yes | User | Yes | Yes (user) | Yes | Yes | Yes | fixed |
| POST | `/orb/voice/session` | Voice session | Yes | Yes | User | Yes | Yes (user) | Yes | Yes | Yes | fixed |
| GET | `/orb/voice/session/status` | Config probe | Yes | No | User | No | No | N/A | Yes | Yes | pass |
| GET/POST | `/orb/projects/*` | Project memory | Yes | Yes | User | Yes | No | N/A | Yes | Yes | fixed |
| GET | `/orb/residential/health` | Product health | No | No | — | No | No | N/A | Yes | Partial | public |
| GET | `/orb/residential/product` | Product info | No | No | — | No | No | N/A | Yes | Partial | public |
| GET | `/orb/standalone/auth/oauth/{p}/start` | OAuth start | No | No | User | Exempt | Yes (IP) | N/A | Yes | Yes | public |
| GET | `/orb/standalone/auth/oauth/{p}/callback` | OAuth callback | No | No | User | Exempt | No | N/A | Yes | Yes | public |
| GET | `/api/admin/ai-settings` | Read AI settings | Manager+ | N/A | Provider | No | No | N/A | Yes | Yes | pass |
| PATCH | `/api/admin/ai-settings` | Update AI settings | Admin | N/A | Provider | Yes | Yes (user) | N/A | Yes | Yes | pass |
| GET | `/api/admin/ai-usage-audit` | Usage audit | Manager+ | N/A | Provider | No | Yes (user) | N/A | Yes | Yes | pass |
| POST | `/orb/conversation` (OS) | Operational ORB | Assistant | OS RBAC | Home | Yes | Partial | Yes | Yes | Partial | pass |

**CSRF:** Browser POSTs from Next app include CSRF token via `authFetch`. Webhook/signup/OAuth exempt by design.

**AI governance:** External calls route through `AIPrivacyDecisionService`, `AIGatewayService`, or `ai_external_call_governance`.

**Active access:** `can_use_orb` + `safety_accepted` via `orb_access_service` / `require_rich_orb_premium_access`.

## WebSocket / realtime (follow-up 2026-06-06)

| Path | Auth | Revocation | Query `?token=` (production) | Status |
|------|------|------------|------------------------------|--------|
| `GET /orb/realtime/ws` | Cookie / Bearer | Yes | Rejected | fixed |
| `WS /orb/voice/ws/{id}` | Cookie / Bearer | Yes | Rejected | fixed |
| OS operational WS | Cookie / Bearer | Yes | Rejected | fixed |
| `WS /assistant/realtime/ws` | Cookie / Bearer | Yes | Rejected | fixed |

**Residential HTTP loader:** `get_orb_residential_user` enforces `_enforce_session_state` (revocation + touch) — status **fixed**.

**Frontend legacy routes:** `/orb/ask`, `/orb/profile`, `/orb/intelligence-map` — `OrbAuthGate` + middleware — status **fixed**.
