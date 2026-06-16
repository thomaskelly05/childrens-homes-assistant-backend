# ORB Quality Lab Output Naturalness Audit

Generated: 2026-06-16T14:22:44.073984+00:00

Sampled **50** scenarios from variants1000 static scaffold outputs.

> Internal quality indicator — not a regulatory judgement. Static scaffold mode; no live LLM calls.

## Summary

- Average output length: **3218** characters
- Average headings per output: **10.86**
- Natural outputs in sample: **0**
- Formulaic outputs in sample: **50**

## Examples of good outputs

- No standout natural examples in sample threshold.

## Examples of formulaic outputs

- `core_001_v01_rough_note` (daily_care): ## Daily record after difficult school day — rough note |  | ## What happened | young person returned from school upset said lessons were difficult refused tea at first later settled after staff sa |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | Details to confirm: review whether any gaps remain before finalising. |  | ## Observed / said / reported…
- `core_003_v01_rough_note` (daily_care): ## Mealtime refusal — rough note |  | ## What happened | young person refused lunch saying they were not hungry staff offered alternative snack later young person ate a small |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | Details to confirm: review whether any gaps remain before finalising. |  | ## Observed / said / reported vs reflection | Observed…
- `core_005_v01_rough_note` (daily_care): ## Hygiene support — rough note |  | ## What happened | young person needed encouragement with personal care this morning staff offered sensitive support and choices young pe |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | What is not yet stated: | - Direct words if known — the child's words were not recorded; add if known. | - Outcome not yet reco…
- `core_007_v01_rough_note` (daily_care): ## Child requests private conversation — rough note |  | ## What happened | young person asked to speak privately before bedtime shared worries about school but did not want details recorded in f |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | What is not yet stated: | - Adult response not yet recorded — complete with specific actions only as pro…
- `core_009_v01_rough_note` (daily_care): ## Child returns home unsettled — rough note |  | ## What happened | young person returned to the home after off-site appointment appearing unsettled would not say why immediately staff o |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | What is not yet stated: | - Direct words if known — the child's words were not recorded; add if known. | - Adult r…
- `core_011_v01_rough_note` (incident_reflection): ## Property damage — rough note |  | ## What happened | young person became distressed in lounge threw cushion and damaged a picture frame staff used calm voice, offered spac |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | What is not yet stated: | - Direct words if known — the child's words were not recorded; add if known. | - Outcome not yet reco…
- `core_013_v01_rough_note` (incident_reflection): ## Door slamming / emotional distress — rough note |  | ## What happened | young person slammed bedroom door after disappointing phone call staff checked welfare through door young person said |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | What is not yet stated: | - Outcome not yet recorded — follow-up still to be confirmed. | - Chronology to cla…
- `core_015_v01_rough_note` (incident_reflection): ## Bullying concern — rough note |  | ## What happened | young person reported name-calling by a peer at school staff recorded words used school to be informed young person d |  | ## Known / gaps | Based on the information provided: | Known / observed / reported: see factual account above. | What is not yet stated: | - Direct words if known — the child's words were not recorded; add if known. | - Outcome not yet reco…

## Repeated phrases found

- (50×) Observed / said / reported:
- (50×) - Staff observed: see factual account and presentation above.
- (50×) Possible meaning (reflection, not fact): further review may be needed to understand what the young person may have been 
- (50×) What remains unknown: see Known / gaps above.
- (50×) Pathway to consider (responsible adult to decide per local policy):
- (50×) What remains unresolved: record outstanding actions and review owner.
- (50×) Draft only — adult review required. This supports reflection and recording; it is not a safeguarding or management decis
- (44×) Wishes, feelings and views: not yet known — to be sought where appropriate.
- (40×) Based on the information provided:
- (40×) Known / observed / reported: see factual account above.

## Sections overused

- `Observed / said / reported vs reflection` — appears in 50 sampled outputs
- `Child voice / presentation` — appears in 50 sampled outputs
- `Pathway to consider` — appears in 50 sampled outputs
- `What happened` — appears in 40 sampled outputs
- `Known / gaps` — appears in 40 sampled outputs
- `What adults did to support` — appears in 40 sampled outputs
- `Dignity, relationship and child's experience` — appears in 40 sampled outputs
- `Outcome / follow-up` — appears in 40 sampled outputs

## Wording that feels artificial

- Boundary footer and pathway boilerplate repeat across families (expected in static scaffold).
- 'not yet known' prompts are intentional gaps — not invented facts.
- Merged dignity/experience section reduces duplicate headings while keeping child-centred markers.

## Recommended consolidation changes

- Keep single shared boundary footer across scaffold types.
- Derive therapeutic principles from `orb_residential_principles.py` + framework JSON SSOT.
- Align `calmed down` replacement to `appeared calmer` across contract service and scaffold.
- Use JSONL streaming for 10,000 scoring; summary-only reports by default.
- Progress logging every 500 scenarios for scale runs.
