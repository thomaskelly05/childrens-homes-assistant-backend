# Repository Discovery Report — Phase 1

**Repository:** `thomaskelly05/childrens-homes-assistant-backend`
**Branch of work:** `docs/indicare-constitution`
**Discovery commit:** `b7375166ccede0a3de3cc897f17465adde46767b`
**Date:** 2026-06-26

This report describes what the repository **contains and does today**, using the evidence
standard defined in the task. Every non-trivial claim carries a label:
VERIFIED / DERIVED / INFERRED / FUTURE VISION / UNVERIFIED / OUT OF SCOPE.

Read this alongside `coverage-manifest.md` (what was and was not examined) and
`evidence-index.md` (path/line index for the load-bearing claims).

---

## 1. Repository purpose

**VERIFIED** — The repository is the backend for a residential childcare platform.
`README.md` describes "Backend for a residential childcare platform covering:
authentication and MFA; young people records; incidents, risk, plans, chronology,
health, education, family contact; AI-assisted notes and chat; compliance, reports,
handovers, and rostering." (`README.md:1-15`)

**VERIFIED** — The product names in code and docs are **IndiCare OS / IndiCare
Intelligence** (the platform) and **ORB Residential** (the AI assistant product).
`core/app_factory.py:51` sets `FastAPI(title="IndiCare API", ...)`; `AGENTS.md`
opens "IndiCare OS is a monolithic Python FastAPI backend"; `CLAUDE.md` states
"IndiCare Intelligence is ethical intelligence for Ofsted-regulated children's homes.
ORB Residential is the first product."

**Constitutional alignment statement (mandatory wording, used verbatim):**
ORB supports reflection, recording and evidence gathering. Adults remain responsible
for judgement, safeguarding escalation and final records.

This is not just an aspiration in prose; it is encoded. `assistant/ai_boundaries.py`
defines 14 hard AI boundaries including "IndiCare supports professional judgement... It
does not replace professional judgement" and "IndiCare must not make safeguarding
decisions on behalf of staff, managers, providers, social workers, LADO, police, medical
professionals, or emergency services." (`assistant/ai_boundaries.py:3-17`) ADR-0006
formally records the decision that the assistant is an "operational copilot, not
operational authority." (`docs/architecture/adr-0006-assistant-as-operational-copilot-not-authority.md`)

---

## 2. Repository boundaries

This is the single most important discovery finding, and it **contradicts the naive
reading of the repository name.** The repo is named `childrens-homes-assistant-backend`,
but it is **not a single backend.** It is a monorepo containing multiple products and
multiple frontends.

**VERIFIED** — Contents at the top level include:
- A **FastAPI backend** (the actual "backend"): `core/`, `routers/` (229 py),
  `services/` (692 py), `auth/`, `assistant/` (74 py), `db/`, `schemas/`, `app.py`.
- A **legacy vanilla frontend**: `frontend/` (527 files, HTML/JS/CSS), served *by the
  backend itself* via static mounts in `core/app_factory.py:31-37`.
- A **canonical modern frontend**: `frontend-next/` (2,483 files, Next.js;
  `package.json` name `indicare-os-frontend-next`), deployed as its own Render service
  (`render.yaml`).
- A **second Next.js app**: `indicare-frontend-next/` (28 files; `package.json` name
  `indicare-frontend-next`). Its relationship to `frontend-next/` is **UNVERIFIED**.
- A **standalone ORB/voice HTML runtime**: `indicare-ai/` (19 files, including
  `realtime/openai-realtime-voice.js`).
- **LifeEcho**, a second named product: `life_echo/` (79 py) plus `apps/lifeecho-web/`
  (a separate Next.js/React surface). `life_echo/__init__.py` says: "LifeEcho is
  deliberately kept as a standalone package inside the repository so it can run natively
  inside IndiCare now and later be exposed as a plugin/API layer for other care,
  education, safeguarding and health systems."

**DERIVED** — The repository is therefore a **multi-product, multi-frontend monorepo**,
not "a backend." Sources: top-level `ls`; `render.yaml` (two deployable services);
`package.json` names; `life_echo/__init__.py`; `app.py` importing
`startup_life_echo_router_patch`.

**Constitutional consequence (INFERRED):** A constitution that says "the repository is
the children's homes assistant backend" would be factually wrong. The constitution must
either (a) scope itself to IndiCare OS / ORB Residential and explicitly mark LifeEcho and
the auxiliary frontends as adjacent, or (b) govern the whole monorepo. This is recorded
as an open question (see `open-questions.md`, Q1).

