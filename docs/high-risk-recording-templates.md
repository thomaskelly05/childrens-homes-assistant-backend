# High-risk recording structured templates

## Purpose

High-risk children's homes records need consistent, professionally defensible capture without replacing adult judgement. Structured templates in `/record` guide staff through fact, child voice, immediate safety, notifications, and follow-up while the free-text narrative editor remains available.

## Included templates (this pass)

| Form ID | Title |
|---------|--------|
| `safeguarding-concern` | Safeguarding concern |
| `disclosure` | Disclosure |
| `allegation` | Allegation |
| `physical-intervention` | Physical intervention / restraint |
| `injury-body-map` | Injury / body map |
| `medication-error` | Medication error |
| `return-conversation` | Return conversation / RHI |
| `room-search` | Room search / prohibited item |
| `complaint-concern` | Complaint / concern |
| `police-involvement` | Police involvement |
| `hospital-emergency` | Hospital / emergency services |

P1 templates also defined: `child-on-child-concern`, `exploitation-concern`, `damage-repair`, `staff-debrief-after-incident`.

## Safety boundaries

- Structured forms **support** recording; they do not decide safeguarding thresholds, referrals, or medication correctness.
- **No auto-approval** of high-risk records; manager review remains required.
- **No auto-submit** of unsupported formal safeguarding/restraint/body-map routes.
- Standard notices on every template:
  - Record factually. Avoid speculation.
  - Follow your home's safeguarding, medication and manager notification procedures.
  - Manager judgement remains required.
  - Do not include unnecessary third-party identifiers.

## Manager review

Templates set `requires_manager_review` and populate `structured_review_triggers` on drafts. The manager review queue at `/record/reviews` shows structured summary, missing required fields, and triggers alongside the draft body.

## ORB support

- Operational ORB only: `/assistant/orb?mode=record_quality_review` and `safeguarding_themes` where relevant.
- High-risk template ORB prompts include factual completeness, manager follow-up, and unnecessary identifier checks.
- Standalone `/orb` does not access recording template APIs or draft identifiers.

## Structured data storage

- API: `GET /recording-templates`, `GET /recording-templates/{form_id}`, validate/summary endpoints.
- Draft columns (migration `sql/082_recording_draft_structured_forms.sql`): `structured_template_id`, `structured_template_version`, `structured_data`, `structured_summary`, `structured_completion`, `structured_review_triggers`.
- Privacy-sensitive structured fields add `privacy_flags` and a reminder to review identifiers before submission.

## Limitations

- Not every catalogue form is structured yet; remaining forms use draft workspace + free text.
- Structured validation is intentionally light (required fields, triggers, summary)—not a full clinical/safeguarding rules engine.
- Formal submission routes for many high-risk types remain review-gated or draft-only until workflow wiring is complete.

## Next forms to structure

- Bullying / peer conflict
- Missing episode (full workflow fields)
- Reg 40 / notification forms
- Staff supervision linked to incidents
