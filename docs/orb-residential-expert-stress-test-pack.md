# ORB Residential Expert Stress Test Pack

## Why a scenario system, not a static list

ORB expert testing uses a **structured scenario matrix** — families, modifiers, gold scenarios, generated variants, source anchors, and an evaluation rubric — so we can scale to thousands of realistic children's home situations without maintaining one flat CSV.

The canonical UI remains **`/orb`**. This pack does not add a second ORB UI and does not connect standalone ORB to live IndiCare OS records.

**Live answers (2026-05-29):** Scenario families are now active in production `/orb` conversation via the [ORB Expert Answer Engine](./orb-expert-answer-engine.md) — recognition, expert packets, role shaping, citations, and local self-check. The stress-test pack remains the evaluation backbone.

## Components

| Component | Location |
|-----------|----------|
| Scenario families (taxonomy) | `assistant/knowledge/orb_expert_scenario_families.py` |
| Modifiers (child, home, evidence, role, output mode) | `assistant/knowledge/orb_expert_scenario_modifiers.py` |
| 100 gold hand-authored scenarios | `assistant/knowledge/orb_expert_scenarios.py` |
| Source registry | `assistant/knowledge/orb_source_registry.py` |
| Scenario bank service | `services/orb_expert_scenario_bank_service.py` |
| Evaluator service | `services/orb_expert_scenario_evaluator_service.py` |
| Citation decision engine | `services/orb_citation_decision_service.py` |
| **Expert answer engine (live `/orb`)** | `services/orb_expert_answer_engine_service.py` |
| Schemas | `schemas/orb_expert_scenarios.py`, `schemas/orb_expert_review.py` |

## Gold scenarios

- **100** gold scenarios (`GOLD-001` … `GOLD-100`), including the previous **unknown adult / car pickup** live safeguarding stress scenario as `GOLD-001`.
- Each includes: prompt, role, risk level, expected markers, must-not-say, source anchors, recording/manager/Reg 44/NVQ expectations.

## Generated variants

```bash
source .venv/bin/activate
python scripts/generate_orb_scenario_variants.py --count 50 --family missing_from_care
python scripts/generate_orb_scenario_variants.py --dry-run --count 5
```

- Output: `assistant/knowledge/generated_orb_scenario_variants.json`
- Never overwrites gold scenarios
- OpenAI optional (`OPENAI_API_KEY`); local deterministic generation works without it
- Generated rows: `generated: true`, `needs_human_review: true`

## Stress test runner

```bash
python scripts/run_orb_expert_stress_tests.py --limit 20
python scripts/evaluate_orb_scenario_answer.py --scenario-id GOLD-001-unknown-vehicle-missing --answer-file /tmp/answer.txt
```

Reports:

- `docs/reports/orb-expert-stress-test-report.md`
- `.tmp/orb-expert-stress-test-report.json`

Without API keys, the runner evaluates **sample/golden answer templates** only (`route_call_skipped: true`).

## Evaluator scoring

Dimensions include: main risk, no invented facts, child voice, recording, plan review, manager oversight, safeguarding uncertainty, chronology, Ofsted/Reg 44, role fit, source anchors, tone, next action.

**Critical fails:** live OS access claims, invented facts, definite referral yes/no, false closure, punitive labels as fact, missing high-risk markers.

## Integration with ORB

- **What Am I Missing:** `orb_action_engine_service.analyse_what_missing_gaps()` adds expert markers from scenario detection
- **Knowledge retrieval:** `prepare_request_bundle()` adds expert prompt block
- **Citations:** `build_standalone_sources()` merges registry citations via citation decision engine

## Human expert review loop (design)

Reviewer groups: RM, RI/provider, Reg 44, safeguarding lead, support worker/senior, NVQ assessor, Ofsted-experienced consultant.

Per reviewer: ~20 scenarios — mark missed markers, overclaiming, unsafe wording, practice usefulness; suggest variants and anchors.

Schema placeholder: `schemas/orb_expert_review.py` (no review UI in this pass).

## Roadmap

| Stage | Target |
|-------|--------|
| 1 | 100 gold + source registry + evaluator (**this PR**) |
| 2 | 500 generated variants (reviewed sample) |
| 3 | 1500+ matrix combinations in CI sampling |
| 4 | Human expert review loop |
| 5 | Continuous regression in CI |

## Tests

```bash
pytest tests/test_orb_expert_scenario_bank.py tests/test_orb_expert_scenario_evaluator.py \
  tests/test_orb_source_registry.py tests/test_orb_citation_decision_service.py -q
```

## Standalone vs OS boundary

Standalone `/orb` uses only user-provided text and built-in knowledge. Stress tests and evaluator enforce: **no live OS record claims**, **no invented facts**, **no exact regulation quotes unless `exact_text_available`**.
