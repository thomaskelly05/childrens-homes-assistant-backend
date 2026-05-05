# IndiCare OS Frontend Layer

This folder contains the first UI/UX layer for the operational backend built in this branch.

## Design goal

The UI must make IndiCare feel like a safe operating system for children's homes, not a database.

Every screen should answer three questions:

1. What matters now?
2. What evidence supports it?
3. What action should staff take?

## Core screens

### Command Centre

Primary landing page for staff and managers.

Sections:
- Critical alerts
- Next best actions
- My tasks
- Admissions in progress
- High-risk items
- Compliance due
- AI insight card

API:
- `GET /command-centre`
- `GET /tasks/my`
- `GET /notifications/unread-count`

### Notifications Centre

Facebook-style notification badge and dropdown.

API:
- `GET /notifications/unread-count`
- `GET /notifications`
- `POST /notifications/{id}/read`
- `POST /notifications/{id}/dismiss`

### Defensible AI Assistant

Displays assistant responses using a fixed, defensible format:
- Summary
- Evidence
- Analysis
- Actions
- Safeguarding / Risk
- Recommendation

Citations such as `[incident:123]` must be clickable and open the relevant source record.

### AI Audit Log

Inspection-ready review of AI interactions.

API:
- `GET /api/ai-audit`
- `GET /api/ai-audit/{id}`

## UX principles

- Use plain British English.
- Use amber/red visual hierarchy for safeguarding and overdue risks.
- Always distinguish evidence from AI analysis.
- Never hide missing evidence.
- Make actions obvious and accountable.

## Files

- `styles/indicare-os.css` shared styles
- `components/AssistantResponseCard.jsx`
- `components/NotificationBell.jsx`
- `pages/CommandCentre.jsx`
- `pages/AiAuditLog.jsx`
- `lib/api.js`
