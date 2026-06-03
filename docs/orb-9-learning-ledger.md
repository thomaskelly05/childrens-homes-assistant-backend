# ORB 9 — Learning ledger

## Purpose

Capture **anonymised** interaction patterns to improve ORB — not child-identifiable sector intelligence.

## Schema

- **Pydantic:** `schemas/orb_learning_ledger.py`
- **SQL:** `sql/209_orb_learning_ledger.sql`
- **Service:** `services/orb_learning_ledger_service.py` (in-memory; wire to DB in app startup when migration applied)

## Fields captured

- `user_role`, `prompt_summary` (redacted), `intent`, `active_brains`, `risk_level`
- `source_basis`, `answer_quality_score`, `missing_markers`
- `follow_up_classification` from `orb_followup_learning_service`
- Flags: `copied`, `exported`, `record_created`, `answer_regenerated`, `manager_amended`
- `learning_tags` — anonymised taxonomy only

## Follow-up taxonomy

Classifications include: `missing_escalation_clarity`, `missing_recording_clarity`, `missing_safeguarding_threshold_clarity`, `missing_manager_oversight`, `missing_child_voice`, `policy_gap`, `training_need`, etc.

## Recording

```python
from services.orb_expert_brain_orchestrator_service import orb_expert_brain_orchestrator_service

packet = orb_expert_brain_orchestrator_service.build_context_packet(message)
orb_expert_brain_orchestrator_service.record_interaction(packet, user_role="registered_manager", prompt_text=message)
```

## Privacy

- Names and ages redacted in `prompt_summary`.
- No child IDs or home IDs in standalone ledger rows.
