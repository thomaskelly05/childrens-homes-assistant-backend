# IndiCare Intelligence + ORB Residential — Full System Audit (Phase 1)

**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Audit date:** 10 June 2026  
**Scope:** IndiCare Intelligence, ORB Residential (`/orb`), Founder OS (ORB-launch support only)

---

## Executive system overview

IndiCare OS is a monolithic **Python FastAPI** backend (`app.py` → `core/app_factory.create_app()`) serving:

1. **IndiCare OS** — operational children's homes platform (chronology, safeguarding, workforce, documents)
2. **ORB Residential** — standalone subscription product at `/orb` (chat, voice, dictate, write, templates, exports)
3. **Founder OS** — founder-only oversight surfaces at `/founder/*`

The modern product UI lives in **`frontend-next/`** (Next.js, port 3001). Legacy vanilla UI remains in **`frontend/`** and is not the ORB Residential launch surface.

**Architecture principle (verified in code):** ORB is the shell; **IndiCare Intelligence** is the brain (`services/indicare_intelligence_core_service.py`). Standalone ORB explicitly forbids OS record leakage (`services/orb_standalone_boundary.py`).

---

## Backend structure

| Area | Path | Purpose | Status |
|------|------|---------|--------|
| App entry | `app.py` | Startup patches + `create_app()` | Production |
| App factory | `core/app_factory.py` | FastAPI app, middleware, lifespan | Production |
| Router loader | `core/router_loader.py` | 12 router groups, ~170 modules | Production |
| Auth | `auth/` | Session, ORB residential auth, RBAC | Production |
| DB connection | `db/connection.py` | Pooled PostgreSQL, `sslmode=require` | Production |
| DB modules | `db/*.py` | ORB, founder, MFA, billing, projects | Production |
| Services | `services/` (~400+ files) | Business logic | Mixed |
| ORB services | `services/orb_*.py` (~150 files) | ORB brain, voice, dictate, billing | Mostly production |
| Intelligence | `services/indicare_intelligence_*.py` | Central brain spine | Production |
| Assistant | `assistant/` (112 files) | Knowledge, orchestration, legacy assistant | Mixed (legacy + active knowledge) |
| Schemas | `schemas/` | Pydantic models | Production |
| SQL migrations | `sql/`, `db/migrations/`, `migrations/` | Schema evolution | Manual apply required |
| Tests | `tests/` (679 files) | Pytest suite | Extensive; some fixture debt |

### Router groups (`core/router_loader.py`)

| Group | Classification | Notes |
|-------|----------------|-------|
| `core` | Canonical | Auth, MFA, passkeys, billing, admin |
| `assistant_orb` | Mixed | ORB standalone + operational + legacy assistant refs |
| `os_command` | Canonical | Child workspace, OS command centre |
| `governance` | Canonical | Inspection, SCCIF, intelligence governance |
| `workforce` | Mixed | Workforce OS, academy |
| `documents` | Mixed | Document OS, exports |
| `reports` | Canonical | Incident reports, handovers, recording drafts |
| `safeguarding` | Mixed | Risk, missing episodes, ISN |
| `experience_bundles` | Canonical | Workspace, Reg 45, manager brief |
| `chronology` | Canonical | Young person chronology plane |
| `compliance_and_live_os` | Canonical | Care hub, realtime OS, observability |

**Startup patches:** `startup_live_child_scope_patch.py`, `startup_live_chronology_fallback_patch.py`, `startup_life_echo_router_patch.py`

---

## Frontend-next structure

| Area | Path | Purpose | Status |
|------|------|---------|--------|
| ORB product | `app/orb/` | Canonical `/orb` shell | Production |
| ORB components | `components/orb-standalone/` | Chat, voice, dictate, templates | Production |
| ORB write | `components/orb-write/` | Document workspace | Production |
| ORB residential | `components/orb-residential/` | Auth gate, billing, mobile shell | Production |
| ORB lib | `lib/orb/` | API clients, voice, dictate, billing | Production |
| Founder OS | `app/founder/` | Founder dashboards | Partial (build issue on revenue) |
| Auth | `contexts/auth-context.tsx`, `lib/auth/` | Session, CSRF, proxy | Production |
| Middleware | `middleware.ts` | ORB public paths, CSP, session gate | Production |
| Backend proxy | `app/backend/[...path]/route.ts` | Cookie-safe API proxy | Production |
| E2E | `e2e/orb-*.spec.ts` (8 files) | Playwright ORB smoke | Present |
| Unit tests | ~202 `*.test.ts` ORB-heavy | Node test runner | 1001/1022 pass |

