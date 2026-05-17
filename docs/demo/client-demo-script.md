# IndiCare OS client demo script

## Goal

Show that IndiCare gives a registered manager and care staff a calm operating picture, a two-minute child understanding, and evidence-linked recording without dashboard overload.

## Demo path

1. Login and land on Home overview.
2. Open Command Centre.
3. Show the attention queue: safeguarding, child wellbeing, open actions, evidence gaps and documents for review.
4. Search for a child.
5. Open the child page.
6. Explain the child in two minutes: identity, placement, key worker, legal status, what needs attention, what helps, contacts, safeguarding status and latest chronology.
7. Create a daily note.
8. Save the daily note.
9. Reopen the daily note or child journey and confirm the saved-state message.
10. Show the child chronology update when projected.
11. Open Documents, then Templates.
12. Search templates for "key work" and open `Key Work Session`.
13. Create a therapeutic key work/session document from the template.
14. Save the draft, reopen it, and show review/sign-off controls.
15. Search documents/templates for "Reg 44" or "safeguarding".
16. Show inspection/evidence mapping on Reg 44, Reg 45 or Annex A templates.
17. Open ORB.
18. Ask a safe operational question: "What should staff review for this child before handover?"
19. Show provider overview.
20. Explain governance, audit and replay at a high level.

## Talk track

- "IndiCare starts with what needs attention, not a wall of widgets."
- "The child page is designed for staff on shift: who this child is, what matters today, what helps, who to contact and what to do next."
- "Daily notes are the operational heartbeat. Suggestions are review prompts; staff remain in control."
- "Document OS is not a form library. Each template carries purpose, therapeutic prompts, evidence links, review expectations and operational regulatory mapping."
- "Chronology, evidence and inspection readiness are connected so records become usable evidence, not duplicated paperwork."
- "ORB supports drafting and reflection. It does not replace professional judgement."

## Current demo cautions

- Use `frontend-next` as the product UI.
- Avoid legacy `frontend` shells unless explicitly framed as retired/internal.
- If a backend route is not configured, call out the clear limitation rather than presenting fallback data as live.
- Do not claim first-class safeguarding or missing episode APIs until dedicated routers replace incident transport.
- Use Document OS for education, return home interview, behaviour support and regulatory evidence if the standalone operational workflow is not present.
- Do not present regulatory mappings as legal advice; describe them as operational evidence mapping.
