# Evidence Index — Phase 1 Discovery

Path/line index for the load-bearing claims in `repository-discovery.md`. Line numbers are
from the discovery commit `b7375166ccede0a3de3cc897f17465adde46767b`; where a head-only read
was done, line ranges are approximate to the region read. "Verified by command" means the
claim came from a shell query rather than a single file location.

| # | Claim | Label | Evidence (path:line) |
|---|---|---|---|
| E1 | Repo is the backend for a residential childcare platform | VERIFIED | `README.md:1-15` |
| E2 | App title is "IndiCare API" | VERIFIED | `core/app_factory.py:51` |
| E3 | IndiCare OS is a monolithic FastAPI backend that also serves a legacy frontend | VERIFIED | `AGENTS.md` (Architecture Overview) |
| E4 | 14 hard AI boundaries incl. "does not replace professional judgement" and "must not make safeguarding decisions" | VERIFIED | `assistant/ai_boundaries.py:3-17` |
| E5 | AI safety boundary block is appended to system prompts and overrides style | VERIFIED | `assistant/ai_boundaries.py:18-60` |
| E6 | Assistant is formally "operational copilot, not operational authority" | VERIFIED | `docs/architecture/adr-0006-assistant-as-operational-copilot-not-authority.md` |
| E7 | Multi-product monorepo: two deployable services (frontend-next + backend) | VERIFIED | `render.yaml` (two `web` services) |
| E8 | Canonical modern frontend `frontend-next` package name `indicare-os-frontend-next` | VERIFIED | `frontend-next/package.json` (name field) |
| E9 | Second Next.js app `indicare-frontend-next` exists | VERIFIED | `indicare-frontend-next/package.json` (name field) |
| E10 | LifeEcho is a deliberately standalone in-repo package | VERIFIED | `life_echo/__init__.py:1-12` |
| E11 | LifeEcho is wired into the app via a startup router patch | VERIFIED | `app.py:3`; `startup_life_echo_router_patch.py:13-46` |
| E12 | Legacy `frontend/` is served by the backend via static mounts | VERIFIED | `core/app_factory.py:31-37` |
| E13 | Python 3.11.9 pinned; README says 3.9+ (drift) | VERIFIED | `runtime.txt`; `render.yaml` (PYTHON_VERSION); `README.md` |
| E14 | OpenAI is the AI provider; default model gpt-4o-mini | VERIFIED | `requirements.txt`; `render.yaml`; `services/ai_gateway_service.py:23` |
| E15 | Provider list locked to OpenAI | VERIFIED | `assistant/llm_provider.py:22` |
| E16 | AI gateway enforces privacy decision, redaction, cost soft-limits, usage recording | VERIFIED | `services/ai_gateway_service.py:1-50` |
| E17 | Cost tables are estimates; "provider invoices remain the source of truth" | VERIFIED | `services/ai_gateway_service.py:27-33` |
| E18 | Middleware stack (CSRF, Session, SecurityHeaders, Audit, OSReadCache, OrbResidentialGuard, AccessScope, CORS, OrbRateLimit, OrbBuildHeaders) | VERIFIED | `core/middleware.py:73-101` |
| E19 | Session secret required in production, refuses to start without it | VERIFIED | `core/middleware.py:57-65` |
| E20 | Router loader defines 16 groups with classifications and required routers | VERIFIED | `core/router_loader.py` (groups extracted programmatically) |
| E21 | ~279 router references; assistant_orb group ~60 routers | VERIFIED | `core/router_loader.py` (regex count) |
| E22 | 34 `routers/orb_*.py`, 13 `routers/assistant_*.py`, 4 `routers/life_echo*.py` | VERIFIED | `ls routers/` (counts) |
| E23 | Health endpoints `/health`, `/health/ready`, `/`, governance status mounted | VERIFIED | `core/app_factory.py:51-... ` (health/root handlers; `ai_governance_router`) |
| E24 | Auth is JWT session token via cookie or Bearer | VERIFIED | `auth/current_user.py:5,12,58,87-89,181-275` |
| E25 | MFA + passkeys exist and are initialised at startup | VERIFIED | `core/lifespan.py` (init_mfa_tables, init_passkeys_table); `requirements.txt` (pyotp, webauthn, qrcode) |
| E26 | Five canonical roles + alias map + per-role permissions | VERIFIED | `auth/rbac.py` (StaffRole, ROLE_ALIASES, PERMISSIONS_BY_ROLE) |
| E27 | Tenancy scopes none/home/provider/platform; platform limited to super_admin/founder/owner/provider-less admin | VERIFIED | `core/provider_context.py:33-36,117-135` |
| E28 | PolicyEngine returns structured decisions with explicit deny reasons | VERIFIED | `core/policy_engine.py` (PolicyDecision, evaluate) |
| E29 | Enterprise permission overlay per role | VERIFIED | `core/policy_engine.py` (ENTERPRISE_PERMISSIONS_BY_ROLE) |
| E30 | Prompts centralised across assistant/ and services/ | VERIFIED | `assistant/prompts.py`, `assistant/prompt_router.py`, `services/ai_prompts.py`, `services/orb_prompt_registry.py`, `services/assistant_prompt_policy.py` |
| E31 | Sector knowledge as code modules + seed corpora + statutory PDFs | VERIFIED | `assistant/knowledge/*`; `data/orb_knowledge_seed/*.md`; root `childrens_homes_regulations_2015.pdf`, `childrens_home_guide.pdf` |
| E32 | Standalone assistant must not access live OS records; embedded may use scoped context | VERIFIED | `docs/ai-safety.md` (Assistant surfaces) |
| E33 | 737 test files with heavy safety/governance naming | VERIFIED | `ls tests/` (count + names) |
| E34 | CI gate runs ORB scenarios (smoke/missing-from-care/critical-50) on mock provider; live gated by secret | VERIFIED | `.github/workflows/orb-scenario-quality-gate.yml` |
| E35 | Both Render services auto-deploy from `main` | VERIFIED | `render.yaml` (branch: main, autoDeploy: true ×2) |
| E36 | Startup runs schema_doctor + pending migrations + auth table inits | VERIFIED | `core/lifespan.py:37-110` |
| E37 | `CLAUDE.md` references SAFETY.md, ARCHITECTURE.md, CONTRIBUTING.md — all three MISSING | VERIFIED | `CLAUDE.md`; file existence check (only `ORB_ENGINEERING_PRINCIPLES.md` present) |
| E38 | ADRs 0001–0006 exist | VERIFIED | `ls docs/architecture/` |
| E39 | Trust pack + security docs exist | VERIFIED | `ls docs/trust/`, `ls docs/security/` |
| E40 | 463 markdown docs total; 296 at docs/ root | VERIFIED | `find docs -name '*.md' | wc -l`; `ls docs/*.md | wc -l` |
| E41 | Root `routersyoung_people_statutory_documents_routes.py` (275 lines) is unreferenced; the loaded version is `routers/young_people_statutory_documents_routes.py` (505 lines) | VERIFIED | `grep` (root file unreferenced); `core/router_loader.py:307`; `wc -l` both files |
| E42 | Three migration locations exist | VERIFIED | `ls db/migrations/`, `ls migrations/`, `ls sql/` |
| E43 | Default first-admin password `ChangeMe123456` in example/docs | VERIFIED | `.env.example`; AGENTS.md |
| E44 | First-admin bootstrap script exists | VERIFIED | `create_first_admin.py`; `.env.example` (FIRST_ADMIN_*) |
| E45 | Four `startup_*.py` patch files; only `startup_life_echo_router_patch` imported in app.py (plus child_scope and chronology_fallback); `startup_live_os_projection_patch.py` present but not imported by app.py | VERIFIED | `app.py:1-3`; `ls startup_*.py` |
| E46 | ~2,124 py files; ~407k py LOC | VERIFIED | `find . -name '*.py' | wc -l`; `cat ... | wc -l` |
| E47 | No prior `constitution/` dir or constitution docs existed | VERIFIED | `grep -rli constitution` (none); `ls constitution` (absent before this work) |
| E48 | conftest.py imports `CsrfProtectionMiddleware` (exists at security_middleware.py:159); AGENTS.md's note about missing `CSRFMiddleware` is stale | VERIFIED | `tests/conftest.py`; `middleware/security_middleware.py:159`; AGENTS.md |
| E49 | Python deps not installed in discovery env (no code/tests run) | VERIFIED | `python3 -c "import fastapi"` → ModuleNotFoundError |
| E50 | RLS SQL present (contents unread) | VERIFIED (existence) | `sql/008_os_command_permissions_rls.sql` |
| E51 | `/assistant-api` router: 4 scopes, 4 assistant types (public/young_people_os/home_os/quality_os), all behind `require_assistant_access` | VERIFIED | `routers/assistant_routes.py:31,210,805,879,952` |
| E52 | Route-layer prompt-injection defence | VERIFIED | `routers/assistant_routes.py:18` (`contains_prompt_injection_attempt` from `services/assistant_security.py`) |
| E53 | Message length caps (3000 public / 20000 OS) and streaming responses | VERIFIED | `routers/assistant_routes.py:33-34` |
| E54 | Standalone assistant grounded in 9 Ofsted Quality Standards + primary-source guidance links + care values | VERIFIED | `assistant/prompts.py:14-90` |
| E55 | Standalone assistant loads internal practice knowledge via knowledge_loader | VERIFIED | `assistant/prompts.py:3-11` |

## Claims explicitly NOT backed by line-level evidence (carried as lower confidence)
- Full API endpoint surface (paths/verbs) — INFERRED from router filenames only (§6, A6).
- Behaviour of the 692 `services/` files beyond gateway/governance heads — Low confidence.
- Internal behaviour of `frontend/`, `frontend-next/`, `indicare-frontend-next/`,
  `indicare-ai/`, `apps/lifeecho-web/`, and `life_echo/` modules — listings only.
- Whether every router enforces the policy engine — UNVERIFIED.
- Live runtime/test/migration behaviour — not executed (E49).
