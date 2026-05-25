# Reg 44 / Reg 45 evidence pack builder

## Purpose

The inspection readiness workspace at `/intelligence/inspection-readiness` helps Registered Managers, Responsible Individuals and leaders prepare **evidence support packs** from safe operational metadata. It does **not** predict Ofsted outcomes, generate inspection grades, or claim compliance.

## Reg 44 support

Monthly independent visitor (Reg 44) evidence support sections:

- Children's experiences and progress
- Safeguarding and protection
- Quality of care and daily life
- Staff practice and relationships
- Records and recording quality
- Environment and safety
- Leadership oversight and follow-up
- Actions and recommendations
- Independent visitor evidence (route to regulatory documents)

Language: *evidence aligned to*, *may support*, *manager review needed*, *requires source review*.

## Reg 45 support

Structured **Quality of Care Review** workflow: `/intelligence/reg45` (draft review builder connecting Reg 45 packs to sections, gaps, improvement actions, and manager/RI lifecycle).

Quality of care review (Reg 45) evidence support sections:

- Quality of care review summary
- Children's views, wishes and feelings
- Outcomes, progress and experiences
- Safeguarding effectiveness
- Education, health and wellbeing
- Positive relationships and family time
- Workforce and leadership
- Patterns, themes and trends
- Improvement actions

Not a Reg 45 final judgement.

## SCCIF / Quality Standards link

Packs reuse the SCCIF alignment layer (`/intelligence/sccif`) for judgement areas and Quality Standards mapping. Cross-links open inspection readiness from the SCCIF dashboard.

## Evidence strengths

| Strength | Meaning |
|----------|---------|
| strong_evidence | Submitted/approved metadata |
| partial_evidence | Operational metadata may support review |
| draft_only | Draft — not completed evidence |
| prompt_only | Suggested prompt only |
| route_hint_only | Open source route |
| not_yet_wired | Not aggregated |
| not_safe_to_summarise | Excluded from cards |

## Gap tracking

Gaps are *potential gaps* with recommended manager actions. Urgent/high risks surface in dashboard and daily brief.

## Pack saving

- Session memory always available
- PostgreSQL history via `sql/091_inspection_readiness_packs.sql`
- Optional operational output type `inspection_preparation` when ORB outputs service is available
- Honest warnings when persistence or save is unavailable

## Actions from gaps

Optional creation of proposed intelligence actions (`inspection_readiness_gap`). Actions require manager review — not auto-accepted.

## Safety boundaries

- No raw child, safeguarding, HR or supervision bodies in pack summary cards
- No standalone `/orb` access to these APIs
- ORB links use `/assistant/orb` only
- No pack payload in URLs

## Not an inspection grade

Professional judgement and statutory responsibilities remain required. Import official SCCIF and Quality Standards sources into the Knowledge Library for exact passage citations.

## Future

- PDF export
- Exact Knowledge Library citations per gap
- Deeper Reg 44 document ingestion (metadata only)