---

## 3. Technology stack

**VERIFIED** (`requirements.txt`, `runtime.txt`, `render.yaml`, `AGENTS.md`):
- **Language/runtime:** Python 3.11.9 (`runtime.txt`; `render.yaml` `PYTHON_VERSION 3.11.9`).
  `README.md` says "Python 3.9+", which is inconsistent with the pinned 3.11.9 — minor
  documentation drift.
- **Web framework:** FastAPI + Uvicorn.
- **Database:** PostgreSQL (`psycopg2-binary`, `sqlalchemy` present; `AGENTS.md` and
  `db/connection.py` referenced). SSL `sslmode="require"` is hardcoded per AGENTS.md.
- **AI provider:** OpenAI (`openai>=1.12.0`). Default model `gpt-4o-mini`
  (`render.yaml`, `.env.example`, `ai_gateway_service.py:23`).
- **Vector store:** `chromadb==0.4.22` (knowledge/embeddings).
- **Auth/crypto:** `PyJWT`, `python-jose[cryptography]`, `passlib[bcrypt]`, `bcrypt`,
  `pyotp` (TOTP MFA), `webauthn` + `qrcode` (passkeys).
- **Payments:** `stripe>=10.0.0`.
- **Comms:** `twilio`.
- **Web search:** `tavily-python`.
- **Caching/queues:** `redis`.
- **Observability:** `sentry-sdk`.
- **Rate limiting:** `slowapi` plus a custom `OrbRateLimitMiddleware`.
- **Docs/exports:** `python-docx`, `reportlab`, `pypdf`, `markdown`, `Pillow`.
- **Tests:** `pytest`, `pytest-asyncio`.
- **Frontend (canonical):** Next.js on Node 22 (`render.yaml`).

---

## 4. Architecture map

**DERIVED** — The backend is a **monolithic FastAPI application** assembled in
`core/app_factory.py`. The request path is:

```
HTTP request
  → Middleware stack (core/middleware.py, applied outer→inner):
      OrbRateLimitMiddleware
      CORSMiddleware
      AccessScopeMiddleware
      OrbResidentialGuardMiddleware
      OSReadCacheMiddleware
      AuditLoggingMiddleware
      SecurityHeadersMiddleware
      OrbBuildHeadersMiddleware
      SessionMiddleware
      CsrfProtectionMiddleware
  → Routers (core/router_loader.py: ~279 router references across 16 groups)
  → Auth dependency (auth/current_user.py: session cookie or Bearer JWT)
  → Policy/permission check (core/policy_engine.py, core/provider_context.py)
  → Service layer (services/*, assistant/*)
  → AI gateway (services/ai_gateway_service.py) → OpenAI
  → DB (db/connection.py, pooled)
```
Sources: `core/app_factory.py:51-57`; `core/middleware.py:73-101`;
`core/router_loader.py`; `auth/current_user.py`; `core/policy_engine.py`;
`services/ai_gateway_service.py`.

**Note on middleware ordering (INFERRED):** Starlette applies middleware in reverse of
add order, so the *last* added (`OrbRateLimitMiddleware`) runs outermost. The exact
runtime order was not executed; the list above is the add order, not verified runtime order.

**VERIFIED** — Four `startup_*.py` modules at the repo root are imported by `app.py`
(only `startup_life_echo_router_patch` is imported directly; the other three —
`startup_live_child_scope_patch`, `startup_live_chronology_fallback_patch`,
`startup_live_os_projection_patch` — are imported in `app.py:1-3`). These are
**runtime monkey-patches applied at import time** that mutate routing/behaviour. There
is also `startup_live_os_projection_patch.py` present on disk but **not** imported by
`app.py`. (`app.py:1-6`)

**INFERRED / RISK** — Import-time patches plus a startup `schema_doctor` that mutates the
live schema (see §11) are a meaningful operational-trust surface. Flagged in
`open-questions.md` (Q5) and the Review Board.

### AI orchestration sub-architecture (DERIVED)
- `assistant/` is the "intelligence brain": prompt assembly (`orchestrator.py`,
  `assistant_engine.py`, `prompts.py`, `prompt_router.py`), safety
  (`ai_boundaries.py`, `citation_enforcer.py`, `answer_quality.py`), mode detection,
  memory, chronology synthesis, inspection readiness, escalation monitoring.
