# Platform operational integrity audit

This audit records the consolidation target for IndiCare OS. It does not
introduce new product workflows. It standardises how existing systems are
classified, wired and validated.

## Strategic architecture

- Next.js is the primary operational shell.
- Legacy HTML is compatibility-only.
- Daily notes remain the Child Journey OS workflow gold standard.
- Workforce supervision remains the Workforce OS workflow gold standard.
- Governance and Reg 44/45 flows remain governance reference implementations.
- Operational memory, chronology projection and evidence graph are the
  canonical intelligence read models.
- ORB is the operational reasoning layer, not a lifecycle authority.

## Standard contracts added

- `services.intelligence.chronology_engine` wraps `ChronologyWriter` and
  `ChronologyProjectionService`.
- `services.intelligence.orb_context_engine` wraps shared assistant context and
  standard ORB explainability requirements.
- `services.intelligence.document_operational_engine` promotes templates and
  documents to operational entity contracts.
- `services.intelligence.event_bus.operational_event_bus` maps domain
  propagation plans onto the existing realtime event bus.
- `services.intelligence.operational_graph.linkage_engine` formalises entity
  linkage without introducing a graph database.
- `services.platform_operational_integrity_service` exposes the full integrity
  matrix through `/api/admin/os-wiring/integrity`.

## Integrity matrix domains

The matrix validates workflow, chronology, ORB, evidence, reports, alerts and
dashboard coverage for:

- children
- workforce
- governance
- inspection
- safeguarding
- chronology
- documents
- templates
- academy
- reports
- ORB
- alerts
- actions/tasks
- provider oversight
- realtime/event systems

## Known unfinished areas

- Academy remains legacy-shell only.
- Document sign-off is not consistently persisted into append-only memory for
  every document source.
- Some report lifecycle compatibility endpoints remain unavailable stubs.
- Assistant route duplication remains mounted while consumers migrate.
- Multiple chronology read paths remain active during projection migration.

## Next maturity phase

The next phase is consumer convergence:

- Migrate report and assistant reads to chronology projection and evidence graph.
- Wire academy workbook/training events into workforce chronology and governance
  evidence.
- Collapse duplicate assistant handlers onto the shared ORB context engine.
- Add writeback integration tests for save to memory to chronology to ORB/report
  retrieval.
- Move academy into the Next.js operational shell.

