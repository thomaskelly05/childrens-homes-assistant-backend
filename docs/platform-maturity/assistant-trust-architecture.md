# Assistant trust architecture

Assistant trust depends on explainable retrieval, cautious wording, permission filtering and audit-visible oversight.

Canonical DTO:

- `schemas.operational_state.AssistantOversightMarker`

## Required metadata

Assistant and ORB responses that use operational context should carry:

- evidence IDs
- chronology IDs
- operational state IDs
- governance policy IDs
- why-surfaced explanation
- retrieval confidence or limitation note
- degraded-context warning, when applicable
- audit/oversight interaction ID

## Boundary rule

Permission filtering must happen before context is assembled. Hidden child, staff, audit, governance and provider-only data must not reach retrieval prompts, citations or ORB context.

## Enterprise hardening update

Assistant retrieval scope checks now resolve `ProviderContext` before retrieving chronology, evidence, documents, actions or reports. Missing or cross-home scope fails before source assembly.

## Future architecture

Use one assistant runtime facade with modality-specific adapters for text assistant and ORB. Preserve ORB runtime separation while sharing citation, oversight and governance audit contracts.
