# ORB Residential Convergence Build Audit

Date: 2026-05-28  
Product: **ORB Residential — Powered by IndiCare Intelligence**  
Price: **£9.99 per user per month** (entire product premium)

## Executive summary

This pass converged standalone ORB Residential onto the shared IndiCare Intelligence Spine while enforcing hard boundaries against IndiCare OS operational data. Premium gating, Shift Builder, saved outputs/projects, runtime guards, intelligence services, knowledge modules, API routes, frontend screens, and tests were implemented or extended.

## What exists (reused)

| Area | Existing assets reused |
|------|------------------------|
| Intelligence spine | `services/orb_residential_intelligence_service.py`, `assistant/knowledge_loader.py`, `assistant/answer_quality.py`, `assistant/response_contracts.py`, `assistant/modes.py` |
| Standalone runtime | `services/orb_general_assistant_service.py`, `routers/orb_standalone_routes.py` |
| Convergence wrapper | `services/orb_converged_general_assistant_service.py` (now default via `ORB_USE_CONVERGED_RUNTIME`) |
| Shift Builder | `services/orb_shift_builder_service.py`, `schemas/orb_shift_builder.py` |
| Premium data layer | `db/orb_residential_db.py`, `sql/200_orb_residential_premium.sql` |
| Access | `services/orb_access_service.py` |
| Runtime guard | `services/orb_runtime_guard_service.py` |
| Billing | `routers/billing_routes.py`, Stripe webhook + checkout |
| Auth | `auth/current_user.py`, session cookies, `require_standalone_orb_access` |
| Frontend standalone | `frontend-next/app/orb`, `components/orb-standalone/*` |

## What was converged (this pass)

1. **Premium API surface** — `routers/orb_residential_premium_routes.py` wired with access, trial, onboarding, conversation, shift-builder, projects, outputs.
2. **Auth dependencies** — `auth/orb_residential_dependencies.py` (premium 402 payloads, no OS links).
3. **Runtime guard middleware** — `middleware/orb_residential_guard_middleware.py` blocks operational paths for residential-scoped sessions.
4. **Standalone conversation** — uses `orb_converged_general_assistant_service` by default.
5. **Intelligence services** — `safeguarding_intelligence_service`, `therapeutic_intelligence_service`, `recording_intelligence_service` integrated into residential prompt building.
6. **Knowledge gaps** — modules: `regulatory_framework`, `working_together`, `reg44_reg45`, `pace_attachment`, `medication_restraint`.
7. **Frontend** — `frontend-next/app/orb-residential/*` mobile-first premium shell.
8. **Tests** — `tests/test_orb_residential_convergence.py`.

## Routes

| Method | Path | Gating |
|--------|------|--------|
| GET | `/orb/residential/health` | Public |
| GET | `/orb/residential/product` | Public |
| GET | `/orb/residential/access` | Auth |
| POST | `/orb/residential/trial/start` | Auth |
| GET/POST | `/orb/residential/onboarding/preferences` | Auth |
| POST | `/orb/residential/conversation` | Premium |
| POST | `/orb/residential/shift-builder` | Premium |
| GET/POST | `/orb/residential/projects` | Premium |
| GET/POST | `/orb/residential/outputs` | Premium |

Legacy `/orb` standalone routes remain for backward compatibility; residential product should prefer `/orb/residential/*`.

## Blocked operational patterns (ORB Residential scope)

`/os`, `/chronology`, `/provider`, `/governance`, `/dashboard`, `/operational`, `/management`, `/safeguarding/live`, `/young-people`, `/childrens-home-os`, `/assistant/os`, `/orb/operational`

## What remains

| Item | Notes |
|------|-------|
| OAuth providers | Google/Apple/Microsoft/magic link — document in `docs/orb-auth-and-payments-convergence.md`; use existing auth routes + provider env vars |
| Dedicated Stripe price for ORB Residential | Reuse `STRIPE_PRICE_ID` or add `ORB_RESIDENTIAL_STRIPE_PRICE_ID` |
| `product_entitlement` user flag | Optional explicit DB column for mixed OS+ORB accounts |
| Full frontend polish | Voice, documents, agents panels not duplicated under `/orb-residential` yet |
| Apply SQL migration | Run `sql/200_orb_residential_premium.sql` on target DB |
| regulation_citations / ofsted_sccif optional modules | Still optional imports |

## Risks

- Users with both OS and ORB access are only blocked when `X-ORB-Surface: orb_residential` header/cookie is set or they lack `chronology:read`.
- Premium tables require migration before production routes persist data.
- Conversation route calls LLM — costs accrue; usage logging via `record_orb_usage_event` should be wired on success paths (next task).

## Files changed (this pass)

- `auth/orb_residential_dependencies.py` (new)
- `middleware/orb_residential_guard_middleware.py` (new)
- `routers/orb_residential_premium_routes.py` (extended)
- `routers/orb_standalone_routes.py`
- `core/router_loader.py`, `core/middleware.py`
- `db/orb_residential_db.py`
- `services/orb_converged_general_assistant_service.py`
- `services/orb_residential_intelligence_service.py`
- `services/orb_runtime_guard_service.py`
- `services/orb_shift_builder_service.py`
- `services/safeguarding_intelligence_service.py` (new)
- `services/therapeutic_intelligence_service.py` (new)
- `services/recording_intelligence_service.py` (new)
- `schemas/orb_shift_builder.py`
- `assistant/knowledge/*.py` (new modules)
- `assistant/knowledge_loader.py`
- `frontend-next/app/orb-residential/**` (new)
- `frontend-next/components/orb-residential/**` (new)
- `frontend-next/lib/orb-residential-api.ts` (new)
- `tests/test_orb_residential_convergence.py` (new)
- `docs/orb-residential-build-audit.md` (this file)
