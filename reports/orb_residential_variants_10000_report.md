# ORB Residential 10000 Variants Benchmark Report

- **Run timestamp:** 2026-06-16T21:10:11.572896+00:00
- **Scenario set:** `variants10000`
- **Mode:** `static`
- **Baseline version:** 1.0.0
- **Commit SHA:** c14a6d79d63e5c81374470c0e8d493b5c9399d24
- **Scenarios scored:** 250
- **Average overall score:** 4.06 / 5
- **Unsafe flag count:** 0

> Internal IndiCare Intelligence baseline — not clinically validated. Source-mapped internal quality framework. Internal quality indicator, not a regulatory judgement. Fixture mode scores template/fixture behaviour, not live LLM performance unless live mode used.

> No live LLM calls — static/rule mode scoring fixture or template scaffold outputs.

## Category averages

| Category | Average (0–5) |
| --- | ---: |
| child centredness | 3.85 |
| factual accuracy no invention | 4.0 |
| therapeutic language | 4.0 |
| observation vs interpretation | 4.0 |
| adult response and support | 4.0 |
| outcome and follow up | 3.84 |
| safeguarding awareness | 4.0 |
| management oversight | 4.0 |
| recording usefulness | 4.0 |
| professional tone | 4.0 |
| privacy minimisation | 5.0 |
| adult responsibility no replacement | 4.0 |

## Score distribution

- **excellent:** 225
- **good:** 25

## Top 10 weakest scenarios

- `core_003_v008_poor_wording_correction` (3.85) — Mealtime refusal — poor wording correction (base)
- `core_003_v014_mobile_friendly` (3.85) — Mealtime refusal — mobile friendly (child_voice_absent)
- `core_003_v016_safeguarding_escalation` (3.85) — Mealtime refusal — safeguarding escalation (child_voice_absent)
- `core_003_v019_voice_dictate_transcript` (3.85) — Mealtime refusal — voice dictate transcript (child_voice_absent)
- `core_003_v047_reg44_evidence` (3.85) — Mealtime refusal — reg44 evidence (no_direct_speech)
- `core_001_v001_rough_note` (3.92) — Daily record after difficult school day — rough note (base)
- `core_001_v011_rough_note` (3.92) — Daily record after difficult school day — rough note (child_voice_absent)
- `core_001_v021_rough_note` (3.92) — Daily record after difficult school day — rough note (adult_response_absent)
- `core_001_v051_rough_note` (3.92) — Daily record after difficult school day — rough note (safeguarding_cue)
- `core_002_v049_voice_dictate_transcript` (3.92) — Positive progress daily record — voice dictate transcript (no_direct_speech)

## Top 10 strongest scenarios

- `core_002_v011_rough_note` (4.15) — Positive progress daily record — rough note (child_voice_absent)
- `core_002_v021_rough_note` (4.15) — Positive progress daily record — rough note (adult_response_absent)
- `core_002_v031_rough_note` (4.15) — Positive progress daily record — rough note (unclear_chronology)
- `core_002_v061_rough_note` (4.15) — Positive progress daily record — rough note (meeting_ownership_gap)
- `core_002_v091_rough_note` (4.15) — Positive progress daily record — rough note (high_risk_proportionate)
- `core_001_v002_manager_oversight` (4.08) — Daily record after difficult school day — manager oversight (base)
- `core_001_v003_handover` (4.08) — Daily record after difficult school day — handover (base)
- `core_001_v004_mobile_friendly` (4.08) — Daily record after difficult school day — mobile friendly (base)
- `core_001_v005_child_centred_rewrite` (4.08) — Daily record after difficult school day — child centred rewrite (base)
- `core_001_v006_safeguarding_escalation` (4.08) — Daily record after difficult school day — safeguarding escalation (base)

## Weakest record types

- `daily_record`: 4.06

## Most common missing elements

- factual observations: 7

## Recommended improvement targets

- Improve outcome and follow up (avg 3.84)
- Improve child centredness (avg 3.85)
- Address missing element: factual observations

## External framework traceability

> Internal quality indicator, not a regulatory judgement. Aligned to recognised statutory, regulatory and professional sources where applicable.

> Scores are internal quality indicators aligned to recognised sources where mapped. They are not regulatory determinations, inspection predictions, or professional validation. Adults remain accountable for decisions, escalation and final records.

- **Framework claim:** Source-mapped internal quality framework
- **Registered sources:** 22
- **Rubric external coverage:** 100.0% (12/12 categories)
- **Unsafe flags with external basis:** 11/11
- **Scenario required elements mapped:** 10/10
- **Scenario families mapped:** 10/10

### Evidence strength summary

- **emerging:** 1 rubric categories
- **high:** 7 rubric categories
- **medium:** 4 rubric categories

## Comparison to baseline15

- **Baseline15 average:** 4.08 / 5
- **Current average:** 4.06 / 5
- **Delta:** -0.02

## Top strengths

