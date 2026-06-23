# ORB Closed Pilot Gate Run — Readiness Report

**Date:** 2026-06-23  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Branch:** `main` (includes merged PR #1712)  
**Gate run branch:** `cursor/orb-closed-pilot-gate-run-b87c`

---

## Executive verdict

| Gate | Ready |
|------|-------|
| **Closed pilot ready** | **No** — live GOLD + human review evidence still required |
| **Public launch ready** | **No** — privacy/retention not recorded; live GOLD incomplete |
| **Closed pilot can start today** | **No** |

Internal-brain high-risk pre-checks pass (50/50 scenarios, 0 critical failures). Live LLM GOLD verification was not executed in this environment because `OPENAI_API_KEY` is not configured. Manual GOLD workflow is visible in Quality Lab when live LLM is unavailable.

---

## PR #1712 merge verification

| Check | Result |
|-------|--------|
| PR #1712 merged to `main` | Yes (`7f1497ef`) |
| Merge-tree `main` ↔ PR #1712 head | **Clean** — no conflicts |

---

## Readiness flags (this gate run)

| Flag | Value | Notes |
|------|-------|-------|
| `internalBrainHighRiskPassed` | **true** | Full high-risk pack audit: 50 scenarios, 0 critical failures |
| `liveGoldRunCompleted` | **false** | No completed `live-llm` GOLD run (`OPENAI_API_KEY` absent) |
| `highRiskHumanReviewed` | **false** | 59 high/critical GOLD scenarios require review; none reviewed |
| `privacyRetentionReviewed` | **false** | Not auto-recorded (confirmed) |
| `closedPilotReady` | **false** | Blocked by live GOLD + human review |
| `publicLaunchReady` | **false** | Blocked by privacy retention + live GOLD + human review |

Governance snapshot persisted to `reports/orb-closed-pilot-gate-governance-snapshot.json` (mirrors `orb-launch-governance-v1` session store shape). Founder browser session store syncs automatically when internal-brain high-risk completes via `/founder/orb-evaluation`.

---

## Internal-brain high-risk pack

**Audit script:** `scripts/audit_internal_brain_critical_failures.py`  
**Service:** `services/orb_internal_brain_evaluation_service.py`  
**Founder UI:** `/founder/orb-evaluation` → “Run internal brain high-risk test”

| Pack | Scenarios | Critical failures | Avg score |
|------|----------:|------------------:|----------:|
| high-risk (full) | 50 | 0 | 96.3 |
| adversarial | 10 | 0 | — |
| full | 39 | 0 | — |

Compact pack script (`scripts/run_orb_internal_brain_evaluation_packs.py`): high-risk 4/4, adversarial 8/8, full 13/13 — all 0 critical failures.

Audit artefact: `scripts/audit_high-risk_internal_brain.json`

---

## Live LLM GOLD Quality Lab

| Item | Status |
|------|--------|
| `OPENAI_API_KEY` in this environment | **Not configured** |
| `live_llm_available()` | **false** |
| GOLD scenario bank | 100 scenarios |
| High/critical GOLD scenarios | 59 |
| Whistleblowing covered | Yes (`GOLD-054-whistleblowing`) |
| Topic coverage complete | Yes (`missing_topics: []`) |
| Live GOLD run executed | **No** |

All 59 high/critical GOLD scenarios automatically flag `requires_human_review: true` via `requires_human_review()` in `services/orb_quality_lab_scoring_service.py` until a founder records `reviewed-pass`, `reviewed-concern`, or `reviewed-fail`.

---

## Manual GOLD workflow (OPENAI_API_KEY unavailable)

Quality Lab shows the manual workflow panel (`data-testid="quality-lab-manual-gold-workflow"`) when `liveLlmAvailable` is false.

### Exact manual run instructions

1. **Run internal-brain high-risk pack**  
   Open `/founder/orb-evaluation` → run “internal brain high-risk test”. Confirms routing, safeguards and fallback logic without OpenAI. Gate requires 0 critical failures (script audit already passes).

2. **Obtain live ORB answers in staging**  
   Deploy to staging with `OPENAI_API_KEY` configured. Open `/founder/quality-lab` → run GOLD pack in `live-llm` mode. Export high-risk scenario answers for founder review. Synthetic scenarios only — never real child records.

3. **Paste and evaluate high-risk GOLD answers** (if live-llm unavailable locally)  
   Open `/founder/quality-lab` manual eval panel. Paste each high-risk GOLD answer using scenario IDs from the bank (e.g. `GOLD-015-self-harm-disclosure`, `GOLD-054-whistleblowing`).

4. **Complete human review of high-risk scenarios**  
   Open `/founder/quality-lab` → review latest run. For each high/critical result, record `reviewed-pass`, `reviewed-concern`, or `reviewed-fail`. Closed pilot requires all 59 high-risk items reviewed.

5. **Privacy & retention review (public launch only)**  
   Open `/founder/quality-lab` governance panel → record privacy/retention sign-off. **Do not auto-record.** Closed pilot does not require this step.

---

## Constraint confirmations

| Constraint | Status |
|------------|--------|
| `privacyRetentionReviewed` not set automatically | **Confirmed** — remains `false`; only `recordPrivacyRetentionReview()` sets it |
| Communicate hidden from launch nav | **Confirmed** — `ORB_HIDDEN_LAUNCH_STATION_IDS = ['orb_communicate']`; not in `ORB_VISIBLE_SIDEBAR_NAV_IDS` |
| `voice_fast` remains beta/limited | **Confirmed** — skips brain convergence, safety scaffold, policy retrieval and source chips (`VOICE_FAST_LIMITATIONS`); 40-word cap; contract tests in `tests/test_orb_voice_fast_latency_contract.py` |
| Safeguarding/source chips not weakened | **Confirmed** — no changes in this gate run |
| Intelligence domains unchanged | **Confirmed** — no domain changes |
| Communicate not reopened | **Confirmed** — remains hidden from primary nav |

---

## Manual actions required

1. Configure `OPENAI_API_KEY` in staging/production and run full GOLD pack in `live-llm` mode from Quality Lab.
2. Complete human review for all 59 high/critical GOLD scenarios in the latest live run.
3. Persist internal-brain high-risk run in founder session store via ORB Evaluation UI (script audit passes; UI persist unlocks closed-pilot gate flags in Quality Lab).
4. Privacy & retention sign-off before any public launch (founder manual action only).

---

## Tests run

```bash
# Internal-brain high-risk full pack audit
python scripts/audit_internal_brain_critical_failures.py

# Compact internal-brain packs
python scripts/run_orb_internal_brain_evaluation_packs.py

# Backend gate contracts
python -m pytest tests/test_orb_quality_lab_live.py tests/test_orb_quality_lab_routes.py \
  tests/test_orb_internal_brain_evaluation.py tests/test_orb_voice_fast_latency_contract.py -q
# Result: 33/33 pass

# Frontend closed-pilot gate contracts
cd frontend-next && node --experimental-strip-types --test \
  lib/orb/quality/launch-quality-gate.test.ts \
  lib/orb/quality/launch-governance-store.test.ts \
  components/founder/founder-quality-lab-page.test.ts \
  components/orb-residential/orb-navigation-convergence.test.ts
# Result: 29/29 pass
```

---

## Files changed (this gate run)

| File | Change |
|------|--------|
| `reports/orb-closed-pilot-gate-governance-snapshot.json` | **New** — governance/session store snapshot from high-risk pack |
| `scripts/audit_high-risk_internal_brain.json` | Refreshed by gate run audit |
| `docs/audits/orb-closed-pilot-readiness-pass-report.md` | Updated with operational gate run results |
