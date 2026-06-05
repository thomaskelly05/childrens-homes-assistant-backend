# ORB Dictate — Template-Aware Recording

## Selected template card

`OrbDictateSelectedTemplateCard` appears at the top of the Dictate studio workspace.

Shows:
- Selected template label (from framework)
- Purpose / when to use
- What ORB will check (compact chips)
- Expandable: when not to use, output options, session privacy reminder

Data attributes: `data-orb-dictate-selected-template-card`, `data-orb-dictate-orb-checks`.

## Brain analysis

`POST /orb/dictate/analyze` accepts optional `record_type_id` and `template_id`.

Response adds framework fields:
- `record_type_id`, `required_sections`, `orb_will_check`
- `recording_quality_guidance`
- `possible_outputs` — from framework `suggested_outputs`

Brain panel sections:
- Record type, required sections, what ORB will check
- Missing information, safeguarding, child voice, manager oversight
- Suggested next actions, suggested outputs, recording guidance

## Suggested outputs

`OrbDictateSuggestedOutputs` filters outputs by selected record type (e.g. Missing From Home → chronology, social worker update, risk assessment).

## Privacy

- Session-only transcript model unchanged
- No child profile selector added
- Internal brain metadata not shown in UI

## Studio templates

Nine studio presets map to framework record types via `studio_template_id`. Template selector behaviour is unchanged.