**Convergence pattern:** Single `/orb` shell with `?station=` deep links (`orb_dictate`, `orb_voice`, `orb_write`, `templates`, `saved`, `shift_builder`, `review`, `knowledge`).

---

## ORB routes (backend)

### Standalone ORB Residential (canonical product API)

| Prefix | Router file | Key endpoints | Status |
|--------|-------------|---------------|--------|
| `/orb/standalone` | `orb_standalone_routes.py` | `POST /conversation`, `/conversation/stream`, `/brain-route`, `/actions/run` | Production |
| `/orb/standalone` | `orb_billing_routes.py` | Signup, access, checkout, portal, webhook, trial, safety, analytics | Production (Stripe env-dependent) |
| `/orb/standalone` | `orb_template_routes.py` | Templates, review-this, micro-session | Production |
| `/orb/standalone/documents` | `orb_document_routes.py` | Upload, analyse, intelligence, briefing | Production |
| `/orb/standalone/outputs` | `orb_saved_output_routes.py` | Saved outputs CRUD + export | Production |
| `/orb/standalone/knowledge` | `orb_knowledge_routes.py` | Read/search (premium); admin mutations | Production |
| `/orb/standalone/agents` | `orb_agent_routes.py` | Agent run, deep-research | Production |
| `/orb/standalone/shift-builder` | `orb_shift_builder_routes.py` | Shift pack generation | Production |
| `/orb/standalone/evaluation` | `orb_evaluation_routes.py` | Answer/document quality evaluation | Production |
| `/orb/standalone/auth/oauth` | `orb_oauth_routes.py` | Google/Microsoft OAuth | Production (config-dependent) |
| `/orb/voice` | `orb_voice_residential_routes.py` | Session, WS, transcribe, speak, provider-status | Mostly production (WebRTC stub) |
| `/orb/dictate` | `orb_dictate_routes.py` | Full dictate→write pipeline | Production |
| `/templates` | `orb_templates_launch_routes.py` | Template library, generate, export pdf/docx | Production |
| `/orb/projects` | `orb_projects_routes.py` | Projects + chats | Production |
| `/orb/usage` | `orb_usage_routes.py` | Usage, spending cap, top-up | Production |
| `/orb` | `orb_launch_routes.py` | Setup, profile, subscription funnel | Production |
| `/orb/admin` | `orb_admin_routes.py` | Feedback, usage admin | Production |
| `/orb/admin/quality-lab` | `orb_quality_lab_routes.py` | Scenario runs | Production |
| `/orb/system` | `orb_system_routes.py` | Health | Production |

### OS-linked ORB (must not be called from standalone)

| Prefix | Router | Purpose | Status |
|--------|--------|---------|--------|
| `/assistant/orb` | `orb_operational_routes.py` | Permissioned OS conversation | Production |
| `/assistant/orb/outputs` | `orb_operational_output_routes.py` | Operational outputs | Production |

### Legacy / compatibility

| Prefix | Router | Status |
|--------|--------|--------|
| `/orb` | `orb_routes.py` | Legacy voice assistant — mounted, superseded |
| `/orb/residential` | `orb_residential_premium_routes.py` | Legacy premium aliases |
| Retired refs in loader | `orb_voice_routes`, `voice_routes`, etc. | **Files missing** — skipped at load |

---

## Founder routes (ORB-launch relevant only)

| Prefix | Router | Endpoints | Status |
|--------|--------|-----------|--------|
| `/founder-os` | `founder_bootstrap_routes.py` | `GET /bootstrap` | Production |
| `/founder-os/persistence` | `founder_persistence_routes.py` | CRUD entities, audit log | Production |
| `/founder-os/telemetry` | `founder_telemetry_routes.py` | `POST /event`, `GET /summary` | Production |
| `/founder` | `founder_ai_routes.py` | AI chat, leads, tasks | **NOT MOUNTED** |

Frontend Founder pages: `app/founder/orb`, `quality-lab`, `telemetry`, `revenue`, `evidence`, `intelligence`, `company`.

---

## Auth / session / MFA

| Component | Path | Status |
|-----------|------|--------|
| Login/logout/me | `routers/auth_routes.py` `/auth` | Production |
| MFA | `routers/mfa_routes.py` `/auth/mfa` | Production |
| Passkeys | `routers/passkey_routes.py` | Production |
| Session security | `routers/session_security_routes.py` | Production |
| Legal acceptance | `routers/legal_acceptance_routes.py` | Production |
| ORB auth gate | `components/orb-residential/orb-auth-gate.tsx` | Production |
| ORB safety acceptance | `db/orb_subscription_db.py` | Production |
| MFA enforcement | Admin/manager → `/mfa-setup` | Production (backend-driven) |

