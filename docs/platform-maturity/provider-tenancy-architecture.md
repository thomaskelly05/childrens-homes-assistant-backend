# Provider tenancy architecture

Provider readiness depends on explicit scope boundaries across homes, users, queues, audit, assistant context and realtime events.

## Canonical context

Provider-aware services should resolve one trusted context before accessing data:

- provider ID
- allowed home IDs
- active home ID, when selected
- canonical staff role
- permission set
- provider-level visibility flags

This context must come from authenticated session or token data, not client-supplied headers.

## Boundaries

- Home-scoped records remain isolated by default.
- Provider-level users may aggregate across homes only through provider-aware repository methods.
- Provider dashboards should use backend aggregated projections rather than frontend fan-out over homes.
- Assistant and ORB context must carry provider/home scope and permission-filtered source metadata.

## Future architecture

Create a provider context helper consumed by RBAC, repositories, operational queues, audit replay, realtime replay and assistant retrieval. Single-home behaviour should be represented as provider context with one allowed home.
