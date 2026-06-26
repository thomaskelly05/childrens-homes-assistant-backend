# E3 — Operational & Release Governance Standard

| Field | Value |
|---|---|
| Document ID | E3 |
| Layer | L3 — Engineering Principles |
| Version | 0.1 — Phase 2 Batch 1 draft |
| Status | **Drafted — awaiting founder review. Not yet ratified.** |
| Owner | Release / Operations Owner (Tom Kelly, interim — Engineering Owner) |
| Reads with | `00-constitutional-hierarchy.md`, `C1-indicare-intelligence-constitution.md` |
| Evidence base | `constitution/phase-1-discovery/` |

This standard is written **early, in Batch 1**, by founder decision, because Phase 1 found
that the path from a code change to a production schema change has no enforced gate. This
standard governs that path. It does **not** claim the path is currently safe; it states what
is true today, what is required, and what is not yet built.

**Where a release affects ORB record-generation surfaces:** ORB supports reflection,
recording and evidence gathering. Adults remain responsible for judgement, safeguarding
escalation and final records. A release must never weaken that line.

---

## 1. Purpose

To govern how IndiCare Intelligence code reaches production safely, how database schema
changes are controlled, and who is accountable. Operationally relevant value ranks:
truthfulness (4), privacy (5), trust (6), engineering quality (8), commercial sustainability
(9), speed of delivery (10). Speed never overrides the protections above it.

---

## 2. Current State (VERIFIED unless noted)

This is the honest, evidenced description of how releases work **today**.

| Fact | Label | Evidence |
|---|---|---|
| Hosting is Render, region Frankfurt, two `web` services (`frontend-next` + backend), `starter` plan | VERIFIED | `render.yaml` (E35) |
| **Both services auto-deploy from `branch: main` with `autoDeploy: true`** — a merge to `main` ships to production | VERIFIED | `render.yaml` (E35) |
| On startup the app runs `run_schema_doctor` (ensures/repairs tables & columns), then `run_pending` migrations, then initialises legal-acceptance, MFA, passkeys, partner-assistant tables | VERIFIED | `core/lifespan.py:37-110` (E36) |
| Schema-doctor logs a summary (tables checked, columns ensured) | VERIFIED | `core/lifespan.py` (logger lines) |
| If `DB_REQUIRED_ON_STARTUP` is false, DB/startup failures degrade rather than crash | VERIFIED | `core/lifespan.py` |
| CI consists of a single workflow gating **ORB scenario quality only** (smoke / missing-from-care / critical-50), mock provider by default, live behind a secret | VERIFIED | `.github/workflows/orb-scenario-quality-gate.yml` (E34) |
| There is **no** CI gate running the full test suite, type-checking, or linting on PRs | VERIFIED | `.github/workflows/` (only one workflow present) |
| Three separate migration locations exist (`db/migrations/`, `migrations/`, `sql/`), partly applied manually | VERIFIED | listings (E42); AGENTS.md |
| Production secrets (`DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY`) are `sync: false` (set in Render dashboard, not in repo) | VERIFIED | `render.yaml` |
| A default first-admin password (`ChangeMe123456`) ships in `.env.example` / docs | VERIFIED | `.env.example`, AGENTS.md (E43) |
| Import-time startup patches (`startup_*_patch.py`) mutate routing/behaviour at process start; one patch file is present but not imported by `app.py` | VERIFIED | `app.py:1-6`; `ls startup_*.py` (E45) |
| Sentry is a dependency; health endpoints `/health`, `/health/ready`, `/` exist | VERIFIED | `requirements.txt`; `core/app_factory.py` (E23) |
| An incident-response trust document exists | VERIFIED (existence) | `docs/trust/orb-incident-response.md` |
| Tests were **not executed** during discovery (deps absent); suite health is unknown at runtime | VERIFIED (not run) | `python3 -c "import fastapi"` fails (E49) |

### 2a. The core operational risk (INFERRED)

**A merge to `main` can reach production and mutate the live database schema with no
enforced full-test or migration-review gate in between.** The combination is: auto-deploy
from `main` + startup schema-doctor/migrations + a CI workflow that only gates ORB
scenarios. (`repository-discovery.md` A1; `open-questions.md` Q9.) This is the central
reason this standard is prioritised. It is a risk statement, not a claim that an incident
has occurred.

---

## 3. Required controls

These are the governance requirements. Each carries a **current status** so the standard
never overstates implementation (constitution Article 7). "Required" states the rule;
"Status" states reality today.

