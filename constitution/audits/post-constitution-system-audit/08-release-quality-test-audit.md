# 08 — Release, Quality & Test Audit (against E3, E6)

## Findings

**1. Deployment / release path — requires remediation (VERIFIED + INFERRED risk).**
- `render.yaml`: two services auto-deploy from `branch: main` (`autoDeploy: true`).
- Startup mutates the live schema: `core/lifespan.py:37-110` runs `run_schema_doctor` then
  `run_pending` migrations then auth-table inits.
- **No enforced full-test/migration-review gate** between merge and production schema change
  (the only CI workflow is the ORB scenario gate). This is E3's central risk (A1/Q9).

**2. CI coverage — not yet aligned (VERIFIED).**
- `.github/workflows/orb-scenario-quality-gate.yml` runs ORB scenarios (mock by default). There
  is **no** CI job running the pytest suite, type-checking, or lint. The egress guard from NR-1
  Phase A is **not yet wired into CI** (E6 Q7 remaining).

**3. Test corpus — large but unverified at runtime (VERIFIED existence; not run).**
- 737 files under `tests/`. **App deps are not installed**, so the suite was **not executed** in
  this audit (E49). Health/coverage at runtime is **UNVERIFIED**. AGENTS.md documents fixture
  fragility (some `test_*.py` need a running server; `conftest.py` imports app/`pyotp`).
- **Demonstrated in this audit:** dependency-free guard tests *can* run and were green after
  NR-1 Phase A; but anything importing the app cannot run here.

**4. Migrations — requires remediation (VERIFIED).**
- Three locations: `db/migrations/`, `migrations/`, `sql/` (partly manual per AGENTS.md). No
  single ordered ledger (E3 R3).

**5. Rollback / observability — partially aligned / unverified.**
- Sentry dependency + health endpoints (`/health`, `/health/ready`) exist (VERIFIED). A
  documented, tested **rollback** path is **UNVERIFIED** (E3 R8); incident-response doc exists
  (`docs/trust/orb-incident-response.md`).

**6. Import-time startup patches — requires remediation (VERIFIED).**
- `app.py` imports behaviour-mutating `startup_*_patch.py` at process start; one patch file is
  present but not imported. Fold into reviewed assembly (E4/E3 R10).

## Verdict
**Not yet aligned on release governance; quality framework partial.** A real ORB-scenario
quality gate and a large test corpus exist, but there is **no enforced pre-merge gate** (full
suite + type + lint + egress guard) before an auto-deploy that mutates the production schema.
This is the highest-leverage operational gap. Test-suite health is **unverified** here (no deps).
Requires remediation before broad launch: pre-merge gate, CI-wired egress guard, single migration
ledger, verified rollback, and folding-in of startup patches.
