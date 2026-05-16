# Provider Operational Orchestration

Canonical service: `services/provider_operational_queue_service.py`

Provider orchestration now derives operational queues from replayable memory events instead of relying only on caller-supplied in-memory records.

## Queue categories

- Safeguarding escalations
- Unresolved lifecycle states
- Unresolved reviews
- Stale evidence
- Chronology gaps
- Overdue signoffs
- Unresolved inspections
- Governance backlog
- Workforce compliance gaps

## APIs

- `GET /api/provider/oversight`
- `GET /api/provider/operational-queues`
- `GET /api/operational-memory/provider-queues`

## Trust guarantees

- Provider/home scoping uses `ProviderContext`.
- Queue items carry chronology, lifecycle, evidence, governance, inspection, and replay cursor links.
- Replay integrity is returned with provider queue overviews.

## Remaining work

Legacy `operational_queue_items` still uses textual scope. A future migration should add first-class `provider_id` and `home_id` columns.
