# IndiCare OS Command Architecture

## Purpose

OS Command is the live operational layer for IndiCare.

It is not only a dashboard.
It is the system-wide command centre for:

- safeguarding
- risk
- missing from care
- Regulation 40
- quality assurance
- manager oversight
- workforce compliance
- Ofsted readiness
- AI-assisted operational review

The design goal is:

> Every critical action, risk, review, notification, quality concern or inspection issue should surface through OS Command.

---

# Core Concepts

## 1. Feed Items

Feed items are generated dynamically from operational records.

Examples:

- serious incident
- missing episode
- overdue risk assessment
- MAR gap
- daily note gap
- overdue supervision
- expired training
- Reg 44 action overdue
- unreviewed restraint

Feed items are temporary until captured.

---

## 2. Command Items

Once captured, a feed item becomes a tracked operational task.

Command items support:

- ownership
- decisions
- completion
- escalation
- audit
- notifications
- chronology links
- evidence references

This becomes the permanent operational audit trail.

---

## 3. SCCIF Mapping

Every command item should map to:

- children_experiences_progress
- helped_and_protected
- leadership_management

This allows the home to build live inspection evidence.

---

## 4. Regulation Mapping

Command items may reference:

- Regulation 40
- Regulation 44
- Regulation 45
- missing from care
- medication
- safeguarding
- workforce compliance

---

# Operational Domains

| Domain | Purpose |
|---|---|
| safeguarding | incidents, allegations, disclosures |
| missing_from_care | missing episodes and return-home processes |
| risk | assessments and controls |
| medication | MAR issues and medication errors |
| daily_care | daily notes, routines, welfare |
| workforce | staffing, supervision, training |
| reg40 | notifications and notifiable events |
| reg44 | independent visitor findings |
| reg45 | quality of care review |
| ofsted | inspection preparation and evidence |
| governance | approvals, audit, compliance |

---

# Assistant Integration

The AI assistant should not directly alter statutory records.

Instead:

1. assistant reads records
2. assistant identifies gaps/themes
3. assistant creates draft command items
4. human reviews and approves
5. operational actions are tracked in OS Command

This preserves:

- accountability
- safeguarding oversight
- auditability
- Ofsted defensibility

---

# Frontend Vision

OS Command should eventually support:

- live command stream
- home filters
- child filters
- escalation lanes
- manager board
- shift board
- safeguarding board
- compliance board
- AI recommendations
- chronology integration
- inspection evidence mode
- operational timeline
- notification centre

---

# Backend Responsibilities

The backend layer should:

- generate live feed items
- capture operational actions
- track decisions
- enforce permissions
- log audit history
- link evidence
- support AI-generated draft actions
- expose APIs for dashboards and mobile workflows

---

# Future Extensions

## Planned integrations

- chronology engine
- notification engine
- websocket live updates
- AI risk trend analysis
- safeguarding heatmaps
- Ofsted evidence packs
- mobile manager workflow
- rota escalation
- staff wellbeing alerts
- predictive missing-from-care analysis
- cross-home operational oversight

---

# Build Priority

1. schema and migrations
2. backend API
3. command generation rules
4. frontend board
5. permissions
6. audit/versioning
7. notifications
8. AI integration
9. inspection tooling
10. analytics and predictive intelligence
