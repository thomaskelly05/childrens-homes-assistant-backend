# ORB Residential Commercial Infrastructure Report

Sprint: **ORB Residential Commercial Infrastructure Pass**

## Audit note (pre-change baseline)

| Area | Finding |
|------|---------|
| **Auth** | OAuth at `/orb/standalone/auth/oauth/{provider}/start`; provider discovery at `GET /orb/auth/providers`; passkeys via WebAuthn client; sessions/JWT via existing auth stack |
| **Billing** | Stripe subscription at `/orb/subscription/*` and `/orb/standalone/billing/*`; webhooks on `/orb/standalone/billing/webhook`; `automatic_payment_methods` on checkout |
| **Usage** | Meter via `orb_billing_meter_service` / `orb_usage_events`; spending cap and top-up were documented but not implemented |
| **Projects** | Client-only `orb-projects` localStorage + seed folders; legacy `/orb/residential/projects` on `orb_saved_projects` |
| **Voice** | Turn-based `OrbVoiceStation` + composer mic; OS realtime routes exist separately — not duplex for Residential |
| **UI** | `OrbAppModal` pattern in place; billing modal was functional but compact / partial |

---

## 1. Auth wiring status

- Microsoft, Google, Apple OAuth routes unchanged and verified in tests.
- Login screen order: Microsoft → Google → Apple → Email → Passkey.
- Login now hydrates provider availability from `GET /orb/auth/providers` (falls back to build-time flags).
- Post-login redirect to `/orb`; billing gate when no access.
- Docs: `frontend-next/docs/orb-auth-production-setup.md`

## 2. OAuth env requirements

Documented: `MICROSOFT_*`, `GOOGLE_*`, `APPLE_*`, `APP_BASE_URL`, `FRONTEND_APP_URL`.

## 3. Stripe subscription setup

- `POST /orb/subscription/checkout` with success/cancel URLs defaulting to `/orb?billing=success` and `/orb?billing=cancelled`.
- `GET /orb/subscription`, `POST /orb/subscription/cancel`.
- **New:** `POST /orb/subscription/portal` (canonical alias to billing portal).

## 4. Apple Pay / Google Pay setup

Stripe Checkout `automatic_payment_methods` on subscription and top-up sessions. Dashboard steps documented in `orb-stripe-production-setup.md` (domain verification for `app.indicare.co.uk`).

## 5. Stripe payout / bank account note

Payout bank account is configured only in the Stripe Dashboard for the IndiCare account — not in code.

## 6. Spending cap endpoint

- `POST /orb/usage/spending-cap` — persists to `orb_usage_preferences`.
- `GET /orb/usage` — returns messages, caps, credits balance, estimated spend.

## 7. Top-up checkout endpoint

- `POST /orb/usage/top-up-checkout` — Stripe Checkout one-time payment (£5 / £10 / £25 / £50).
- Webhook credits `orb_usage_credits` on `checkout.session.completed` with `purchase_type=usage_topup`.

## 8. Billing modal upgrade

Premium wide modal: plan card (incl. ORB Voice), subscription status, usage, spending cap editor, buy-more buttons, subscribe / portal / refresh. Graceful copy when Stripe env missing (no “almost ready” as primary message).

## 9. Server-side project memory sync

- `GET/POST/PATCH/DELETE /orb/projects`
- `POST/DELETE /orb/projects/{id}/chats/{chat_id}`
- Tables: `orb_projects`, `orb_project_chats` (migration `206`)
- Client sync in `orb-projects-client.ts` with localStorage fallback

## 10. Project memory in chat context

- `project_memory` on standalone conversation request.
- Framed as user-supplied ORB memory, not live OS data.

## 11. ORB Voice improvements

- Wider voice station modal, explicit “Voice starts only when you press Start” copy.
- Composer mic / speak-answer unchanged but verified in tests.

## 12. Voice backend / realtime follow-up

- Stubs: `POST /orb/voice/transcribe`, `/speak`, `/session`.
- Doc: `frontend-next/docs/orb-voice-realtime-follow-up.md`

## 13. Premium modal polish

- Larger modal headers and spacing in `OrbStandalonePanelShell`.
- Billing and project memory modals use `wide` / `standard` sizes and glass section cards.

## 14. Station app auth fallback

- Billing loads partial state on API failure; knowledge/templates patterns unchanged (built-in fallbacks).
- Project sync failures keep local workspace.

## 15. Tests / build result

| Check | Result |
|-------|--------|
| `pytest tests/test_orb_commercial_infrastructure.py` (+ oauth/stripe) | 17 passed |
| `npm run test:orb` | 244 passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |

## 16. Remaining production setup tasks

1. Apply `sql/206_orb_commercial_infrastructure.sql` on production Postgres.
2. Configure Stripe live keys, price ID, webhook secret, Apple Pay domain verification.
3. Configure OAuth apps for Microsoft, Google, Apple with production redirect URIs.
4. Enable Stripe Customer Portal configuration ID (optional).
5. Monitor webhooks and `orb_usage_credits` after first top-ups.
6. Plan duplex voice provider (WebRTC/WebSocket) per voice follow-up doc.
