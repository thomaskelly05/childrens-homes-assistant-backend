# IndiCare demo operational proof runbook

Date: 2026-05-17

Purpose: make the next demo readiness work testable without adding more feature drift. This runbook converts the current product/design audit into concrete acceptance checks for a client-ready walkthrough.

## CTO principle

The next phase is not to add more surfaces. The next phase is to prove that the surfaces already built are real, wired, calm, and operationally useful.

A demo is only ready when a provider can watch the system complete core workflows without hidden setup, console errors, duplicated panels, or uncertainty about whether data is live.

## Demo readiness definition

IndiCare is demo-ready when these statements are true:

1. A user can log in with a known demo account.
2. The Command Centre clearly shows what needs attention.
3. A user can understand a child within two minutes of opening their page.
4. A daily note can be created, saved, reopened, and seen in chronology.
5. An incident can be created, saved, reopened, and seen in chronology.
6. A safeguarding record can be created, saved, reopened, and seen in operational attention.
7. A document/template can be opened, created, saved, reviewed, and found again.
8. Search can find children, records, documents, chronology, evidence, and staff where data exists.
9. Inspection readiness shows real evidence or honest empty states.
10. ORB/assistant opens safely and does not confuse standalone assistant with in-shell assistant.
11. Provider oversight shows provider-safe queues without cross-provider leakage.
12. Mobile navigation is usable.
13. Keyboard navigation works for core workflows.
14. Browser console is clean for the demo path.
15. No live page relies on hidden demo/synthetic operational data unless explicitly in demo mode.

## Required demo seed data

Create or verify deterministic seed data for one provider, one home, staff users, and at least two young people.

### Provider

- Provider name: Demo Residential Provider
- At least one provider admin / RI-style user
- At least one registered manager user
- At least one staff user
- Provider AI governance settings available
- Provider oversight queue has at least one resolved and one open item

### Home

- Home name: Demo House
- Active children: at least two
- Staff on duty: at least two if roster data exists
- Inspection readiness has a mix of complete, missing, stale, and review-required evidence

### Young person A

Use this child for the main demo path.

Required data:

- profile summary
- age/date of birth
- placement status
- key worker
- legal status if available
- communication needs
- sensory needs
- what helps
- known triggers
- support strategies
- key contacts
- recent daily note
- recent incident
- recent safeguarding record or follow-up
- recent positive chronology item
- at least one linked document/evidence item

### Young person B

Use this child to prove search and provider/home overview work.

Required data:

- profile summary
- one recent record
- one document
- one chronology item

## Workflow proof matrix

Each workflow must be tested manually in browser and, where possible, covered by automated tests.

| Workflow | Create | Save | Reopen | Edit | Chronology update | Operational memory/replay | Searchable | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Daily note | Required | Required | Required | If supported | Required | Required where supported | Required | Not fully browser-proven locally |
| Incident | Required | Required | Required | If supported | Required | Required where supported | Required | Needs browser proof |
| Safeguarding record | Required | Required | Required | If supported | Required | Required where supported | Required | Needs browser proof |
| Missing episode | Required | Required | Required | If supported | Required | Required where supported | Required | Needs browser proof |
| Health record | Required | Required | Required | If supported | Optional | Optional | Required | Needs browser proof |
| Education record | Required | Required | Required | If supported | Optional | Optional | Required | Needs browser proof |
| Document/template | Required | Required | Required | If supported | Optional | Required if evidence-linked | Required | Needs browser proof |

## Browser acceptance path

Run this exact path before any client demo.

1. Start backend and frontend with demo seed data applied.
2. Log in as provider admin.
3. Open Command Centre.
4. Confirm there is one clear attention queue, not duplicated dashboards.
5. Search for the demo child.
6. Open the child page.
7. Confirm the page answers within two minutes:
   - who is this child?
   - what matters today?
   - what helps them?
   - what risks exist?
   - who are the key contacts?
   - what happened recently?
8. Add a daily note.
9. Save it.
10. Reopen it from records.
11. Confirm it appears in chronology where appropriate.
12. Search for it.
13. Add or open an incident.
14. Confirm operational attention updates where appropriate.
15. Open documents.
16. Open a template or existing document.
17. Search for a document/evidence item.
18. Open inspection readiness.
19. Confirm evidence is real or empty states are honest.
20. Open ORB/in-shell assistant.
21. Ask a child-context operational question.
22. Confirm the assistant response is cautious, evidence-aware, and not overconfident.
23. Open provider oversight.
24. Confirm provider-level queues are scoped and understandable.
25. Switch to mobile viewport.
26. Confirm navigation and primary workflows remain usable.
27. Use keyboard navigation through the key path.
28. Confirm no console errors on the demo path.

## Frontend consolidation acceptance criteria

A page is considered migrated to canonical operational UI only when:

- it uses shared timeline/queue/evidence/lifecycle primitives where available;
- it does not render the same operational item twice;
- it does not use fake operational data outside explicit demo mode;
- it has clear loading, empty, error, and access-denied states;
- it uses British English;
- it uses calm, child-centred wording;
- it works on mobile;
- it supports keyboard navigation;
- it does not rely on UnknownRecord-style rendering for critical operational views.

## Design acceptance criteria

The product should feel calm and premium, not sparse or decorative.

Each primary page should have:

1. One clear heading.
2. One plain-English purpose sentence.
3. One primary action.
4. One attention area.
5. Main content grouped by meaning, not by database table.
6. Supporting detail behind links, panels, or secondary sections.

Avoid:

- large grids of equal-weight boxes;
- repeated cards showing the same information;
- too many competing alert colours;
- unexplained technical language;
- hidden primary actions;
- fake demo values on live views;
- AI-first language where operational language is clearer.

## Immediate next engineering tasks

1. Add or fix deterministic base schema/demo seed setup for local demo use.
2. Prove browser create/save/reopen for daily notes using a real session.
3. Prove browser create/save/reopen for incidents and safeguarding records.
4. Wire document templates to visible create/open/review/search paths where backend exists.
5. Migrate Command Centre, child overview, chronology, documents, safeguarding, inspection, governance and provider pages onto canonical operational primitives.
6. Remove duplicate timeline/card renderers once canonical primitives cover those views.
7. Remove or gate any remaining live/demo blending.
8. Add Playwright or equivalent browser tests for the demo path when feasible.

## Do not proceed to client demo until

- daily note browser proof passes;
- document search proof passes;
- child two-minute page proof passes;
- Command Centre has no duplicated attention panels;
- provider oversight has real scoped data or honest empty state;
- no console errors appear on the demo route;
- mobile demo path is usable;
- demo seed is repeatable.
