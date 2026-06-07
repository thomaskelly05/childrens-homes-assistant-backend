# Router Consolidation Sprint 1 — Diagnostic Baseline

Sprint 1 is diagnostic only. It does not delete routers, remove names from `ROUTER_GROUPS`, change public paths, change required routers, or change include behaviour.

## Goal

Separate expected retired compatibility gaps from genuinely unexpected missing optional routers during startup reporting, without changing what loads.

## What changed

### `RETIRED_COMPATIBILITY_ROUTERS`

`core/router_loader.py` now declares a frozen registry of 61 legacy router module names that remain listed in `ROUTER_GROUPS` but are intentionally absent from the codebase. These names were already skipped at startup as optional missing modules; sprint 1 only classifies them explicitly.

The registry covers legacy assistant, voice, OS command, governance, workforce, academy manager, document, and daily-notes surfaces that have been consolidated elsewhere.

### Startup reporting

When an optional router module is missing:

- Names in `RETIRED_COMPATIBILITY_ROUTERS` are recorded in `skipped_retired_compatibility` and logged at **info** as retired compatibility skips.
- Other missing optional modules are recorded in `skipped_unexpected_optional` and logged at **warning** as unexpected missing optional routers.

`skipped_optional` still contains the combined list so existing callers keep the same shape and counts.

### New accessors

- `get_skipped_retired_compatibility_routers()`
- `get_skipped_unexpected_optional_routers()`

`get_router_registry_summary()` now also exposes:

- `retired_compatibility_router_registry_count`
- `skipped_retired_compatibility_router_count`
- `skipped_unexpected_optional_router_count`

## Acceptance checks

After startup (with the LifeEcho patch applied, as in production):

| Check | Expected |
|-------|----------|
| Loaded router count | 148 |
| Skipped optional routers | 61 (all retired) |
| Skipped unexpected optional routers | 0 |
| Failed routers | 0 |
| Missing required routers | 0 |

## Out of scope for sprint 1

- Removing router names from `ROUTER_GROUPS`
- Deleting or merging router modules
- Changing route paths or mount order
- Promoting or demoting required routers

## Follow-on sprints

Use the retired registry and unexpected-missing signal to plan safe removals or re-homes. Any router that appears in `skipped_unexpected_optional` should be investigated before registry cleanup.
