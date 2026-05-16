# Assistant context governance

## Principle

Assistant context must be minimal, permission-aware and explainable. It must not become uncontrolled record dumping.

## Current foundation

`services/assistant_context_service.py` remains the identity, role, permission and scope normalisation point.

`services/assistant_retrieval_service.py` now adds a small operational-state context layer after retrieving scoped chronology, actions, evidence and documents. The assistant receives review indicators and queue context, not broad unfiltered source records.

`GET /os/assistant/context-brief` exposes the same operational context brief for frontend and audit review.

## Guardrails

The context brief always includes:

- highest priority operational states only
- queue summaries
- evidence relationship count
- chronology link count
- explicit guardrails that operational states are review indicators, not conclusions

## Boundaries

Standalone Assistant / ORB remains separate unless explicit context is provided. Embedded context remains route, child, home and record scoped.

## Later refactor

Legacy assistant compatibility bundles should adapt from `SharedAssistantContext` and `AssistantContextBriefDTO` instead of maintaining parallel context shapes.