- `services/ai_gateway_service.py` is the **governed egress point** to OpenAI: it runs
  privacy decisions (`ai_privacy_decision_service`), redaction (`ai_redaction_service`),
  provider data-intelligence settings, cost estimation, and usage recording before the
  call. (`services/ai_gateway_service.py:1-50`)
- `assistant/llm_provider.py` restricts providers: `APPROVED_LLM_PROVIDERS =
  frozenset({"openai"})` with a comment reserving future Azure/other adapters.
  (`assistant/llm_provider.py:22`)
- `services/ai_providers/` holds `base.py`, `openai_provider.py`, `mock_provider.py`
  (the mock backs the CI quality gate).

---

## 5. Folder map (top level, with role)

| Folder | Role | Evidence |
|---|---|---|
| `core/` | App assembly, middleware, policy engine, router loader | Read in full |
| `routers/` | 229 FastAPI routers; ~279 references in loader; 16 groups | `router_loader.py` |
| `services/` | 692 py; business logic + AI gateway/governance/intelligence | listing + heads |
| `assistant/` | 74 py; AI orchestration + safety boundaries | listing + heads |
| `auth/` | Identity, RBAC, MFA, passkeys, session, scoping | `rbac.py`, `current_user.py` |
| `middleware/` | 7 custom ASGI middlewares | `core/middleware.py` imports |
| `db/`, `backend/db/` | DB connection, table init, migration runner, schema doctor | `lifespan.py` |
| `db/migrations/`, `migrations/`, `sql/` | **Three** migration locations | listings |
| `schemas/` | 83 py; Pydantic + data-protection classifications | listing |
| `assistant/knowledge/`, `data/orb_knowledge_seed/`, `knowledge/` | Sector knowledge corpora | listings |
| `frontend/` | Legacy vanilla UI served by backend | static mounts |
| `frontend-next/` | Canonical Next.js UI (deployed) | `render.yaml` |
| `indicare-frontend-next/`, `indicare-ai/` | Additional UI surfaces | listings |
| `life_echo/`, `apps/lifeecho-web/` | LifeEcho product (in-repo) | `__init__.py` |
| `tests/` | 737 files | listing |
| `scripts/` | 34 py incl. ORB quality-gate runners | CI workflow |
| `docs/` | 463 md governance/architecture/audit docs | listing |
| `.github/workflows/` | One CI workflow (ORB quality gate) | read in full |
| `deploy/` | Load tests, observability dashboard, scaling notes | listing |
| Root `*.pdf` | `childrens_home_guide.pdf`, `childrens_homes_regulations_2015.pdf` (statutory source material) | listing |

---

## 6. Services and APIs

**VERIFIED** — Routers are registered through a structured loader, not ad-hoc includes.
`core/router_loader.py` defines `ROUTER_GROUPS` with 16 groups:
`core`, `assistant_orb`, `os_command`, `governance`, `workforce`, `documents`,
`reports`, `safeguarding`, `experience_bundles`, `chronology`,
`compliance_and_live_os`, plus registry aliases `auth`, `assistant`, `academy`,
`reporting`, `operational-backend`. (`core/router_loader.py`; group names extracted
programmatically.) Groups carry a `classification` (`canonical` / `mixed` /
`primary` / `legacy_compatibility`) and `required_routers`, i.e. the loader encodes
which surfaces are canonical vs legacy compatibility.

**VERIFIED** — The `assistant_orb` group alone references ~60 routers, heavily
ORB-prefixed (`orb_standalone_routes`, `orb_agent_routes`, `orb_knowledge_routes`,
`orb_voice_*`, `orb_billing_routes`, etc.). There are 34 `routers/orb_*.py` files, 13
`routers/assistant_*.py`, and 4 `routers/life_echo*.py`. (`ls routers/`)

**VERIFIED — known endpoints:** `/health`, `/health/ready`, `/` (liveness), `/favicon.ico`,
several legacy CSS/JS asset routes, and `/api/ai/governance/status`
(`ai_governance_router` mounted in `create_app`). (`core/app_factory.py`)

