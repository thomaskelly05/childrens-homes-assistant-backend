# ORB Source Citation Registry

## Purpose

Honest citation metadata for standalone ORB: which official and sector sources apply, when to cite them, and what must not be overclaimed.

Registry data: `assistant/knowledge/orb_source_registry.py`  
Service: `services/orb_source_registry_service.py`  
Selection: `services/orb_citation_decision_service.py`

## Core official sources (Stage 1)

1. **DfE Children's Homes Regulations Guide** — quality standards, practice, restraint, records, Reg 44/45  
   https://www.gov.uk/government/publications/childrens-homes-regulations-including-quality-standards-guide

2. **Children's Homes (England) Regulations 2015** — statutory regulation numbers  
   https://www.legislation.gov.uk/uksi/2015/541/contents

3. **Ofsted SCCIF — Children's Homes** — inspection evidence, child experience, leadership impact  
   https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes

4. **Working Together to Safeguard Children** — safeguarding partnership, escalation boundaries  
   https://www.gov.uk/government/publications/working-together-to-safeguard-children--2

5. **Children who run away or go missing from home or care** — missing, return conversations, exploitation  
   https://www.gov.uk/government/publications/children-who-run-away-or-go-missing-from-home-or-care

## Placeholder / enrichment sources

Children Act 1989, Care Planning Regulations, SEND Code, Equality Act, KCSIE, Prevent, NICE (LAC/self-harm), provider policies (safeguarding, medication, restraint, missing), Academy/NVQ pack, Skills for Care.

Non-statutory entries use `source_type` such as `practice_guidance`, `sector_resource`, or `provider_policy` — **not** treated as law.

## Fields per source

- `source_id`, `label`, `title`, `publisher`, `jurisdiction`, `source_type`, `url`
- `exact_text_available` — if false, ORB must not quote exact regulation wording
- `summary_basis`, `when_to_cite`, `scenario_families`, `regulation_numbers`
- `must_not_overclaim`

## Citation decision examples

| Family / mode | Typical sources |
|---------------|-----------------|
| `missing_from_care` | Missing guidance, Working Together, Reg 12 (via 2015 regs), SCCIF |
| `physical_intervention` | DfE guide, Reg 12/13, SCCIF, provider restraint policy (if uploaded) |
| `reg44_questions` | Reg 44, SCCIF, quality standards guide |
| `nvq_evidence_mapping` | Academy/NVQ pack + incident-specific practice sources |

The engine avoids citing irrelevant sources for appearance only.

## Adding a source

1. Add entry to `assistant/knowledge/orb_source_registry.py`
2. Wire `FAMILY_SOURCE_MAP` in `orb_citation_decision_service.py` if needed
3. Reference `source_id` in gold scenario `source_anchors`
4. Run `pytest tests/test_orb_source_registry.py`

## Frontend popovers

`to_citation_payload()` supplies `why_cited`, `basis_type`, `exact_text_available`, `source_url` for rich citation UI on `/orb`.
