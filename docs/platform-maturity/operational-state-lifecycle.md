# Operational state lifecycle

Operational states are first-class operational objects. The canonical lifecycle states are:

- `open`
- `acknowledged`
- `in_review`
- `resolved`
- `reopened`
- `escalated`
- `archived`

Use `schemas.operational_state.OperationalStateLifecycleSnapshot` for read models and `services.operational_lifecycle_service` for transition metadata. Do not create per-feature lifecycle DTOs.

## Write path

The durable write path is `repositories.operational_writeback_repository.transition_record`.

Each transition should preserve:

- actor
- transition
- current lifecycle state
- assignment metadata
- resolution metadata
- escalation metadata
- sign-off metadata
- evidence links
- chronology links
- governance links
- workflow history
- audit context

The repository still writes through the existing workflow, chronology and audit tables when those tables exist. Existing domain status mappings remain authoritative for shipped features; lifecycle normalization is added around them.

## UX language

Use calm wording:

- "needs review"
- "review suggested"
- "resolved with evidence"
- "escalated for oversight"

Avoid blame language and alarmist labels.