**VERIFIED — worked example of one router surface (`/assistant-api`).** To ground the
otherwise filename-only inventory, one router was read in depth.
`routers/assistant_routes.py` exposes `APIRouter(prefix="/assistant-api",
tags=["Operational Assistant"])` with four scope types (`global`, `young_person`, `home`,
`quality`) and four assistant types in the handlers (`public`, `young_people_os`,
`home_os`, `quality_os`). Every endpoint depends on `require_assistant_access`
(`auth/permissions.py`); cross-home access is gated by `is_provider_level_role`; message
length is capped (3000 chars public, 20000 OS); responses stream via `generate_ai_stream`;
and `/reports/preview` + `/reports/send-now` exist. Notably there is **route-layer
prompt-injection defence** (`contains_prompt_injection_attempt` from
`services/assistant_security.py`). (`routers/assistant_routes.py:1-31, 210-1091`)

**Honesty note (UNVERIFIED):** A full, authoritative API surface map was **not**
produced. With 229 routers and only the loader plus this one router read, the remaining
endpoint paths/verbs are inferred from filenames. A complete OpenAPI export would require
running the app, which was not possible (no deps installed).

---

## 7. Authentication

**VERIFIED** — Authentication is **JWT session-token based**, accepted either as a
session cookie or as an HTTP Bearer credential. `auth/current_user.py` uses
`HTTPBearer`, reads a session cookie (`SESSION_COOKIE_NAME`), and decodes via
`auth/tokens.decode_session_token`; `get_current_user` decodes the payload and extracts a
user id. (`auth/current_user.py:5,12,58,87-89,181-275`)

**VERIFIED** — **MFA and passkeys** exist as first-class features: `routers.mfa_routes`,
`routers.passkey_routes`, `db/mfa_db.py`, `db/passkeys_db.py`, init functions called at
startup (`core/lifespan.py`). `requirements.txt` includes `pyotp`, `webauthn`,
`qrcode[pil]`. AGENTS.md states "MFA enforced for admin/manager roles" with redirect to
`/mfa-setup`.

**VERIFIED** — `SessionMiddleware` requires `SESSION_SECRET_KEY`/`SECRET_KEY`/
`SESSION_SECRET` in production and refuses to start without it; in dev it falls back to a
fixed dev secret. (`core/middleware.py:57-65`)

**VERIFIED** — `create_first_admin.py` bootstraps an initial admin from `FIRST_ADMIN_*`
env vars; default `admin@indicare.co.uk` / `ChangeMe123456` (`.env.example`, AGENTS.md).
This default credential is a **security note** (Review Board, DPO/Architect).

---

## 8. Authorisation

**VERIFIED** — Two layered systems:

1. **RBAC** (`auth/rbac.py`): five canonical roles (`StaffRole`: admin, manager,
   deputy_manager, support_worker, viewer), an alias map normalising real-world titles
   (e.g. `responsible_individual`, `registered_manager`, `rsw` → canonical roles), and
   `PERMISSIONS_BY_ROLE` granting fine-grained scopes (`safeguarding:review`,
   `chronology:write`, `governance:review`, `inspection:review`, `orb:access`, etc.).
2. **Provider/tenancy context + policy engine** (`core/provider_context.py`,
   `core/policy_engine.py`): resolves a `ProviderContext` with a `tenancy_scope` of
   `none | home | provider | platform`, home-id scoping (`can_access_home`),
   provider-id scoping (`can_access_provider`), and a `PolicyEngine.evaluate` that
   returns a structured `PolicyDecision` with explicit reasons
   (`permission_not_registered`, `permission_not_granted`, `home_scope_denied`,
   `provider_scope_denied`).

**VERIFIED** — Multi-tenancy is taken seriously: `_is_platform_role` elevates only
`super_admin/superadmin/founder/owner` (and provider-less `admin`) to `platform` scope;
all others are bounded to their home(s) or provider. (`core/provider_context.py:33-36,
117-135`) SQL-level row-level security appears to exist
(`sql/008_os_command_permissions_rls.sql`), though its contents were not read.

**INFERRED** — Authorisation is enforced at the application layer (policy engine +
middleware `AccessScopeMiddleware`/`OrbResidentialGuardMiddleware`) and apparently at the
DB layer (RLS). Whether every router actually invokes the policy engine was **not**
verified across all 229 routers.

---

## 9. Prompt locations

**VERIFIED** — Prompts/prompt policy live in identifiable, centralised places rather than
scattered string literals:
- `assistant/prompts.py`, `assistant/prompt_router.py`
- `services/ai_prompts.py`, `services/document_prompt_service.py`,
  `services/assistant_prompt_policy.py`, `services/orb_prompt_registry.py`
