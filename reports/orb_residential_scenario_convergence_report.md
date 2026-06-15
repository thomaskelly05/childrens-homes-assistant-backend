# ORB Residential Scenario Convergence Report

Generated: 2026-06-15T22:40:09.540674+00:00

## Summary

- Scenarios found before convergence: **115** (15 baseline + 100 expert gold)
- Core 100 recording scenarios: **100**
- Variants generated: **1000**
- Duplicates/overlaps detected: **10**

## Audit of existing sources

| Source | Count | Type | Synthetic | Scored | Fixtures | Overlaps | Converge |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `quality/orb_residential_baseline_scenarios.json` | 15 | recording_baseline | yes | yes | yes | maps to core100 via baseline_id | yes |
| `assistant/knowledge/orb_expert_scenarios.py` | 100 | expert_chat_stress | yes | yes | no | distinct from recording core100 — advisor prompts | yes |
| `assistant/knowledge/orb_scenario_sequences.json` | 10 | sequence_framework | yes | no | no | — | no |
| `assistant/evals/fixtures/orb_baseline_outputs/` | 15 | baseline_fixture_outputs | yes | yes | yes | — | no |
| `quality/orb_residential_core_100_scenarios.json` | 100 | recording_core100 | yes | yes | no | — | no |
| `quality/orb_residential_1000_scenario_variants.jsonl` | 1000 | recording_variants | yes | yes | no | — | no |

## Duplicates and overlaps

- **exact_input**: `core_001` ↔ `baseline_daily_record`
- **exact_input**: `core_011` ↔ `baseline_incident_reflection`
- **exact_input**: `core_021` ↔ `baseline_safeguarding_disclosure`
- **exact_input**: `core_091` ↔ `baseline_reg44_evidence`
- **exact_input**: `core_041` ↔ `baseline_magic_notes_conversion`
- **exact_input**: `core_043` ↔ `baseline_poor_wording_rewrite`
- **exact_input**: `core_088` ↔ `baseline_family_contact_review`
- **exact_input**: `core_083` ↔ `baseline_multi_agency_meeting`
- **exact_input**: `core_082` ↔ `baseline_strategy_safeguarding`
- **exact_input**: `core_094` ↔ `baseline_supervision_reflection`

## Convergence actions

- Baseline 15 scenarios mapped to core100 via `baseline_id` where content matches.
- Expert gold 100 retained as separate advisor bank in canonical index.
- Core 100 is the recording quality lab benchmark.
- 1000 variants generated deterministically (10 per core scenario).

## Coverage

### Record types (core100)

- `behaviour_reflection`: 11
- `complaint_record`: 1
- `daily_record`: 11
- `family_contact_record`: 2
- `general_dictation`: 3
- `handover`: 11
- `incident_report`: 8
- `key_work_session`: 10
- `manager_summary`: 14
- `multi_agency_discussion`: 5
- `placement_plan_review`: 1
- `professional_contact_note`: 4
- `reg_44_evidence_summary`: 2
- `reg_45_self_evaluation`: 2
- `risk_assessment_note`: 1
- `safeguarding_concern`: 11
- `strategy_safeguarding_discussion`: 1
- `supervision_discussion`: 2

### Feature targets (core100)

- Chat: 1
- Documents & Guidance: 1
- Magic Notes: 7
- Management oversight: 17
- ORB Write: 67
- Regulation evidence: 6
- Voice: 1
