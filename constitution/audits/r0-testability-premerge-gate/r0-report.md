# R0 — Testability & Pre-merge Gate Report

| Field | Value |
|---|---|
| Phase | Roadmap R0 (make the system testable + create a real pre-merge safety gate) |
| Branch | `fix/r0-testability-premerge-gate` |
| Date | 2026-06-27 |
| Environment | Clean Python 3.11.15 virtualenv (the system Python had a Debian-managed PyYAML conflict). Deploy host unreachable (network policy), so no live HTTP checks. |
| Constitution links | E3 (release governance), E6 (quality & verification), A2 NR-1 (egress guard) |

This report is honest about what runs, what does not, and why. It does **not** claim the
system is compliant, safe, secure, or launch-ready. **NR-1 remains PARTIALLY RESOLVED / OPEN.**

---

## 1. The pre-existing nightly critical-50 failure — investigated

**Cause (VERIFIED from the failed run's logs, run `28281138374` on `main` sha `3dbe6c6d`):**
it is **not** a broken-test or infrastructure failure. The nightly job runs
`scripts/run_orb_launch_quality_report.py --set critical-50` against the **mock** provider and
scored **44/50 (88%)** with **1 critical scenario failure** —
`GOLD-023-medication-error` (mock output missing: immediate safety; GP/NHS advice; learning;
CQC/Ofsted notification uncertainty without inventing). The script **exits 1 by design** when
the launch recommendation is "fail".

**Classification:** an **ORB scenario-quality** signal, **not** a testability defect. Per R0's
restriction against touching AI/safeguarding behaviour without a small, test-proven fix, R0
does **not** change prompts/scenarios to "fix" GOLD-023. Recommended as a separate
quality/R1 track. It pre-dates the NR-1/audit merges and is unrelated to them.

---

## 2. Test suites: what runs, fails, or cannot run

Run in a clean venv with `requirements.txt` installed (CI installs the same set successfully).

- **Collection:** **4,700 tests collected.** After the fixes in §3, only **4** files error at
  collection — the documented server-dependent manual scripts (`test_modes.py`,
  `test_stream.py`, `test_templates.py`, `test_validation.py`) which connect to
  `localhost:8000` at import (AGENTS.md). `test_auth.py` is also excluded per AGENTS.md.
- **Core run baseline** (excluding the 5 documented server scripts **and** the non-hermetic
  baseline test): **4,181 passed / 309 failed / 42 errors** in ~208s.
- **42 errors — single root cause (VERIFIED):** `tests/conftest.py:189` overrides
  `current_user_module.get_db`, but `auth/current_user.py` has **no `get_db`** (it now uses the
  `db_connection()` context manager, line 289). The fixture raises
  `AttributeError: module 'auth.current_user' has no attribute 'get_db'`, erroring the four
  **security/auth** files (`test_auth_flow.py`, `test_protected_routes.py`,
  `test_roles_and_permissions.py`, `test_assistant_isolation_routes.py`). This matches the
  AGENTS.md note about conftest fragility.
- **309 failures — not individually triaged.** Only the run's tail was captured; a full
  failure categorisation was not completed. Likely a mix of environment assumptions (no real
  DB/services) and possibly real issues. **Not fixed in R0** (out of scope / risk of touching
  behaviour); flagged for triage.
- **Non-hermetic / slow test (VERIFIED):** `tests/test_orb_residential_baseline.py` spawns
  `scripts/run_orb_residential_baseline.py` (`variants10000`) and **writes to tracked
  `reports/*.json`** — slow and mutates the working tree. Excluded from the fast gate; should
  be marked `slow`/hermetic-isolated.

---

## 3. Smallest fixes applied (to make the core gate reliable)

**Two real Python 3.11 syntax errors (VERIFIED fixed).** The pinned runtime is Python 3.11.9
(`runtime.txt`, `render.yaml`), but two modules used Python 3.12+ f-string syntax (a backslash
inside an f-string expression):
- `services/experience_bundle_service.py:307`
- `routers/os_shell_api_routes.py:276`

On 3.11 these are **SyntaxErrors**, so the modules **fail to import in production**. The router
loader catches this and **silently drops** `workspace_routes`, `connect_routes`, and
`young_people_profile_routes` (observed as "Router … failed to load" warnings), and **6 test
files could not be collected**. Fixed by precomputing the quoted SQL identifiers before the
f-string — **SQL output unchanged**. Verified: repo-wide `py_compile` 0 errors; `ruff` clean;
collection improved 4,684 → 4,700; the 6 files now collect.

**Not fixed in R0 (deliberate):** the conftest `get_db` fixture defect (§2). Repairing it
requires mocking the `db_connection()` context manager (and cascading billing/MFA lookups) for
four **security** test files. A rushed/incorrect mock could make security tests **falsely
pass** — worse than an honest error — so it is documented here with the precise root cause and
fix approach rather than rushed. Recommended fix: in `conftest.py`, remove the stale
`current_user_module.get_db` override and `monkeypatch.setattr(current_user_module,
"db_connection", <contextmanager yielding FakeConn>)`, making `FakeCursor` context-manager
capable; then verify the four files actually pass.

---

## 4. CI: the pre-merge gate (`.github/workflows/pre-merge-gate.yml`)

New workflow on `pull_request` into `main` (and `workflow_dispatch`), complementing the
existing ORB Scenario Quality Gate.

**Hard job `hard-gate` (blocking), in this step order:**
1. **Compile-all** — fails on any Python syntax error (would have caught the 3.11 f-string bug).
2. **AI egress governance guard (NR-1)** — `python scripts/ai_egress_audit.py` (no raw clients
   outside the factory; inference only in approved modules). **Runs before lint** so the NR-1
   guard always executes even if lint fails. **NR-1 guard is now wired into CI.**
3. **Ruff — changed Python files only.** Lints only the files changed in the PR (diff against
   the base), not the whole repo. This was an amendment after the first gate run failed: a
   repo-wide `ruff check .` found **961 pre-existing lint issues** (unrelated to any PR) and
   would have blocked every PR. Repo-wide ruff cleanup is a **separate future task**; until
   then ruff hard-gates only newly-changed files.

**Advisory job (non-blocking, `continue-on-error: true`):**
- **Core pytest suite** — runs for visibility with the documented exclusions. It is **not** a
  blocking check yet because the baseline is not green (309 failed / 42 errors). It must be
  promoted to required only after the suite is stabilised.

> To actually enforce before deploy, the hard jobs must be set as **required status checks** on
> the `main` branch-protection rule (a repository setting; cannot be set from code).

---

## 5. What CI now protects vs still does not

**Now protects (once the workflow is active + required):**
- Python **syntax errors** on the 3.11 runtime (the exact class of bug that was silently
  breaking production routes).
- **Lint regressions in changed files** (ruff on the PR diff; not repo-wide — see §4).
- **New direct AI/provider egress** outside approved governance modules (NR-1 guard).

**Still does NOT protect:**
- **Test correctness** — pytest is advisory until the 309 failures + 42 conftest errors are
  triaged/fixed and the suite is green.
- **Migration/schema safety** before the Render auto-deploy from `main` (E3 — separate work).
- **Live/runtime** behaviour, security enforcement breadth, tenancy, RLS (audit P0/P1 items).
- **Branch protection** is not configured by this PR (repository setting).

---

## 6. Verification performed (and limits)

| Check | Result |
|---|---|
| Repo-wide `py_compile` (3.11) | **0 syntax errors** (was 2) |
| `ruff` on changed files / repo | clean |
| AI egress guard (`scripts/ai_egress_audit.py`) | **exit 0** |
| Test collection | 4,700 collected; 4 documented server-test collection errors |
| Core suite run | 4,181 passed / 309 failed / 42 errors (baseline) |
| Live deploy HTTP check | **Not possible** — network policy blocks the deploy host |
| Full hermetic suite run | **Not completed** — slow non-hermetic baseline test; tail-only capture of failures |

---

## 7. Is the repository safer to merge after R0?

**Yes, modestly — and more honestly testable.** Two real production import-failures are fixed
(restoring three dropped routers), a syntax/lint/egress gate exists to catch the worst classes
of regression before `main`, and the true test baseline is now measured and documented rather
than unknown. **But the repository is not "safe to launch":** the pytest suite is not green,
the gate's test job is advisory, branch protection isn't set, and the audit's P0/P1 risks
(NR-1 remaining work, release/migration gate, tenancy/RLS, UI human-review) are untouched.

## 8. Is public-promise drafting still blocked?

**Yes — still blocked.** R0 did not change NR-1 (still PARTIALLY RESOLVED / OPEN) and did not
establish the conditions in `11-public-promise-readiness.md`. **No public promise; no claim
that all AI egress is governed; no claim of compliance/safety/security.**

---

## 9. Remaining R0-adjacent work (recommended order)
1. Fix the conftest `db_connection` fixture (restores 4 security test files) — carefully, then
   verify they pass.
2. Triage the 309 core-suite failures (group by cause; fix environment assumptions; isolate
   real defects).
3. Mark/iso­late non-hermetic + slow tests (`test_orb_residential_baseline.py`); stop tests
   writing to tracked `reports/`.
4. Once green, **promote the pytest job to a required check** and configure `main` branch
   protection.
5. Then proceed to R1 (finish NR-1) — separately, on founder authorisation.
