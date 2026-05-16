# Chronology Projection Architecture

Canonical service: `services/chronology_projection_service.py`

Chronology views should derive from replayable `ChronologyProjection` DTOs instead of merging live chronology, workflow, audit, and evidence records in each UI or assistant path.

## Projection inputs

- `chronology_snapshot_history`
- `operational_lifecycle_history`
- `operational_audit_timeline`
- `governance_signoff_history`
- `evidence_relationship_history`

## Projection support

- Child chronology
- Staff chronology
- Safeguarding chronology
- Inspection chronology
- Governance chronology
- Evidence chronology
- Operational-state chronology
- Signoff chronology

## Linked data

Each projection carries linked evidence, operational states, lifecycle events, governance reviews, inspections, signoffs, source event IDs, and replay cursor.

## API

- `GET /api/operational-memory/chronology`

## Migration rule

Frontend and assistant chronology consumers should adopt canonical projections before adding new timeline renderers.