| # | Required control | Status today | Notes |
|---|---|---|---|
| R1 | `main` is protected; changes land via reviewed PR, not direct push | **UNVERIFIED** — branch-protection settings live in GitHub, out of repo | Confirm and document branch protection |
| R2 | A pre-merge gate runs the **full test suite + typecheck + lint**, not only ORB scenarios | **Not yet (Future Vision)** — only ORB scenario gate exists (E34) | Highest-value gap to close |
| R3 | Database migrations live in **one ordered ledger** with a documented application order | **Not yet (Future Vision)** — three locations, partly manual (E42) | Reconcile `db/migrations/`, `migrations/`, `sql/` |
| R4 | Schema-altering changes are **reviewed before** reaching production; no unreviewed destructive auto-migration | **Partial** — migrations run automatically at startup (E36); review gate not enforced | Bound and review schema-doctor scope |
| R5 | `schema_doctor` operations are **bounded, logged, and auditable** | **Partial** — runs and logs a summary (E36) | Define and document its allowed scope |
| R6 | **No secrets in the repository** | **Implemented** — secrets are `sync: false` (E35) | Maintain |
| R7 | Default credentials are **rotated on every deployment**; no shipped default reaches production | **Partial / risk** — default password shipped in examples (E43) | Enforce rotation; document in E2 (Security) |
| R8 | A **documented, tested rollback path** exists for releases and migrations | **UNVERIFIED** — incident-response doc exists but rollback not verified here | Verify and document |
| R9 | **Observability**: errors and health are monitored; releases are traceable to a revision | **Partial** — Sentry present, health endpoints exist, `APP_REVISION` env exists | Confirm Sentry is wired and dashboards exist |
| R10 | **Import-time startup patches** are reviewed, intentional, and ideally folded into the app factory; no orphaned patch files | **Partial / risk** — patches mutate behaviour at import; one file unimported (E45, Q5) | Resolve intent; reduce import-time magic |
| R11 | Releases touching **safeguarding or AI record-generation** surfaces get explicit human review | **UNVERIFIED** | Tie to A1 (AI Safety) when written |

---

## 4. Decision ownership

**VERIFIED (founder decision, 2026-06-26).** The **Release / Operations Owner** is
accountable for this standard. Tom Kelly holds it on an interim basis (as Engineering
Owner). Defined separately from the other roles per the constitution's role model (C1
Article 5), even while one person holds several.

**Carried-forward gap.** Single-person ownership of release, engineering, product, AI safety
and documentation is a named bus-factor risk (`open-questions.md` Q3). Recorded, not hidden.

---

## 5. Carried-forward Phase 1 gaps owned by this standard

| Gap | Label | This standard's response |
|---|---|---|
| No enforced gate before production schema change (A1, Q9) | INFERRED risk | R1, R2, R4 |
| Three migration locations, partly manual (E42, Q6) | VERIFIED / risk | R3 |
| Default admin password shipped (E43, Q10) | VERIFIED | R7 (and E2) |
| Import-time patches; one unimported (E45, Q5) | VERIFIED / risk | R10 |
| Rollback path unverified | UNVERIFIED | R8 |
| Test suite not executed; coverage unknown (E49, Q11) | VERIFIED not-run | R2 (and E6 Quality) |

---

## 6. Current State vs Future Vision

**Current State (VERIFIED / INFERRED).** Deployment is functional and secrets are handled
correctly (R6). But the release path is **under-governed**: auto-deploy from `main`, a
narrow CI gate, automatic startup schema mutation across three migration locations, a shipped
default credential, and behaviour-mutating import-time patches. Several controls are
partial or unverified.

**Future Vision (NOT YET BUILT — not a current claim).** Protected `main`; a full-suite +
type/lint pre-merge gate; a single ordered migration ledger with reviewed schema changes; a
bounded, audited schema-doctor; enforced credential rotation; a verified rollback path;
wired observability with release traceability; and startup patches folded into reviewed app
assembly. None of these are asserted to exist today.

---

## 7. What this standard does not claim

- It does **not** claim deployments are currently safe, zero-downtime, or guaranteed.
- It does **not** claim the migration process is currently reviewed or consolidated.
- It does **not** assert any branch-protection or rollback control is in place; those are
  marked UNVERIFIED until evidenced.
- It governs how to reduce operational risk; it does not pretend the risk is already removed.