- `assistant/ai_boundaries.py` (the safety block appended to system prompts)
- `assistant/evals/orb_benchmark_prompt_helpers.py` (eval prompts)
(`find ... -iname '*prompt*'`)

**VERIFIED** — The AI safety boundary block is composed and appended programmatically:
`append_ai_boundaries(system_prompt)` wraps prompts with a titled "AI SAFETY BOUNDARIES"
section and a statement that the boundaries "override style preferences where necessary
for safety, accuracy, and accountability." (`assistant/ai_boundaries.py:18-60`)

---

## 10. AI orchestration, knowledge, memory, routing

- **Orchestration (VERIFIED):** `assistant/orchestrator.py` builds an
  `OrchestratorResult` combining a response plan, model plan, guidance plan, regulation
  mapping, and runtime context. (`assistant/orchestrator.py:1-55`)
- **Provider governance (VERIFIED):** all OpenAI calls are intended to flow through
  `services/ai_gateway_service.py`, which enforces privacy decisions, redaction, cost
  soft-limits (`AI_DAILY_SOFT_LIMIT_GBP` default £5.00; per-feature token soft limit),
  and usage recording. Provider list is locked to OpenAI
  (`assistant/llm_provider.py:22`). Cost tables are explicitly labelled estimates with
  "provider invoices remain the source of truth." (`services/ai_gateway_service.py:27-33`)
- **Standalone assistant identity & grounding (VERIFIED):** `assistant/prompts.py`
  constructs the standalone assistant's identity from explicit, sector-grounded constants:
  the nine Ofsted **Quality Standards** (`QUALITY_STANDARDS`), an `OFFICIAL_GUIDANCE_LINKS`
  map to primary sources (Children's Homes (England) Regulations 2015 on
  legislation.gov.uk, the Guide to the Regulations, the Ofsted SCCIF), a `COMMON_TASKS`
  list (daily logs, handovers, body-map wording, chronologies, Reg 45 prep…), and
  `CARE_VALUES` (child-centred, trauma-informed, autism-aware, non-punitive, defensible,
  "warm but boundiered"). It pulls internal practice knowledge via
  `assistant.knowledge_loader` (templates, reflective questions, micro-interventions,
  shift flows, guidance sources). (`assistant/prompts.py:1-90`) This is consistent with
  the mandatory stance: ORB supports reflection, recording and evidence gathering; adults
  remain responsible for judgement, safeguarding escalation and final records.
- **Knowledge (VERIFIED):** sector knowledge exists as code modules
  (`assistant/knowledge/*.py`: contextual safeguarding, medication/restraint, leadership,
  inspection readiness, plus `guidance_sources.json`,
  `indicare_registered_home_domain_map.json`) and as seed corpora
  (`data/orb_knowledge_seed/*.md`: safeguarding principles, SCCIF overview, quality
  standards, therapeutic practice, recording quality, standalone ORB boundary). Two
  statutory PDFs sit at repo root.
- **Memory (VERIFIED, by name):** `assistant/memory.py`, `routers.assistant_memory_routes`,
  `routers.ai_memory_routes`, and "operational memory" referenced throughout docs and
  ADR-0004. Behaviour not read in depth.
- **Routing of AI requests (VERIFIED):** `assistant/prompt_router.py`,
  `assistant/mode_detector.py`, `assistant/modes.py`, and a `model_plan` indicate
  intent/mode-based routing and model selection. Detail not fully read.
- **Standalone vs embedded boundary (VERIFIED):** `docs/ai-safety.md` defines a strict
  separation — the standalone assistant must **not** access live OS records, child files,
  chronology, or evidence, and may only use user-entered text, static knowledge, and
  uploaded material; the embedded OS assistant may use scoped operational context. There
  is a dedicated middleware `OrbResidentialGuardMiddleware` and tests like
  `test_orb_agent_full_brain_boundary.py` and `test_orb_adversarial_safety_firewall.py`.

---

## 11. Testing

**VERIFIED** — 737 files under `tests/`. Naming shows heavy safety/governance emphasis:
`test_orb_adversarial_safety_firewall.py`, `test_orb_agent_full_brain_boundary.py`,
`test_cross_home_safeguarding_trends.py`, `test_ai_privacy_*`, `test_*_ai_governance*`,
`test_governance_*`, `test_inspection_readiness_transaction_safety.py`, plus the ORB
scenario quality-gate tests. (`ls tests/`)