---

## Knowledge / routing (IndiCare Intelligence brain)

| Component | Path | Role |
|-----------|------|------|
| Intelligence core | `services/indicare_intelligence_core_service.py` | Central brain entry |
| Expert brain orchestrator | `services/orb_expert_brain_orchestrator_service.py` | ORB 9 expert packet |
| Brain route service | `services/orb_brain_route_service.py` | Surface routing |
| Convergence orchestrator | `services/orb_brain_convergence_orchestrator_service.py` | Multi-brain merge |
| Operating brain | `assistant/knowledge/orb_operating_brain.py` | Answer standards, safety rules |
| Expert scenarios | `assistant/knowledge/orb_expert_scenarios.py` | Gold stress-test bank |
| Recording framework | `assistant/knowledge/orb_recording_framework.json` | Output type definitions |
| Quality standards brain | `assistant/knowledge/orb_quality_standards_brain.json` | QS alignment |
| Regulatory modules | `reg44_reg45.py`, `quality_standards.py`, `working_together.py` | Statutory framing |
| Source registry | `assistant/knowledge/trusted_sources_registry.json` | Citation governance |
| Knowledge loader | `assistant/knowledge_loader.py` | Runtime load |

---

## Chat / streaming

| Surface | Endpoint | Client | Status |
|---------|----------|--------|--------|
| Standalone chat | `POST /orb/standalone/conversation` | `lib/orb/standalone-client.ts` | Production |
| SSE stream | `POST /orb/standalone/conversation/stream` | Same | Production |
| Brain route | `POST /orb/standalone/brain-route` | Internal | Production |
| Operational | `POST /assistant/orb/conversation` | `lib/orb/operational-client.ts` | Production (OS only) |

---

## Voice

| Component | Path | Status |
|-----------|------|--------|
| Residential voice API | `routers/orb_voice_residential_routes.py` | Production |
| Voice session service | `services/orb_voice_session_service.py` | Production |
| Realtime WS handler | `services/orb_voice_realtime_ws_handler.py` | Production |
| Voice UI | `components/orb-standalone/orb-voice-station.tsx` | Production |
| WebRTC offer/ICE | `/orb/voice/webrtc/*` | **Stub — not implemented** |

---

## Dictate

| Component | Path | Status |
|-----------|------|--------|
| Dictate API | `routers/orb_dictate_routes.py` | Production |
| Dictate service | `services/orb_dictate_service.py` | Production |
| Dictate UI | `components/orb-standalone/orb-dictate-station.tsx` | Production |
| Recording framework | `services/orb_recording_framework_service.py` | Production |

---

## Write / document / output generation

| Component | Path | Status |
|-----------|------|--------|
| Write panel | `components/orb-write/orb-write-standalone-panel.tsx` | Production |
| Template generation | `services/orb_template_generation_service.py` | Production |
| Saved outputs | `services/orb_saved_output_service.py` | Production |
| PDF export | `lib/orb/write/orb-write-export.ts` | Production |
| Shift builder | `components/orb-standalone/shift-builder/` | Production |

---

## Templates

| Component | Path | Status |
|-----------|------|--------|
| Template library JSON | `assistant/knowledge/template_library.json` | Partial (generic prompts) |
| Recording framework types | `orb_recording_framework.json` (20+ record types) | Production |
| Templates API | `/templates/*` | Production |
| Templates UI | `orb-templates-panel.tsx` | Production |

---

## Quality Lab

| Component | Path | Status |
|-----------|------|--------|
| Backend | `routers/orb_quality_lab_routes.py` | Production |
| Expert scenarios | `assistant/knowledge/orb_expert_scenarios.py` | Production |
| Regression bank | `assistant/knowledge/orb_regression_test_bank.py` | Production (10 scenarios) |
| Answer quality gate | `services/orb_answer_quality_gate_service.py` | Production |
| Founder UI | `app/founder/quality-lab/page.tsx` | Production |

---

## Telemetry

| Component | Path | Status |
|-----------|------|--------|
| ORB analytics | `POST /orb/standalone/analytics/event` | Production |
| ORB usage events | `db/orb_residential_db.py` `orb_usage_events` | Production |
| AI usage audit | `sql/211_ai_usage_audit.sql` | Production |
| Founder telemetry | `db/founder_telemetry_db.py` | Production (sanitised) |
| Billing meter | `services/orb_billing_meter_service.py` | Production |

---

## Billing / pricing

