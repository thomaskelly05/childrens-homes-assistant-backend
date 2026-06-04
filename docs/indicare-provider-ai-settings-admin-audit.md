# Provider AI Trust Settings — Admin Audit

Audit date: 2026-06-04. This document records the pre-implementation state and what was added for provider/home AI trust admin APIs.

## Services reviewed

| Component | Path | Status before | Status after |
|-----------|------|---------------|--------------|
| Provider settings | `services/provider_data_intelligence_settings_service.py` | Env-only `defaults()` + `from_record()` | DB + env merge, `get_effective_bundle()`, strictest home override, fail-safe on DB error |
| Privacy decisions | `services/ai_privacy_decision_service.py` | Used `defaults()` | Uses `get_effective_settings()` |
| External call governance | `services/ai_external_call_governance.py` | Via privacy decision | Unchanged surface; inherits effective settings |
| AI gateway | `services/ai_gateway_service.py` | Used `defaults()` | Uses `get_effective_settings()` |
| Usage audit | `services/ai_usage_audit_service.py` | `record()` only | `record()` + `list_safe()` for admin query |
| Reports | `routers/reports_routes.py` | `defaults()` | `get_effective_settings()` |

## Schemas

- `schemas/data_intelligence.py` — `ProviderDataIntelligenceSettings` extended with `premium_tts_enabled`, `local_policy_sources_enabled`; added `ProviderAISettingsSourceBundle` for admin responses.
- `schemas/data_protection.py` — `AIPrivacyDecision` unchanged; still the runtime gate output.

## Settings that exist

| Setting | Env fallback | DB column | Home override |
|---------|--------------|-----------|---------------|
| `external_ai_enabled` | `AI_EXTERNAL_PROCESSING_ENABLED` (default false) | yes | Stricter only (cannot enable above provider) |
| `redaction_mode` | `AI_REDACTION_MODE` (default strict) | yes | Cannot weaken provider |
| `allowed_ai_features` | Derived from external AI env | yes | Intersection with provider list |
| `prompt_storage` | `AI_STORE_PROMPTS` (default false) | yes | Cannot enable above provider |
| `transcript_storage` | `AI_STORE_TRANSCRIPTS` (default false) | yes | Cannot enable above provider |
| `realtime_voice_enabled` | `ORB_REALTIME_VOICE_ENABLED` | yes | Stricter only |
| `report_ai_drafting_enabled` | `REPORT_AI_DRAFTING_ENABLED` | yes | Stricter only; requires external AI |
| `premium_tts_enabled` | default false | yes | Stricter only |
| `data_retention_days` | not in env | yes | Shorter retention wins |
| `local_policy_sources_enabled` | default false | yes | Stricter only |
| `orb_enabled`, inspection flags | env only | not in DB | env only for now |

Restricted decision features (`safeguarding_decision`, `lado_decision`, `police_decision`, `medical_diagnosis`, `legal_decision`) cannot be added to `allowed_ai_features`.

## Database persistence

| Table | Migration |
|-------|-----------|
| `provider_ai_settings` | `sql/210_provider_ai_settings.sql` |
| `provider_ai_settings_audit` | `sql/210_provider_ai_settings.sql` |
| `ai_usage_audit` | `sql/211_ai_usage_audit.sql` |

Unique index: `(provider_id, COALESCE(home_id, 0))`.

## Admin routes

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/ai-settings` | Admin / RI (write roles); manager/deputy read |
| PATCH | `/api/admin/ai-settings` | Admin / RI only |
| GET | `/api/admin/ai-trust-status` | Same as read |
| GET | `/api/admin/ai-usage-audit` | Same as read; safe metadata only |

Routes use the `/api/admin` prefix (same convention as `/api/admin/os-wiring`) so JSON admin APIs are not blocked by the HTML `/admin` access-scope middleware.

Router: `routers/admin_ai_settings_routes.py` (registered in `core/router_loader.py`).

Staff (`support_worker`, `staff`, etc.) cannot PATCH. Managers have read-only access.

## Role / permission model

Canonical roles via `auth/rbac.py`:

- **Write:** `admin` (includes aliases `provider_admin`, `ri`, `responsible_individual`, …)
- **Read:** `admin`, `manager`, `deputy_manager`
- **Denied:** `support_worker`, `staff`, `viewer`

`settings:manage` permission exists in RBAC but admin AI routes use explicit role checks aligned with `admin_routes` patterns.

## Usage audit query

- `AIUsageAuditService.list_safe()` — no prompt/transcript/document/model output fields.
- Admin API filters: `date_from`, `date_to`, `feature`, `home_id`, `limit`.

## Frontend

| Location | Capability |
|----------|------------|
| `frontend-next/app/settings/page.tsx` | Read-only governance display (existing) |
| `frontend-next/app/settings/ai-trust/page.tsx` | **Added:** provider admin edit form for trust settings |

Legacy `frontend/` has no provider AI settings editor.

## Env-only (unchanged this pass)

- `ORB_ENABLED`, `DEMO_MODE_ENABLED`, `INSPECTION_READINESS_ENABLED`
- OpenAI model/cost env vars for gateway
- Legacy `services/ai_provider_policy.py` (parallel env policy; not removed)

## Governance integration

Paths now using effective provider/home settings:

- `AIPrivacyDecisionService.resolve_settings`
- `AIGatewayService.governance_status` and `_govern_request`
- `routers/reports_routes` drafting check

Paths still env-only or ad-hoc `from_record(dict)`:

- `services/metadata_extraction_service.py` — optional `provider_policy` dict param
- `services/orb_cost_optimised_retrieval.py` — optional `settings` dict param

These accept explicit overrides at call site; not a blocker for admin API.

## Remaining gaps

- Authenticate `/api/ai/governance/status` (still public read in `core/app_factory.py`).
- Wire `settings:manage` permission string to routes if product wants permission-matrix-only checks.
- Full home-level PATCH validation against live provider row when provider row only in DB (partially enforced).
- Automated migration runner in deploy pipeline (SQL files must be applied manually per AGENTS.md).
