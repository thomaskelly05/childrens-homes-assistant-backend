# ORB Residential Launch Gate Pass — Readiness Report

**Date:** 2026-06-23  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Branch:** `cursor/orb-residential-launch-gate-pass-56c0`  
**Base:** `main` (includes merged PR #1709 and PR #1710)

---

## Executive verdict

| Gate | Ready |
|------|-------|
| **Closed pilot ready** | **No** |
| **Public launch ready** | **No** |

Both remain blocked by missing live-LLM GOLD verification evidence and unrecorded privacy/retention governance sign-off. Internal-brain high-risk pre-checks pass. Stabilisation regression bundle is green at **85/85**.

---

## PR merge verification (#1709 + #1710)

| Check | Result |
|-------|--------|
| PR #1709 merged to `main` | Yes (`777068cb`) |
| PR #1710 merged to `main` | Yes (`26da18e7`) |
| Simulated merge-tree (#1709 + #1710) | **Clean** — no conflicts |

---

## Stabilisation bundle (85/85)

| Layer | Tests | Result |
|-------|------:|--------|
| Backend convergence | 38 (`test_orb_residential_convergence.py`, `test_orb_domain_convergence_integration.py`) | **38/38 pass** |
| Frontend launch stabilisation | 47 (launch polish, voice polish, navigation, governance store, quality lab contracts) | **47/47 pass** |
| **Total** | **85** | **85/85 pass** |

Extended launch pytest (quality lab routes, launch routes, smoke contract): **75/75 pass**.

---

## `privacyRetentionReviewed` launch gate

| Item | Status |
|------|--------|
| Gate logic in `launch-quality-gate.ts` | Verified — blocks public launch when false |
| Governance store (`launch-governance-store.ts`) | **Added** — founder records review in local storage |
| Quality Lab UI warning + record action | **Added** — `quality-lab-privacy-retention-review`, `quality-lab-public-launch-warning` |
| Admin quality dashboard warning | **Added** — `data-orb-admin-privacy-retention-warning` |
| Founder agent event hooks | Wired to `getPrivacyRetentionReviewed()` |
| Current recorded state (this environment) | **false** (not signed off) |

Public launch is blocked or warned when `privacyRetentionReviewed` is false. Closed pilot does not require this sign-off but other gates still apply.

---

## Internal-brain high-risk pack

**Location:** `scripts/run_orb_internal_brain_evaluation_packs.py`  
**Service:** `services/orb_internal_brain_evaluation_service.py`  
**Founder UI:** `/founder/orb-evaluation` → “Run internal brain high-risk test”

| Pack | Scenarios | Passed | Critical failures |
|------|----------:|-------:|------------------:|
| high-risk | 4 | 4 | 0 |
| adversarial | 8 | 8 | 0 |
| full | 13 | 13 | 0 |

High-risk scenarios: self-harm, missing from care, allegation/LADO, whistleblowing — all passed with 0 critical failures.

---

## Live LLM Quality Lab GOLD scenario bank

**Bank size:** 100 GOLD scenarios  
**Coverage audit:** complete — `whistleblowing_covered: true`, no missing topics

| Launch topic | GOLD scenario IDs | Bank status |
|--------------|-------------------|-------------|
| Safeguarding disclosure | GOLD-009, GOLD-010 | Present |
| Self-harm | GOLD-015, GOLD-016 | Present |
| Allegation against staff | GOLD-011 | Present |
| LADO | GOLD-011 (allegation/LADO pathway) | Present |
| Missing from care | GOLD-001, GOLD-002 | Present |
| Exploitation | GOLD-006, GOLD-007, GOLD-008 | Present |
| Whistleblowing | GOLD-054 | Present |
| SEND communication crisis | GOLD-038, GOLD-039 | Present |
| Child voice / advocacy | GOLD-033, GOLD-060 | Present |

**Live LLM run status (this environment):** Not executed — `OPENAI_API_KEY` not configured. Template/automated checks pass; live prose verification and human review remain required before any launch recommendation changes.

---

## Remaining blockers

1. **No completed live-llm GOLD verification run** with real ORB brain output
2. **Human review** of high-risk live answers pending (when live run exists)
3. **Privacy and retention review not recorded** (`privacyRetentionReviewed: false`)
4. **No completed internal-brain high-risk run in founder session store** (script pack passes; persisted founder evaluation run still required for closed-pilot gate UI)
5. **Stripe domain verification / production env** (documented in prior readiness reports — outside this gate pass)

---

## Files changed (this pass)

| File | Change |
|------|--------|
| `frontend-next/lib/orb/quality/launch-governance-store.ts` | **New** — privacy/retention review persistence |
| `frontend-next/lib/orb/quality/launch-governance-store.test.ts` | **New** — contract tests |
| `frontend-next/lib/orb/quality/launch-quality-gate.test.ts` | Added public-launch privacy blocker test |
| `frontend-next/components/founder/founder-quality-lab-page.tsx` | Wire store + UI warning/record action |
| `frontend-next/components/founder/founder-quality-lab-page.test.ts` | Assert privacy retention UI hooks |
| `frontend-next/components/admin/orb-quality-dashboard.tsx` | Wire store + public launch warning |
| `frontend-next/components/founder/founder-orb-evaluation-page.tsx` | Wire privacy gate into launch summary |
| `frontend-next/lib/founder/agents/autonomous/founder-agent-event-hooks.ts` | Use governance store |
| `docs/audits/orb-residential-launch-gate-pass-report.md` | **New** — this report |

---

## Tests run

```bash
# Stabilisation bundle (85/85)
python -m pytest tests/test_orb_residential_convergence.py tests/test_orb_domain_convergence_integration.py -q
cd frontend-next && node --experimental-strip-types --test \
  components/orb-residential/orb-residential-launch-polish.test.ts \
  components/orb-standalone/orb-voice-launch-polish.test.ts \
  components/orb-standalone/orb-launch-finish-navigation.test.ts \
  lib/orb/quality/launch-governance-store.test.ts \
  components/founder/founder-quality-lab-page.test.ts \
  lib/founder/quality-lab/quality-lab-live.test.ts \
  lib/orb/evals/orb-launch-readiness-report.test.ts

# Extended launch pytest
python -m pytest tests/test_orb_quality_lab_routes.py tests/test_orb_quality_lab_live.py \
  tests/test_orb_launch_routes.py tests/test_orb_residential_launch_smoke_contract.py -q

# Internal-brain packs
python scripts/run_orb_internal_brain_evaluation_packs.py
```

---

## Failures remaining

| Area | Failure |
|------|---------|
| Live LLM GOLD run | Cannot complete without API credentials |
| Launch gate recommendation | `not-ready` |
| Privacy retention sign-off | Not recorded in this environment |
| Closed pilot gate (UI) | Blocked until live GOLD + internal-brain run persisted in founder session |

No regressions in the 85/85 stabilisation bundle or internal-brain script packs.