| Component | Path | Status |
|-----------|------|--------|
| ORB Stripe routes | `routers/orb_billing_routes.py` | Production (env-dependent) |
| Plan enforcement | `services/orb_plan_enforcement_service.py` | Production |
| Platform billing | `routers/billing_routes.py` `/billing` | OS subscriptions (separate) |
| Price | £9.99/month (`ORB_EXPECTED_PRICE_UNIT_AMOUNT = 999`) | Configured |

---

## Exports

| Type | Path | Status |
|------|------|--------|
| Write PDF/print | `lib/orb/write/orb-write-export.ts` | Production |
| Template PDF/DOCX | `/templates/export/pdf`, `/export/docx` | Production |
| Dictate export | `POST /orb/dictate/export` | Production |
| Saved output export | `POST /orb/standalone/outputs/{id}/export` | Production |
| Legacy exports router | `routers/exports_routes.py` | **Unmounted** |

---

## APIs (external)

| Integration | Config | Status |
|-------------|--------|--------|
| OpenAI / model router | `services/ai_model_router_service.py` | Production |
| Stripe | `STRIPE_*` env vars | Config-dependent |
| Google/Microsoft OAuth | `orb_oauth_routes.py` | Config-dependent |
| Voice providers | `services/orb_voice_provider_service.py` | Production (mock in dev) |

---

## Database tables (ORB + intelligence + founder)

### ORB commercial
- `orb_trials`, `orb_subscriptions`, `orb_safety_acceptances`
- `orb_stripe_events`, `orb_usage_events`, `orb_usage_preferences`, `orb_usage_credits`
- `orb_user_preferences`, `orb_oauth_accounts`, `orb_oauth_states`

### ORB product data
- `orb_projects`, `orb_project_chats`
- `orb_saved_outputs`, `orb_saved_projects`
- `orb_feedback`, `orb_improvement_candidates`, `orb_learning_ledger`

### ORB knowledge
- `orb_knowledge_sources`, `orb_knowledge_chunks`

### Intelligence / governance
- `intelligence_actions`, `intelligence_oversight_reviews`
- `indicare_ai_governance_events`, `ai_privacy_events`, `ai_usage_audit`

### Founder OS
- `founder_os_records`, `founder_os_audit_log`
- `founder_os_telemetry_events`
- `founder_ai_threads`, `founder_ai_messages` (DB exists; API unmounted)

---

## Persistence stores

| Store | Technology | Scope |
|-------|------------|-------|
| PostgreSQL | Primary | All persistent data |
| Session store | `services/orb_session_store.py` | Voice/realtime sessions (DB-backed) |
| In-memory / cache | Various services | Static knowledge, LRU frameworks |
| Browser | localStorage (minimal) | Theme, draft hints — not primary store |

---

## Tests

| Category | Count | Location | Notes |
|----------|-------|----------|-------|
| Backend total | 679 files | `tests/` | 3513 passed, 210 failed, 42 errors (audit run) |
| ORB backend | ~263 files | `tests/test_orb*.py` | Extensive |
| Voice | 14 files | `test_*voice*` | DB-dependent failures without PG |
| Dictate | 11 files | `test_*dictate*` | Strong coverage |
| Billing | 8+ files | `test_*billing*`, `test_orb_stripe*` | Good |
| Founder | 5 files | `test_founder*` | Present |
| Frontend ORB | 1022 tests | `npm run test:orb` | 1001 pass, 21 fail (UI contract) |
| E2E | 8 specs | `e2e/orb-*.spec.ts` | Present |
| Broken fixtures | `conftest.py` CSRFMiddleware | auth_flow, roles_and_permissions | Known debt |

---

## Status legend

| Label | Meaning |
|-------|---------|
| **Production** | Implemented, mounted, tested — launch-capable with config |
| **Mostly production** | Core works; known gaps (WebRTC, polish) |
| **Partial** | Code exists but incomplete, unmounted, or config-blocked |
| **Legacy** | Mounted for compatibility; superseded |
| **Deprecated** | Documented for retirement; do not extend |
| **Unused** | Files exist but no route/import chain |
| **Mock** | Dev-only fallback (e.g. `mock_voice` provider) |

---

## Key architectural risks (system level)

1. **Router sprawl** — ~221 router files; retired modules still listed in loader
2. **Dual ORB surfaces** — standalone vs operational boundary must stay enforced
3. **Manual DB migrations** — schema drift risk if migrations not applied
4. **Founder AI router unmounted** — backend capability without API exposure
5. **Frontend production build fails** — Founder revenue module import issue blocks `npm run build`
6. **Test fixture debt** — `conftest.py` CSRFMiddleware breaks ~42 auth tests