**VERIFIED** — A **CI quality gate** runs ORB scenario sets (smoke, missing-from-care,
critical-50) against a **mock provider** on PRs, nightly, and on demand, with optional
live-provider runs gated on a secret. (`.github/workflows/orb-scenario-quality-gate.yml`)

**VERIFIED / RISK** — Test infrastructure has known fragility. AGENTS.md documents that
five `tests/test_*.py` files are not pytest tests (they need a running server +
hardcoded tokens) and that `conftest.py` historically referenced a `CSRFMiddleware` that
"no longer exists at that path." The current `conftest.py` imports
`CsrfProtectionMiddleware` from `middleware.security_middleware` (which does exist —
`security_middleware.py:159`), so this specific AGENTS.md note appears **stale**.

**Honesty note (VERIFIED):** **No test was executed during discovery** — Python deps are
not installed (`import fastapi` fails). Test health is asserted only from source and from
AGENTS.md, not observed.

---

## 12. Deployment, CI/CD, infrastructure

**VERIFIED** (`render.yaml`):
- Hosted on **Render**, region Frankfurt, two `web` services on the `starter` plan:
  - `indicare-frontend-next` (Node 22, rootDir `frontend-next`, `npm run build:render`).
  - `childrens-homes-assistant-backend-new` (Python, `uvicorn app:app`, health
    `/health`).
- **Both deploy from `branch: main` with `autoDeploy: true`.** Pushing to `main` ships
  to production automatically.
- Production env: `ENV=production`, `OPENAI_MODEL=gpt-4o-mini`,
  `AI_PROVIDER_STRICT=true`, `AI_DEFAULT_PROVIDER=openai`, `ENABLE_DEBUG_ROUTES=false`.
  Secrets `DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY` are `sync: false` (set in
  Render dashboard, not in repo).
- Passkey relying-party `app.indicare.co.uk`; CORS/allowed origins pinned to
  `app.indicare.co.uk`, `api.indicare.co.uk`, `indicare-frontend-next.onrender.com`.

**VERIFIED — startup behaviour mutates production schema.** `core/lifespan.py` runs, on
app startup: `run_schema_doctor(conn)` (repairs/ensures tables and columns), then
`run_pending(conn)` migrations, then initialises legal-acceptance, MFA, passkeys, and
partner-assistant tables. If `DB_REQUIRED_ON_STARTUP` is false, failures degrade rather
than crash. (`core/lifespan.py:37-110`)

**INFERRED / RISK** — Combination of (a) auto-deploy from `main`, (b) a single CI
workflow that only gates ORB quality scenarios (not the full test suite, not type/lint),
and (c) a startup process that auto-repairs and migrates the live schema, means there is
**no enforced full-test or migration-review gate between a merge to `main` and a
production schema change.** This is a governance finding, not a code defect. (Review
Board: Architect, Investor, DPO.)

---

## 13. Existing documentation

**VERIFIED** — Documentation is unusually extensive for a codebase this stage: 463
Markdown files. Notable governance-grade material already exists:
- **Engineering governance:** `CLAUDE.md`, `AGENTS.md`, `ORB_ENGINEERING_PRINCIPLES.md`.
- **Architecture Decision Records:** `docs/architecture/adr-0001` … `adr-0006`
  (chronology-as-truth-plane; therapeutic recording & language governance; provider
  context & trust boundaries; operational memory & replayability; document-OS as evidence
  infra; assistant-as-copilot-not-authority).
- **Trust pack:** `docs/trust/` (AI & data use, data deletion/export, human review &
  safeguarding, incident response, privacy & retention, provider security FAQ, security
  overview, subprocessors).
- **Security:** `docs/security/` (access-control model, AI privacy / no-training,
  data-protection overview).
- **AI safety:** `docs/ai-safety.md`, `docs/ai-privacy-permission-matrix.md`.
- **Platform maturity:** `docs/platform-maturity/` (48 files: RBAC governance, audit
  architecture/replay, DTO versioning, durability/recovery, evidence graph, etc.).

**INFERRED** — Much of the constitutional substance a Phase 2 would want
(safeguarding posture, AI boundaries, human-in-the-loop, data protection, no-training)
**already exists in distributed form.** The gap is not absence of governance content; it
is the absence of a single ratified, hierarchy-ordered constitutional layer that points
to these documents and resolves conflicts between them.

