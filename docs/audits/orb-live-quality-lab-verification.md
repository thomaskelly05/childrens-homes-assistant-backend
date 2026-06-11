# ORB Live Quality Lab GOLD Verification — Audit

**Date:** 2026-06-11  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Scope:** ORB Quality Lab live LLM verification (GOLD V1)

## Executive summary

ORB Quality Lab previously evaluated **sample-template answers only** (`use_sample_answers: true`, `route_call_skipped: true`). This pass adds **`live-llm` run mode** (default for production verification) that routes synthetic GOLD scenarios through the **ORB standalone conversation brain** (`/orb/standalone/conversation`) without bypassing safety prompts.

## Current mode (after this pass)

| Mode | Description | Default |
|------|-------------|---------|
| `template` | Stitched sample answers from expected markers | Regression / offline |
| `live-llm` | Real ORB Residential brain via converged assistant runtime | **Production verification default** |

## Routes involved

| Surface | Route | Backend |
|---------|-------|---------|
| Founder Quality Lab | `/founder/quality-lab` | Proxies `/api/founder/quality-lab/*` |
| Admin ORB Quality | `/admin/orb-quality` | `/orb/admin/feedback/*` + launch gate summary |
| Quality Lab API | `POST /orb/admin/quality-lab/runs` | `OrbQualityLabService.run_gold_pack` |
| ORB brain (live) | `POST /orb/standalone/conversation` | `OrbConvergedGeneralAssistantService.answer` |

## Key files

### Backend

| File | Role |
|------|------|
| `assistant/knowledge/orb_expert_scenarios.py` | 100 GOLD scenarios incl. `GOLD-054-whistleblowing` |
| `services/orb_quality_lab_service.py` | Pack runner, mode selection, result assembly |
| `services/orb_quality_lab_live_runner_service.py` | Live LLM runner via standalone brain path |
| `services/orb_quality_lab_scoring_service.py` | Scoring breakdown + critical failure detection |
| `services/orb_quality_lab_scenario_coverage_service.py` | GOLD topic coverage audit |
| `services/orb_expert_scenario_evaluator_service.py` | Marker/safeguarding rubric scoring |
| `schemas/orb_quality_lab.py` | `QualityRunMode`, `ReviewStatus`, launch gate models |
| `routers/orb_quality_lab_routes.py` | Admin API routes |

### Frontend

| File | Role |
|------|------|
| `frontend-next/lib/founder/quality-lab/*` | Types, run service, human review, proposals |
| `frontend-next/lib/orb/quality/launch-quality-gate.ts` | Launch readiness recommendation |
| `frontend-next/components/founder/founder-quality-lab-page.tsx` | Founder UI |
| `frontend-next/components/admin/orb-quality-dashboard.tsx` | Admin UI + launch gate |

## Prior risks (pre-pass)

1. **False confidence** — template runs always passed when markers were stitched in.
2. **No live prose verification** — safeguarding quality of actual LLM output unverified.
3. **No human review gate** — high-risk failures had no structured review workflow.
4. **No launch gate** — no honest closed-pilot / public-launch recommendation.

## Changes for live verification

1. `QualityRunMode`: `template` | `live-llm` (default `live-llm`).
2. Live runner calls ORB standalone brain with synthetic scenario wrapper only.
3. Full generated answers stored in `generated_answer` with `answer_source: live-llm`.
4. Scoring breakdown across 12 dimensions + critical failure detection.
5. `ReviewStatus` human review workflow on high-risk / failed results.
6. `ORBLaunchQualityGate` with blockers for critical failures and pending reviews.
7. Retest preserves original run history; creates linked retest run.

## Interaction: `/admin/orb-quality` vs `/founder/quality-lab`

| | Founder Quality Lab | Admin ORB Quality |
|--|---------------------|-------------------|
| Data | GOLD synthetic scenarios + live LLM runs | Live user thumbs up/down feedback |
| Purpose | Launch verification, expert review | Operational feedback triage |
| Bridge | Admin launch gate reads session Quality Lab runs; feedback gap sync creates proposals |

## Verification commands (Phase 11)

### Backend

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_quality_lab_routes.py tests/test_orb_quality_lab_live.py -q
```

### Frontend

```bash
cd frontend-next
npm run typecheck
npm run build
node --import tsx --test lib/orb/quality/launch-quality-gate.test.ts lib/founder/quality-lab/quality-lab-live.test.ts components/founder/founder-quality-lab-page.test.ts
```

## Live LLM environment note

If `OPENAI_API_KEY` is not configured, live-llm runs **fail safely** with `live_call_error` recorded — results are **not fabricated**. Run full verification in staging/production with LLM credentials.

## Phase 11 verification results (2026-06-11)

| Check | Result |
|-------|--------|
| `pytest tests/test_orb_quality_lab_routes.py tests/test_orb_quality_lab_live.py` | **17 passed** |
| `cd frontend-next && npm run typecheck` | **PASS** |
| `cd frontend-next && npm run build` | **PASS** |
| Quality lab frontend tests (`node --experimental-strip-types --test …`) | **15 passed** |
| Live LLM call in this environment | **Not run** — no `OPENAI_API_KEY` |

See `docs/audits/orb-live-quality-lab-results.md` for the honest launch recommendation (`not-ready` until live LLM + human review complete).
