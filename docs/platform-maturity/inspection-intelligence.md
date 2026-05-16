# Inspection intelligence

Inspection readiness should be evidence-driven, historically traceable and governance-linked.

Canonical DTOs:

- `schemas.operational_state.InspectionEvidenceTrace`
- `schemas.operational_state.EvidenceEdge`
- `schemas.operational_state.OperationalStateLifecycleSnapshot`
- `schemas.operational_state.AuditTimelineEvent`
- `schemas.inspection_contracts`

## Evidence contract

Inspection evidence should expose:

- framework and requirement
- evidence status
- linked records
- linked chronology
- linked safeguarding records
- linked documents
- linked operational states
- review history
- sign-off history
- stale or missing evidence markers
- management oversight requirement

## Consolidation rule

Reg44, Reg45, Annex A and readiness views should consume one inspection trace contract. Do not add feature-specific evidence lineage shapes.

## Enterprise hardening update

`schemas.inspection_contracts` adds typed DTOs for inspection areas, evidence gaps/strengths, Reg44, Reg45, Annex A, SCCIF traces, reviews and management actions with chronology, evidence, lifecycle, governance, audit and signoff linkage.

## Future architecture

Inspection intelligence should read from chronology, evidence, lifecycle and governance history. It should identify unresolved gaps and repeated weaknesses deterministically, without predictive or diagnostic claims.
