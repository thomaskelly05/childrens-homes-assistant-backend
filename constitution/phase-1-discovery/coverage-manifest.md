# Coverage Manifest — Phase 1 Discovery

This manifest records exactly how much of the repository was examined during Phase 1.
It exists so that no claim in the Discovery Report can be read as broader than the
evidence behind it. Where a directory was not opened, that is stated plainly.

Scale context (VERIFIED):
- ~2,124 Python files outside `.git` and ~407,000 lines of Python (`find . -name '*.py' | wc -l`; `cat` + `wc -l`).
- 463 Markdown files under `docs/` (`find docs -name '*.md' | wc -l`), 296 at `docs/` root.
- 737 files under `tests/`.
- A single repository holds at least four distinct frontends and two named products
  (IndiCare OS / ORB Residential, and LifeEcho). See Discovery Report, "Repository boundaries".

A repository of this size cannot be read in full in one discovery pass. Phase 1
prioritised the **application assembly, AI orchestration, authentication/authorisation,
safety boundaries, deployment, and existing governance documentation** — the areas a
constitution must rest on. Feature breadth (individual record types, individual ORB
stations) was sampled, not exhausted.

Labels: **Read in full** = every file in the directory opened. **Read selectively** =
representative or load-bearing files opened, not all. **Not examined** = directory not
opened beyond its name/file listing.

| Directory | Coverage | Reason |
|---|---|---|
| `core/` | Read in full | Application assembly. `app_factory.py`, `middleware.py`, `lifespan.py`, `policy_engine.py`, `provider_context.py`, `router_loader.py` (head) all read. Highest-value evidence for architecture. |
| `auth/` | Read selectively | `rbac.py` read in full; `current_user.py` read for the authentication mechanism; remaining 20 files listed but not all opened. |
| `assistant/` | Read selectively | 74 Python files. `ai_boundaries.py`, `llm_provider.py` (head), `orchestrator.py` (head), `prompts.py` (head — standalone identity/grounding) read; the package's role as the AI brain confirmed. Per-feature modules (chronology, inspection, escalation) listed, not all read. |
| `services/` | Read selectively | 692 Python files — the largest code area. `ai_gateway_service.py` and `ai_external_call_governance.py` (heads) read; `ai_providers/`, `ai_runtime/`, `intelligence/` subdirectories listed. The vast majority of the 692 files were **not** opened. |
| `routers/` | Read selectively | 229 Python files. Inventory taken via `router_loader.py` (router groups + names). One router body read in depth as a worked example: `assistant_routes.py` (`/assistant-api`). The remaining router bodies inferred from names. |
| `middleware/` | Read selectively | All 7 filenames seen via `core/middleware.py` imports; `security_middleware.py` class names confirmed. Bodies not fully read. |
| `db/` | Read selectively | Filenames listed; `connection.py` behaviour inferred from `lifespan.py` and AGENTS.md. Table-init modules confirmed by name. |
| `db/migrations/`, `migrations/`, `sql/` | Read selectively | Three separate migration locations confirmed by listing. Individual migration contents not read. AGENTS.md states some schema is applied manually. |
| `backend/` | Read selectively | 47 Python files; `backend/db/migration_runner.py` and `schema_doctor.py` confirmed as startup dependencies via `lifespan.py`. Bodies not read. |
| `schemas/` | Read selectively | 83 files; `schemas/data_protection.py` (`DataClassification`) confirmed by import. Others listed only. |
| `docs/` | Read selectively | 463 Markdown files. Directory map taken; `ORB_ENGINEERING_PRINCIPLES.md`, `CLAUDE.md`, `AGENTS.md`, `docs/ai-safety.md` (head), ADR-0006 (head), and the `docs/architecture`, `docs/trust`, `docs/security`, `docs/product`, `docs/platform-maturity` listings read. The substantial majority of the 296 root docs were **not** opened. |
| `life_echo/` | Read selectively | 79 Python files. `__init__.py` read (declares LifeEcho a standalone in-repo package); `startup_life_echo_router_patch.py` confirms wiring. Internal modules listed only. |
| `apps/lifeecho-web/` | Not examined | Listing only. Separate Next.js/React surface for LifeEcho. Out of scope for backend constitution beyond noting its existence. |
| `frontend/` | Not examined | 527 files, legacy vanilla HTML/JS/CSS. Confirmed served by backend via `app_factory.py` static mounts. Contents not read. |
| `frontend-next/` | Not examined | 2,483 files. Confirmed as the canonical modern frontend via `render.yaml` and `package.json` name. Contents not read. |
| `indicare-frontend-next/` | Not examined | 28 files; second Next.js app (`package.json` name `indicare-frontend-next`). Relationship to `frontend-next/` UNVERIFIED. |
| `indicare-ai/` | Not examined | 19 files of standalone HTML/JS/CSS ORB + realtime voice runtime. Listing only. |
| `tests/` | Read selectively | 737 files. Names sampled for safeguarding/governance/quality coverage; `conftest.py` head read. No test was executed (see below). |
| `scripts/` | Read selectively | 34 Python scripts; ORB quality-gate scripts confirmed via CI workflow. Bodies not read. |
| `repositories/` | Not examined | 14 files. Listing only. |
| `models/`, `homes/`, `staff/`, `providers/`, `repair/`, `quality/`, `templates/`, `data/`, `knowledge/`, `reports/`, `utils/`, `security/`, `api/`, `routes/`, `deploy/` | Not examined (listing only) | Small or peripheral directories. `quality/` and `data/orb_knowledge_seed/` and `assistant/knowledge/` were listed because they bear on AI knowledge sourcing. |
| `.github/` | Read in full | Single workflow `orb-scenario-quality-gate.yml` read in full. |
| Root config | Read in full | `README.md`, `requirements.txt`, `app.py`, `runtime.txt`, `run.sh`, `render.yaml`, `.env.example`, `CLAUDE.md`, `AGENTS.md`, `ORB_ENGINEERING_PRINCIPLES.md`, all four `startup_*.py` patch filenames, and the stray root router file read. |

## Verification actions NOT performed (honesty record)

- **No code was executed.** Python dependencies are not installed in this environment
  (`python3 -c "import fastapi"` → `ModuleNotFoundError`). Therefore **no test was run,
  no linter was run, and the application was not started.** Every behavioural claim is
  static (read from source), not observed at runtime.
- **No database was available**, so migration/startup behaviour is described from
  `core/lifespan.py` source, not from a live run.
- **Git history** was sampled (`git log --oneline -10`), not audited.

Anything labelled INFERRED or UNVERIFIED in the Discovery Report traces back to one of
these limits.