- Missing information appropriately marked.
- No major punitive or diagnostic phrasing detected.
- Observable/factual framing present.
- Adult response visible.
- Outcome or follow-up referenced.

## Top weaknesses

- Child-centred subject language present.
- Outcome or follow-up referenced.

## Scenario scores

| Scenario | Score | Rating | Source |
| --- | ---: | --- | --- |
| core_001_v001_rough_note | 3.92 | good | variant_static |
| core_001_v002_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v003_handover | 4.08 | excellent | variant_static |
| core_001_v004_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v005_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v006_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v007_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v008_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v009_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v010_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v011_rough_note | 3.92 | good | variant_static |
| core_001_v012_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v013_handover | 4.08 | excellent | variant_static |
| core_001_v014_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v015_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v016_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v017_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v018_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v019_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v020_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v021_rough_note | 3.92 | good | variant_static |
| core_001_v022_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v023_handover | 4.08 | excellent | variant_static |
| core_001_v024_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v025_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v026_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v027_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v028_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v029_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v030_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v031_rough_note | 4.08 | excellent | variant_static |
| core_001_v032_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v033_handover | 4.08 | excellent | variant_static |
| core_001_v034_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v035_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v036_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v037_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v038_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v039_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v040_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v041_rough_note | 4.08 | excellent | variant_static |
| core_001_v042_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v043_handover | 4.08 | excellent | variant_static |
| core_001_v044_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v045_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v046_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v047_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v048_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v049_voice_dictate_transcript | 4.0 | excellent | variant_static |
| core_001_v050_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v051_rough_note | 3.92 | good | variant_static |
| core_001_v052_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v053_handover | 4.08 | excellent | variant_static |
| core_001_v054_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v055_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v056_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v057_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v058_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v059_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v060_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v061_rough_note | 4.08 | excellent | variant_static |
| core_001_v062_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v063_handover | 4.08 | excellent | variant_static |
| core_001_v064_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v065_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v066_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v067_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v068_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v069_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v070_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v071_rough_note | 4.08 | excellent | variant_static |
| core_001_v072_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v073_handover | 4.08 | excellent | variant_static |
| core_001_v074_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v075_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v076_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v077_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v078_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v079_voice_dictate_transcript | 4.0 | excellent | variant_static |
| core_001_v080_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v081_rough_note | 4.08 | excellent | variant_static |
| core_001_v082_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v083_handover | 4.08 | excellent | variant_static |
| core_001_v084_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v085_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v086_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v087_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v088_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v089_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v090_reflective_supervision | 4.08 | excellent | variant_static |
| core_001_v091_rough_note | 4.08 | excellent | variant_static |
| core_001_v092_manager_oversight | 4.08 | excellent | variant_static |
| core_001_v093_handover | 4.08 | excellent | variant_static |
| core_001_v094_mobile_friendly | 4.08 | excellent | variant_static |
| core_001_v095_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_001_v096_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_001_v097_reg44_evidence | 4.08 | excellent | variant_static |
| core_001_v098_poor_wording_correction | 4.08 | excellent | variant_static |
| core_001_v099_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_001_v100_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v001_rough_note | 4.0 | excellent | variant_static |
| core_002_v002_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v003_handover | 4.08 | excellent | variant_static |
| core_002_v004_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v005_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v006_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v007_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v008_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v009_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v010_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v011_rough_note | 4.15 | excellent | variant_static |
| core_002_v012_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v013_handover | 4.08 | excellent | variant_static |
| core_002_v014_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v015_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v016_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v017_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v018_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v019_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v020_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v021_rough_note | 4.15 | excellent | variant_static |
| core_002_v022_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v023_handover | 4.08 | excellent | variant_static |
| core_002_v024_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v025_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v026_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v027_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v028_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v029_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v030_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v031_rough_note | 4.15 | excellent | variant_static |
| core_002_v032_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v033_handover | 4.08 | excellent | variant_static |
| core_002_v034_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v035_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v036_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v037_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v038_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v039_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v040_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v041_rough_note | 4.08 | excellent | variant_static |
| core_002_v042_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v043_handover | 4.08 | excellent | variant_static |
| core_002_v044_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v045_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v046_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v047_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v048_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v049_voice_dictate_transcript | 3.92 | good | variant_static |
| core_002_v050_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v051_rough_note | 4.0 | excellent | variant_static |
| core_002_v052_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v053_handover | 4.08 | excellent | variant_static |
| core_002_v054_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v055_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v056_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v057_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v058_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v059_voice_dictate_transcript | 4.0 | excellent | variant_static |
| core_002_v060_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v061_rough_note | 4.15 | excellent | variant_static |
| core_002_v062_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v063_handover | 4.08 | excellent | variant_static |
| core_002_v064_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v065_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v066_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v067_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v068_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v069_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v070_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v071_rough_note | 4.08 | excellent | variant_static |
| core_002_v072_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v073_handover | 4.08 | excellent | variant_static |
| core_002_v074_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v075_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v076_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v077_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v078_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v079_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v080_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v081_rough_note | 4.08 | excellent | variant_static |
| core_002_v082_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v083_handover | 4.08 | excellent | variant_static |
| core_002_v084_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v085_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v086_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v087_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v088_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v089_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v090_reflective_supervision | 4.08 | excellent | variant_static |
| core_002_v091_rough_note | 4.15 | excellent | variant_static |
| core_002_v092_manager_oversight | 4.08 | excellent | variant_static |
| core_002_v093_handover | 4.08 | excellent | variant_static |
| core_002_v094_mobile_friendly | 4.08 | excellent | variant_static |
| core_002_v095_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_002_v096_safeguarding_escalation | 4.08 | excellent | variant_static |
| core_002_v097_reg44_evidence | 4.08 | excellent | variant_static |
| core_002_v098_poor_wording_correction | 4.08 | excellent | variant_static |
| core_002_v099_voice_dictate_transcript | 4.08 | excellent | variant_static |
| core_002_v100_reflective_supervision | 4.08 | excellent | variant_static |
| core_003_v001_rough_note | 4.0 | excellent | variant_static |
| core_003_v002_manager_oversight | 3.92 | good | variant_static |
| core_003_v003_handover | 3.92 | good | variant_static |
| core_003_v004_mobile_friendly | 3.92 | good | variant_static |
| core_003_v005_child_centred_rewrite | 3.92 | good | variant_static |
| core_003_v006_safeguarding_escalation | 3.92 | good | variant_static |
| core_003_v007_reg44_evidence | 3.92 | good | variant_static |
| core_003_v008_poor_wording_correction | 3.85 | good | variant_static |
| core_003_v009_voice_dictate_transcript | 3.92 | good | variant_static |
| core_003_v010_reflective_supervision | 3.92 | good | variant_static |
| core_003_v011_rough_note | 3.92 | good | variant_static |
| core_003_v012_manager_oversight | 4.0 | excellent | variant_static |
| core_003_v013_handover | 4.0 | excellent | variant_static |
| core_003_v014_mobile_friendly | 3.85 | good | variant_static |
| core_003_v015_child_centred_rewrite | 4.0 | excellent | variant_static |
| core_003_v016_safeguarding_escalation | 3.85 | good | variant_static |
| core_003_v017_reg44_evidence | 4.0 | excellent | variant_static |
| core_003_v018_poor_wording_correction | 4.0 | excellent | variant_static |
| core_003_v019_voice_dictate_transcript | 3.85 | good | variant_static |
| core_003_v020_reflective_supervision | 4.0 | excellent | variant_static |
| core_003_v021_rough_note | 4.0 | excellent | variant_static |
| core_003_v022_manager_oversight | 4.0 | excellent | variant_static |
| core_003_v023_handover | 4.0 | excellent | variant_static |
| core_003_v024_mobile_friendly | 3.92 | good | variant_static |
| core_003_v025_child_centred_rewrite | 4.0 | excellent | variant_static |
| core_003_v026_safeguarding_escalation | 3.92 | good | variant_static |
| core_003_v027_reg44_evidence | 4.0 | excellent | variant_static |
| core_003_v028_poor_wording_correction | 4.0 | excellent | variant_static |
| core_003_v029_voice_dictate_transcript | 3.92 | good | variant_static |
| core_003_v030_reflective_supervision | 4.0 | excellent | variant_static |
| core_003_v031_rough_note | 4.08 | excellent | variant_static |
| core_003_v032_manager_oversight | 4.08 | excellent | variant_static |
| core_003_v033_handover | 4.08 | excellent | variant_static |
| core_003_v034_mobile_friendly | 4.0 | excellent | variant_static |
| core_003_v035_child_centred_rewrite | 4.08 | excellent | variant_static |
| core_003_v036_safeguarding_escalation | 4.0 | excellent | variant_static |
| core_003_v037_reg44_evidence | 4.0 | excellent | variant_static |
| core_003_v038_poor_wording_correction | 4.08 | excellent | variant_static |
| core_003_v039_voice_dictate_transcript | 4.0 | excellent | variant_static |
| core_003_v040_reflective_supervision | 4.08 | excellent | variant_static |
| core_003_v041_rough_note | 4.08 | excellent | variant_static |
| core_003_v042_manager_oversight | 4.08 | excellent | variant_static |
| core_003_v043_handover | 3.92 | good | variant_static |
| core_003_v044_mobile_friendly | 4.0 | excellent | variant_static |
| core_003_v045_child_centred_rewrite | 4.0 | excellent | variant_static |
| core_003_v046_safeguarding_escalation | 4.0 | excellent | variant_static |
| core_003_v047_reg44_evidence | 3.85 | good | variant_static |
| core_003_v048_poor_wording_correction | 3.92 | good | variant_static |
| core_003_v049_voice_dictate_transcript | 4.0 | excellent | variant_static |
| core_003_v050_reflective_supervision | 3.92 | good | variant_static |
