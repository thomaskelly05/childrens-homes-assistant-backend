# E6 — Quality & Verification Standard

| Field | Value |
|---|---|
| Document ID | E6 |
| Layer | L3 — Engineering Principles |
| Version | 0.1 — Phase 2 Batch 3 draft |
| Status | **Drafted — awaiting founder review. Not yet ratified.** |
| Owner | Engineering Owner (Tom Kelly, interim) |
| Reads with | `E3` (Release Governance), `A1` (AI safety eval), `CLAUDE.md` checklist |
| Evidence base | `constitution/phase-1-discovery/` |

This standard defines what "tested" and "verified" mean. It is deliberately honest about the
**gap between the quality gate that exists and full coverage**, because overstating test
coverage would breach the honesty principle (C1 Article 7).

---

## 1. Definition of "verified"

A change is "verified" only when it is implemented **and** its effect is demonstrated —
routes load, the changed flow and nearest working flow are exercised, safeguarding/escalation
wording remains safe, errors don't leak sensitive data, and no working area regressed
(`CLAUDE.md` "Verification checklist"). **Do not say "complete" unless implemented and
verified** (`CLAUDE.md`).

---

## 2. What exists today (VERIFIED)

- **737 test files** with heavy safety/governance naming. **VERIFIED** — `ls tests/` (E33).
- **ORB scenario quality gate** in CI: smoke / missing-from-care / critical-50 sets, mock
  provider by default, live behind a secret, on PR + nightly + manual. **VERIFIED** —
  `.github/workflows/orb-scenario-quality-gate.yml` (E34).
- **Evaluation harness:** `assistant/evals/` and the quality runners
  `scripts/run_orb_scenario_quality_gate.py`, `scripts/run_orb_launch_quality_report.py`.
  **VERIFIED** (CI workflow references them).

---

## 3. The honest coverage gap (VERIFIED)

- CI gates **only ORB scenarios** — **not** the full test suite, **not** type-checking,
  **not** linting. **VERIFIED** — `.github/workflows/` contains a single workflow (E34).
- Test infrastructure has documented fragility: some `tests/test_*.py` require a running
  server and are not pytest tests (AGENTS.md). **VERIFIED**.
- **No test was executed during Phase 1 discovery** (Python deps absent); suite health at
  runtime is **unknown**. **VERIFIED (not run)** — `import fastapi` fails (E49).

This standard therefore must **not** be read as "the code is well-tested." It is read as
"there is a meaningful ORB-scenario gate and a large test corpus whose live health is
unverified."

---

## 4. Required controls and status

| # | Required control | Status | Note |
|---|---|---|---|
| Q1 | Full test suite runs in CI on PRs | **Not yet (Future Vision)** | Highest-value gap (E3 R2). |
| Q2 | Type-check + lint gate on PRs | **Not yet** | `ruff` available but not enforced (AGENTS.md). |
| Q3 | ORB scenario quality gate | **Implemented** | E34. |
| Q4 | AI safety evaluation (boundaries, adversarial) | **Partial** | Adversarial firewall test exists (A1); coverage not audited. |
| Q5 | "Verified, not assumed" definition of done | **Documented** | `CLAUDE.md`; not tooling-enforced. |
| Q6 | Non-pytest scripts excluded/segregated from the suite | **Partial** | AGENTS.md documents manual exclusions. |

---

## 5. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| Full-suite/type/lint not gated | VERIFIED (E34) | Q1, Q2; tied to E3 R2. |
| Suite health unknown at runtime | VERIFIED not-run (E49) | Run in an equipped environment before any "tests pass" claim. |
| Test fixture fragility | VERIFIED | AGENTS.md. |

---

## 6. Current State vs Future Vision

**Current State (VERIFIED).** A genuine ORB-scenario quality gate and a 737-file test corpus
exist; full-suite/type/lint gating does not; runtime suite health is unverified.

**Future Vision (NOT YET BUILT).** A full pre-merge gate (suite + type + lint + AI-safety
evals) feeding E3's release controls; a clean separation of manual scripts; measured AI-safety
eval coverage.

---

## 7. What this standard does not claim
- It does **not** claim the test suite passes or that coverage is adequate; it was not run.
- It does **not** claim CI currently protects against regressions beyond ORB scenarios.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. |
