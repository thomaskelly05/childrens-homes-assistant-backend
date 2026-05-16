# Assistant oversight

Assistant responses are operationally integrated draft support. They must remain explainable, cautious, governance-aware and evidence-aware.

Canonical DTO:

- `schemas.operational_state.AssistantOversightMarker`

Assistant audit and oversight should preserve:

- interaction identifier
- evidence attribution
- chronology attribution
- operational state awareness
- governance policy visibility
- uncertainty note
- degraded behaviour note

## Safety rules

- Do not increase prompt size with raw child or staff data unless needed.
- Do not expose unnecessary child or staff data.
- Do not let assistant output become a safeguarding, clinical or regulatory decision.
- Degraded behaviour should be explicit and safe.

## Integration points

Use existing assistant audit hooks and retrieval context builders. Do not create assistant-specific evidence or audit systems.
