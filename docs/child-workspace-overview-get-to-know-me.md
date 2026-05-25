# Child workspace overview — Get to know me

## Purpose

When an adult selects a child in scope-first flow, the first screen should help them understand the child before recording or taking action. The child workspace landing is a therapeutic, child-centred overview — not a technical workflow or raw evidence dump.

## Route model

| Layer | Route |
|-------|--------|
| Browser page (Next.js) | `/young-people/{id}/workspace` |
| Backend JSON data | `/os/young-people/{id}/workspace` |
| Enriched profile (compat) | `/api/young-people/{id}/profile-bundle` |

Scope-first navigation must never link to `/os/young-people/*` in the browser. `SyncChildScope` runs on the canonical page.

## Overview sections

1. **About this child** — identity, preferred name, age, home, placement, key worker, legal context (summary only).
2. **What matters to me** — interests, strengths, aspirations, cultural identity (from identity / all-about-me profiles).
3. **How best to support me** — communication style, sensory needs, what helps / does not help, routines.
4. **Today's picture** — recent chronology count, open actions, recording prompts (no raw record bodies).
5. **Safeguarding and risk** — risk level, concern count, missing-from-care status (metadata only; no raw safeguarding narratives).
6. **Plans and documents** — plan cards by type/status; no extracted document text by default.
7. **Child voice** — short summaries from records flagged with child voice (truncated, safe).
8. **Actions and reviews** — open/overdue actions linked to the child.
9. **ORB support** — summary-level prompts; links to `/assistant/orb` modes only (no child record body in URL).

## Data sources reused

- `GET /os/young-people/{id}/workspace` — young person row, chronology, actions, evidence, documents, lifecycle metadata.
- `GET /api/young-people/{id}/profile-bundle` — personhood, communication, safety summaries, plans (via `ExperienceBundleService.child_profile_bundle`).
- Existing mappers: `mapPerson`, `mapOsChronology`, `mapOsAction`, `mapOsEvidence` in `frontend-next/lib/os-api/*`.

No duplicate backend service was added for this pass.

## Privacy boundaries

- Do not render raw safeguarding concern narratives on the landing page.
- Do not expose staff HR fields beyond key worker display name.
- Do not show full chronology record bodies or extracted document text by default.
- Child voice lines are truncated summaries only.

## ORB boundaries

- ORB rail uses summary-level child context in copy only.
- All ORB links use `/assistant/orb?mode=...` (and optional `young_person_id` / `context=child` where already established).
- Never pass chronology bodies, document extracts, or safeguarding narratives in query strings.
- Standalone `/orb` remains unchanged.

## Empty states

Human copy when fields are missing, e.g. “No communication profile has been added yet.” Never show `null` or `undefined` in the UI.

## Future improvements

- Dedicated child-voice table feed with consent flags.
- Home name on workspace DTO from join.
- Today’s shift-specific “needs recording” from recording alerts API.
- Collapsible “Evidence and workflow” section for power users.
- Profile photo upload from overview hero.
