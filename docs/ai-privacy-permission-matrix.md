# AI Privacy Permission Matrix

Internal safety design for IndiCare Intelligence AI privacy guardrails.

## Surfaces

| Surface | Auth | Record data | Notes |
|---------|------|-------------|-------|
| `standalone_orb` | Optional session | Denied by default | `/orb` only — no OS APIs |
| `operational_orb` | Required | Summary only | `/assistant/orb` — permissioned context |
| `record_hub` | Required | Minimised | Recording support |
| `care_hub` | Required | Summary | Care Hub intelligence |
| `governance_dashboard` | Manager+ / audit | Metadata only | Leadership oversight |
| `operational_outputs` | Required | OS-linked artefacts | Export gated |
| `saved_outputs` | Standalone user | User-controlled | Identifier warnings on export |

## Data classes

- **Allowed on standalone**: `no_record_data`, `reference_guidance`, `user_provided_document`
- **Denied on standalone**: all child/staff/safeguarding/OS operational classes
- **Operational summary**: `child_record_summary`, `safeguarding_summary`, `operational_metadata`, themes/counts
- **Denied to model by default**: `child_record_raw`, `safeguarding_raw` (unless future explicit flag + manager role)
- **High sensitivity + manager review**: `body_map`, `health_medication`, `safeguarding_raw`

## Actions

| Action | Standalone | Operational |
|--------|------------|---------------|
| `send_to_model` | Reference + user text | Minimised + redacted summary |
| `export_output` | Warn on identifiers | Manager/senior/RI/admin |
| `use_child_context` | Deny | Home/child scope check |
| `view_governance` | Deny | `governance:review` or manager roles |

## Roles (canonical)

Mapped via `auth/rbac.py` and `core/policy_engine.py`:

- **admin / RI**: full governance, export, safeguarding review
- **manager / deputy**: operational summary, export, manager review flags
- **support_worker**: operational summary, no raw, limited export
- **viewer**: read-only — no assistant by default

## Rules

1. **Fail closed** when role or scope is unknown.
2. **Standalone boundary**: never send OS context to standalone model calls.
3. **Summary-first**: operational ORB receives minimised fields only (`ai_context_minimisation_service`).
4. **Redaction before model** (`ai_redaction_service`): email, phone, DOB, NHS, postcode, names (strict modes).
5. **Audit metadata only** (`ai_privacy_events` table) — no raw prompts or record bodies.
6. **Retention notices** (`ai_retention_policy_service`) — no automated deletion in this pass.

## Implementation files

- `schemas/ai_privacy.py`
- `sql/079_ai_privacy_events.sql`
- `services/ai_permission_guard_service.py`
- `services/ai_redaction_service.py`
- `services/ai_context_minimisation_service.py`
- `services/ai_privacy_guard_service.py`
- `services/ai_privacy_audit_service.py`
- `services/ai_retention_policy_service.py`
- `routers/ai_privacy_governance_routes.py`
- `services/orb_operational_assistant_service.py` (integration)
- `frontend-next/app/intelligence/governance/privacy/`
