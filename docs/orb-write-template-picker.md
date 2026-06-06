# ORB Write Template Picker

## Access

ORB Write → Source panel → **Choose template** (or Browse all templates → Templates page handoff unchanged).

## UI

- Searchable modal (`data-orb-write-template-picker`)
- Groups: Recording, Safeguarding, Management, Guidance/policy, Briefings/summaries
- Template detail: writing guidance, style chips, therapeutic prompts

## Apply modes

| Action | Behaviour |
|--------|-----------|
| Use this template | Record type + structured headings if empty |
| Apply headings only | Inserts `final_document_headings` structure |
| Apply style guidance | Updates record type and checks only |
| Replace document | Confirms if content exists |
| Merge with current draft | Headings prepended to existing body |

## Effects

- Sets `record_type_id` / `template_id`
- Updates title and record type badge
- Updates ORB assistant checks (brain panel `recordTypeId`)
- Updates PDF/export headings via `document_headings`
- Preserves rough notes unless adult confirms replace

## Handoff compatibility

Templates page → ORB Write via `orb-write-template-handoff-v1` unchanged.

Component: `components/orb-write/orb-write-template-picker.tsx`
