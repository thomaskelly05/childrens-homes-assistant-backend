# ORB 9 — Quality Standards map

## Spine

The nine Quality Standards from the **Guide to the Children's Homes Regulations** are the residential answer spine. Ofsted SCCIF sits above them asking: what is life like for children, are they helped and protected, are leaders effective?

## Data

- **JSON:** `assistant/knowledge/orb_quality_standards_brain.json`
- **Service:** `services/orb_quality_standards_brain_service.py`

Each standard includes: `child_question`, `adult_practice_questions`, `manager_oversight_questions`, `professional_lenses`, `records_to_check`, `evidence_markers`, `risk_markers`, `orb_answer_rules`.

## Example — Protection of children (`qs7_protection`)

- **Child question:** Am I safe and do adults notice risk early?
- **Lenses:** manager, social worker, police, LADO, health, Ofsted, Reg 44
- **Records:** safeguarding concern, missing episode, exploitation screen, risk assessment, chronology, manager review, notifications
- **Evidence markers:** timely action, clear escalation, child voice, plan updated
- **Risk markers:** repeated concern, no manager review, weak chronology, missing exploitation analysis

## Usage

```python
from services.orb_quality_standards_brain_service import orb_quality_standards_brain_service

block = orb_quality_standards_brain_service.prompt_block(user_message)
```

Orchestrator attaches this automatically for residential paths.
