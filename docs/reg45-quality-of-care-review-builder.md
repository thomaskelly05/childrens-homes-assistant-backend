# Reg 45 Quality of Care Review Builder

## Purpose

The workspace at `/intelligence/reg45` helps leaders build a **draft** Regulation 45 quality of care review using safe evidence from inspection readiness, SCCIF alignment, recording governance, safeguarding network metadata, workforce context, and handover intelligence.

This **supports** leadership review. It does **not**:

- Claim compliance or say "meets the standard"
- Predict Ofsted outcomes or generate inspection grades
- Create statutory review conclusions automatically
- Expose raw child, safeguarding, HR, or supervision bodies in review cards

## Evidence sources

- Inspection readiness Reg 45 evidence support pack (`/intelligence/inspection-readiness`)
- SCCIF and Quality Standards alignment (`/intelligence/sccif`)
- Recording governance, alerts, review queue
- ISN safeguarding network (summary only)
- Workforce Context and Staff Profile OS (metadata)
- Handover intelligence and manager daily brief (counts/routes)
- Intelligence actions (optional creation from gaps)

## Review lifecycle

| Status | Meaning |
|--------|---------|
| draft | Initial generated review |
| evidence_gathering | Collecting additional evidence |
| ready_for_manager_review | Manager may review draft |
| manager_reviewed | Manager has reviewed — not compliance sign-off |
| ri_review_required | Responsible Individual review needed |
| ri_reviewed | RI has reviewed draft |
| finalised | Finalised draft — still requires professional judgement |
| archived | Archived draft |

## Sections

Fourteen structured sections including children's views, safeguarding, education, health, workforce, improvement actions, and provider/RI review prompts.

## Improvement actions

Draft improvement suggestions are generated from gaps. Optional creation of intelligence actions (`reg45_review_gap`) — if creation fails, an honest warning is returned. Actions are not auto-accepted.

## Manager / RI review

Use workflow actions: mark ready for manager review, manager reviewed, request RI review, mark RI reviewed, finalise. Language uses *Manager review needed*, *RI/provider review needed*, *Draft review*.

## Export / copy

Markdown export via `GET /api/reg45/reviews/{id}/export` — includes disclaimer. Future: PDF export and exact Knowledge Library citations.

## Safety boundaries

- Metadata and safe summaries only
- ORB links: `/assistant/orb` only
- No review payload in URLs (use `review_id` or `pack_id` only)
- Standalone `/orb` does not access Reg 45 APIs

## Persistence

Apply `sql/092_reg45_quality_reviews.sql`. Session memory fallback when table unavailable.

## Related docs

- [reg44-reg45-evidence-pack-builder.md](./reg44-reg45-evidence-pack-builder.md)
- [reg45-quality-of-care-review-workflow-map.md](./reg45-quality-of-care-review-workflow-map.md)
- [sccif-quality-standards-alignment-layer.md](./sccif-quality-standards-alignment-layer.md)
