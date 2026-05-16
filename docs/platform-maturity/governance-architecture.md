# Governance architecture

Governance is a visible operational subsystem covering provider, AI, safeguarding, inspection, audit, evidence and operational oversight.

Canonical DTOs:

- `schemas.operational_state.GovernanceSignOff`
- `schemas.operational_state.AuditTimelineEvent`
- `schemas.operational_state.OperationalStateLifecycleSnapshot`

## Sign-off rule

Do not hardcode review flows per feature. Represent review and sign-off as lifecycle metadata attached to the record transition, evidence trace or audit event.

## Governance-linked events

Governance-linked events should include:

- policy or control identifier
- reviewer
- required role
- sign-off state
- notes
- linked evidence
- linked chronology
- lifecycle state

## UI rule

Governance UX should be transparent and professional. It should show what is configured, what needs review and what has been signed off without implying automated regulatory assurance.