---

## 14. Documentation gaps

**VERIFIED — Broken references in the canonical agent instructions.** `CLAUDE.md` states:
"Then read `ORB_ENGINEERING_PRINCIPLES.md`, `SAFETY.md`, `ARCHITECTURE.md`, and
`CONTRIBUTING.md` where relevant." Of these, **`SAFETY.md`, `ARCHITECTURE.md`, and
`CONTRIBUTING.md` do not exist at the repository root** (verified by file check;
only `ORB_ENGINEERING_PRINCIPLES.md` exists). The primary instruction file points agents
at three missing documents.

**INFERRED** — Other gaps:
- No single index/canon that orders the 463 docs by authority. A reader cannot tell which
  doc wins when two disagree.
- `README.md` is thin and partly inconsistent (claims "Python 3.9+" vs pinned 3.11.9; cut
  off mid-setup) relative to the system's actual scale.
- No documented map of the four frontends / LifeEcho boundaries (see §2).
- No documented inventory reconciling the three migration directories.

---

## 15. Architecture gaps and risks

| # | Finding | Label | Evidence |
|---|---|---|---|
| A1 | Auto-deploy from `main` + startup schema-doctor/migrations + single narrow CI gate = no enforced full-test/migration review before prod schema change | INFERRED (risk) | `render.yaml`; `core/lifespan.py`; `.github/workflows/` |
| A2 | Import-time monkey-patches (`startup_*_patch.py`) mutate routing/behaviour at process start; one patch file on disk is not imported | VERIFIED (file state) / INFERRED (risk) | `app.py:1-6`; `ls startup_*.py` |
| A3 | Dead/duplicate router at repo root: `routersyoung_people_statutory_documents_routes.py` (275 lines, **not referenced anywhere**) duplicates the loaded `routers/young_people_statutory_documents_routes.py` (505 lines) | VERIFIED | `grep` shows root file unreferenced; loader references the `routers/` one (`router_loader.py:307`) |
| A4 | Three separate migration locations (`db/migrations/`, `migrations/`, `sql/`) with manual application per AGENTS.md; no single ordered ledger | VERIFIED (existence) / INFERRED (risk) | listings; AGENTS.md |
| A5 | First-admin default password `ChangeMe123456` shipped in `.env.example`/docs | VERIFIED | `.env.example`; AGENTS.md |
| A6 | Whether every one of 229 routers enforces the policy engine is unverified | UNVERIFIED | only loader read |
| A7 | Repo name implies single backend; reality is multi-product monorepo (LifeEcho, multiple frontends) | DERIVED | §2 |
| A8 | Test suite cannot be assumed green: not run here; AGENTS.md documents fixture/test fragility | VERIFIED (not run) | `import fastapi` fails; AGENTS.md |

None of these contradict the **product safety direction**, which is strong and encoded.
They are governance/operational-maturity risks a constitution should name.

---

## 16. Confidence summary

| Area | Confidence | Why |
|---|---|---|
| Product purpose & safety intent | High | Encoded in `ai_boundaries.py`, ADR-0006, `ORB_ENGINEERING_PRINCIPLES.md`, `docs/ai-safety.md` |
| App assembly & middleware | High | `core/` read in full |
| Auth & RBAC mechanism | High | `rbac.py` full, `current_user.py` read |
| Tenancy/policy model | High | `provider_context.py`, `policy_engine.py` read in full |
| AI orchestration shape | Medium-High | Heads of orchestrator/gateway/llm_provider read; internals sampled |
| Deployment/CI/startup | High | `render.yaml`, `lifespan.py`, workflow read in full |
| Full API surface | Low | 229 routers; only loader read; app not run |
| `services/` (692 files) behaviour | Low-Medium | Heads only |
| Frontends & LifeEcho internals | Low | Listings only |
| Test suite health | Low (not executed) | No deps; not run |

**Overall:** the discovery is **high-confidence on the spine** (assembly, auth,
authz, AI governance posture, deployment) and **explicitly low-confidence on breadth**
(individual routers, the 692-file services layer, frontends, LifeEcho internals, live
test/runtime behaviour). Phase 2 should not treat any low-confidence area as settled.

---

## 17. Evidence index

See `evidence-index.md` for the path/line index supporting the load-bearing claims above.
