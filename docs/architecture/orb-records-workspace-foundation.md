# ORB Records & Documents Workspace — Foundation

**Status:** Data model defined; persistence wiring is follow-up

## Goal

Each adult has a personal workspace converging ORB standalone saved outputs and IndiCare OS recording drafts.

## Workspace sections

| Section | Purpose |
|---------|---------|
| My Drafts | In-progress work across stations |
| My Records | Saved care records (reviewed) |
| My Documents | Uploaded/generated documents |
| Saved Templates | Frequently used templates |
| Recently Generated | Last N generated items |
| Needs Review | Awaiting adult review |
| Finalised | Completed and signed off |
| Archived | Retained but inactive |

## Item schema

Defined in `schemas/orb_records_workspace.py` — `OrbRecordWorkspaceItem`:

| Field | Type | Notes |
|-------|------|-------|
| `owner_user_id` | required | Adult owner |
| `home_id` / `organisation_id` | optional | Tenancy scope |
| `child_id` | optional/nullable | Only when authorised |
| `category` | string | Lifecycle or registry category |
| `template_id` | optional | Links to canonical registry |
| `source_station` | enum | chat, dictate, voice, write, templates, communicate, records, manual |
| `title`, `body` | string | Content |
| `status` | enum | draft, reviewed, finalised, archived |
| `privacy_classification` | enum | standard, sensitive, safeguarding, high_risk, minimised |
| `retention_policy` | enum | operational_draft, care_record_linked, inspection_evidence, governance, standalone_artefact |
| `created_at`, `updated_at`, `reviewed_at`, `exported_at` | ISO datetime | Lifecycle timestamps |
| `audit_trail` | list | Who did what when |
| `retention_metadata` | dict | Retention rules |

## Existing systems to converge

| System | Path | Role |
|--------|------|------|
| Recording drafts | `recording_draft_service.py`, `schemas/recording_drafts.py` | OS operational records |
| ORB saved outputs | `schemas/orb_saved_outputs.py` | Standalone intelligence artefacts |
| Handover drafts | `handover_draft_service.py` | Shift handover |
| Universal records (orphaned) | `backend/universal_records_router.py` | Not mounted — evaluate before wiring |

## Save pathway (planned)

```
Station (Chat/Dictate/Voice/Write/Templates)
  → template_id + body + metadata
  → OrbRecordWorkspaceItem (draft)
  → Adult review
  → status: reviewed → finalised
  → Optional: submit to OS recording_drafts for formal care record
```

## Privacy

- Founder analytics must not expose workspace item bodies — use counts and anonymised categories only
- `orb_founder_analytics_foundation_service.redact_identifiers_by_default`

## Blockers

- `workspace_records_routes` not mounted
- Universal records router orphaned
- Formal submission from recording drafts still partial

## Next pass

1. Create `orb_records_workspace_service.py` with in-memory then PG persistence
2. Wire Chat "turn into record" to workspace create
3. Unify ORB saved outputs listing with workspace sections
4. Add frontend Records hub in ORB Residential shell
