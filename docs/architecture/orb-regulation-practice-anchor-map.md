# ORB Regulation & SCCIF Practice Anchor Map

**Status:** Foundation service live — anchors are prompts, not compliance guarantees

## Disclaimer

> Regulation and SCCIF anchors support evidence thinking and documentation. They do not guarantee compliance, predict inspection outcomes, or replace statutory responsibilities, local policy or professional judgement.

Implemented in `services/orb_regulation_practice_anchor_service.py` and `services/sccif_alignment_registry_service.py`.

## Anchor catalogue

### Children's Homes Quality Standards

| Anchor ID | Label | Regulation |
|-----------|-------|------------|
| `quality_purpose` | Quality and purpose of care | Regulation 6 |
| `views_wishes_feelings` | Children's views, wishes and feelings | Regulation 7 |
| `education` | Education | Regulation 8 |
| `enjoyment_achievement` | Enjoyment and achievement | Regulation 9 |
| `health_wellbeing` | Health and well-being | Regulation 10 |
| `positive_relationships` | Positive relationships | Regulation 11 |
| `protection_children` | Protection of children | Regulation 12 |
| `leadership_management` | Leadership and management | Regulation 13 |
| `care_planning` | Care planning | Regulation 14 |

### SCCIF judgement areas

| Anchor ID | Label |
|-----------|-------|
| `sccif_experiences_progress` | SCCIF — experiences and progress |
| `sccif_help_protection` | SCCIF — help and protection |
| `sccif_leadership` | SCCIF — effectiveness of leaders and managers |

### Additional practice themes

| Anchor ID | Label | Regulation |
|-----------|-------|------------|
| `safeguarding` | Safeguarding | Children's Homes Regulations |
| `behaviour_restraint` | Behaviour and restraint / physical intervention | Regulation 20 |
| `privacy_dignity` | Privacy and dignity | Regulation 22 |
| `complaints` | Complaints | Regulation 24 |
| `notifications` | Notifications | Regulation 27 |
| `records` | Records | Regulation 32 |
| `staff_fitness` | Staff fitness / staffing / supervision | Regulations 28–31 |
| `independent_visits` | Independent person visits | Regulation 44 |
| `quality_of_care_review` | Quality of care review | Regulation 45 |
| `reg44` | Regulation 44 — independent person visits | Regulation 44 |
| `reg45` | Regulation 45 — quality of care review | Regulation 45 |

## Template attachment

Each taxonomy entry includes `regulation_anchors[]` in `services/orb_template_taxonomy_data.py`.

Example — safeguarding concern record:

```json
{
  "template_id": "safeguarding_concern_record",
  "regulation_anchors": ["protection_children", "sccif_help_protection"]
}
```

API: `GET /templates/taxonomy/regulation-anchors`

## Answer attachment (planned)

When ORB generates answers about regulated topics:

1. Attach relevant anchors from template or contract family
2. Include disclaimer in response metadata
3. Never state "this guarantees compliance"

## Official sources

From `sccif_alignment_registry_service.OFFICIAL_SOURCES`:

- [SCCIF children's homes](https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes)
- [Guide to Children's Homes Quality Standards (DfE)](https://assets.publishing.service.gov.uk/media/5a7f1b54ed915d74e33f45f0/Guide_to_Children_s_Home_Standards_inc_quality_standards_Version__1.17_FINAL.pdf)

Exact citations require Knowledge Library import — alignment layer uses summary mapping only.

## What we do not do

- Predict Ofsted grades
- State compliance is guaranteed
- Provide legal advice
- Override safeguarding with local policy
