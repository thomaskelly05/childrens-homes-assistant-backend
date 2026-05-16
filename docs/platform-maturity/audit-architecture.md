# Audit architecture

The platform has several audit sinks. New product surfaces should use a unified audit timeline shape rather than adding another audit table or frontend-only history model.

Canonical DTO:

- `schemas.operational_state.AuditTimelineEvent`

Primary integration points:

- `services.audit_event_service.record_audit_event` for platform audit envelopes.
- `repositories.operational_writeback_repository._insert_audit_event` for record transitions.
- `repositories.operational_writeback_repository.list_audit_timeline` for record-level timeline reads.
- `services.audit_replay_service` for replay and recovery diagnostics.

## Event fields

Audit events should carry:

- actor
- action
- entity type
- entity ID
- timestamp
- change summary
- linked evidence
- linked chronology
- operational relevance
- safeguarding relevance
- governance relevance

## Consolidation rule

Do not add feature-specific audit renderers. New UI should render `AuditTimelineEvent` or lifecycle snapshots that embed that timeline.
