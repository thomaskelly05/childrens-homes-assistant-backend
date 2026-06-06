# Document Comparison → ORB Write Handoff

## Flow

Comparison output → **Open in ORB Write** / **Open action plan** / **Open staff briefing**

Uses existing converged handoff:

1. `handoffTextToOrbWrite()` → `orb-write-content-handoff-v1` session storage
2. ORB Write panel loads via `loadOrbWriteContentHandoff()` → `contentHandoffToOrbWriteDocument()`

## Payload

| Field | Value |
|-------|-------|
| `content` | Markdown comparison output |
| `source` | `document` |
| `source_label` | `Documents & Guidance — {outputType}` |
| `title` | Comparison or action plan title |
| `record_type_id` | e.g. `manager_summary` for action plan lens |
| `timestamp` | ISO datetime |

## Saved Outputs

Comparison saves with:

- `created_from`: `document_comparison`
- `type`: `policy_comparison` \| `action_plan` \| `staff_briefing`
- `metadata.comparison_lens`, `adult_review_required: true`

Re-open via `handoffSavedOutputToOrbWrite()` — `document_comparison` mapped to `document` source.

## Adult review

All handoff documents include `ORB_WRITE_REVIEW_STATEMENT` and `is_draft: true`.
