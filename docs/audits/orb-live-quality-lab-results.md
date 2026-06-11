# ORB Live Quality Lab GOLD Verification — Results

**Date/time:** 2026-06-11 (UTC)  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Verification pass:** GOLD V1 implementation + automated checks

## Environment

| Item | Value |
|------|-------|
| Run mode default | `live-llm` |
| ORB brain route | `/orb/standalone/conversation` |
| Assistant runtime | `OrbConvergedGeneralAssistantService` |
| Live LLM in this environment | **Not available** — `OPENAI_API_KEY` not configured |
| Model/route used (live) | N/A in local/dev — workflow records `live_call_error` per scenario |

## Scenario bank

| Metric | Value |
|--------|-------|
| GOLD scenario count | 100 |
| Whistleblowing covered | Yes (`GOLD-054-whistleblowing`) |
| Required topic coverage | Audited via `orb_quality_lab_scenario_coverage_service` |

Coverage gaps (if any) are reported in Quality Lab overview `coverage.missing_topics`. The bank includes families for missing from care, safeguarding, Reg 44/45, whistleblowing, medication, education, restraint, and related SCCIF themes.

## Automated verification results

### Backend (`pytest`)

```
tests/test_orb_quality_lab_routes.py — PASS
tests/test_orb_quality_lab_live.py — PASS
Total: 17 passed
```

Verified behaviours:

- `template` mode does not call live runner
- `live-llm` mode does not use sample-template answers
- High-risk scenarios flag `requires_human_review`
- Critical failure detection on unsafe answers
- Whistleblowing scenario present in GOLD bank
- Overview reports `default_run_mode: live-llm`

### Frontend

```
npm run typecheck — PASS
npm run build — PASS
node --experimental-strip-types --test (quality lab tests) — 15 passed
```

## Live LLM run results (honest status)

**No live LLM prose verification was executed in this environment** because OpenAI credentials are not configured. When `live-llm` mode is requested without credentials:

- Each scenario records `answer_source: live-llm`
- `generated_answer` is empty
- `live_call_error` explains unavailability
- `critical_failure` is set (launch-blocking)
- Launch gate recommendation remains **`not-ready`**

To obtain real verification results:

1. Deploy to staging/production with `OPENAI_API_KEY` configured.
2. Run GOLD pack from `/founder/quality-lab` with `live-llm` mode.
3. Complete human review for all high-risk / failed scenarios.
4. Re-check launch gate recommendation.

## Launch recommendation (this environment)

| Gate field | Value |
|------------|-------|
| `liveRunCompleted` | false (no successful live LLM run) |
| `criticalFailures` | N/A until live run |
| `pendingHumanReviews` | N/A until live run |
| `whistleblowingCovered` | true |
| `privacyRetentionReviewed` | false |
| **Recommendation** | **`not-ready`** |

### Remaining blockers

1. Live LLM verification not yet run with real ORB brain output
2. Human review of high-risk live answers pending
3. Privacy and retention review not recorded in launch gate

## Improvement proposals

Proposals are generated automatically when live runs fail (`live-llm-failure`, `unsafe-pattern`, `marker-gap`) or when founders mark human review as concern/fail. Build briefs can be created from proposals in Quality Lab UI.

## Strongest / weakest answers

Not ranked in this pass — requires a completed live-llm run in an LLM-enabled environment. Do not treat template-mode pass rates as launch evidence.
