# IndiCare OS client demo script

## Goal

Show that IndiCare gives a registered manager and care staff a calm operating picture, a two-minute child understanding, and evidence-linked recording without dashboard overload.

## Demo path

1. Login.
2. Open Command Centre.
3. Show the attention queue: safeguarding, child wellbeing, open actions, evidence gaps and documents for review.
4. Open a young person from search or the young people list.
5. Explain the child in two minutes: identity, placement, key worker, legal status, what needs attention, what helps, contacts and latest chronology.
6. Add a daily note.
7. Save the daily note.
8. Reopen the child journey and confirm the saved-state message.
9. Open the child chronology and show the projection when available.
10. Open Documents.
11. Search for a document, evidence item, chronology event or child.
12. Show inspection readiness and explain gaps/actions.
13. Open Assistant / ORB.
14. Ask an operational question such as: "What should staff review for this child before handover?"
15. Show provider oversight.
16. Explain governance, audit and replay at a high level.

## Talk track

- "IndiCare starts with what needs attention, not a wall of widgets."
- "The child page is designed for staff on shift: who this child is, what matters today, what helps, who to contact and what to do next."
- "Daily notes are the operational heartbeat. Suggestions are review prompts; staff remain in control."
- "Chronology, evidence and inspection readiness are connected so records become usable evidence, not duplicated paperwork."
- "ORB supports drafting and reflection. It does not replace professional judgement."

## Current demo cautions

- Use `frontend-next` as the product UI.
- Avoid legacy `frontend` shells unless explicitly framed as retired/internal.
- If a backend route is not configured, call out the clear limitation rather than presenting fallback data as live.
- Do not claim first-class safeguarding or missing episode APIs until dedicated routers replace incident transport.
