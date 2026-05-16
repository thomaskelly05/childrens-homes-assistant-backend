# DTO versioning

Shared DTOs are the platform contract between routers, services, repositories, frontend adapters, realtime events and assistant context.

Current canonical operational-state schema version:

- `2026-05-16.v1`

## Rules

- Extend shared DTOs before adding feature-specific payloads.
- Include `schema_version` on canonical operational DTOs.
- Prefer compatibility transforms at API boundaries over duplicate DTO trees.
- Keep raw legacy fields only as adapter inputs, not as new canonical output.
- Add validation tests for critical DTOs before changing frontend adapters.

## Compatibility transforms

Compatibility transforms should:

- normalize snake_case and camelCase aliases once
- normalize lifecycle statuses once
- remove blank IDs from link arrays
- dedupe repeated IDs
- fail closed for missing required identifiers

## Future architecture

Add versioned DTO modules for chronology, evidence, inspection, assistant context, operational queues and provider governance. Frontend adapters should render from versioned DTOs rather than `Record<string, any>` shapes.
