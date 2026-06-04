# ORB Chat Speed Audit

**Date:** 2026-06-04  
**Scope:** `POST /orb/standalone/conversation`, `POST /orb/standalone/conversation/stream`, IndiCare Intelligence Core, ORB Premium frontend (`frontend-next/components/orb-standalone/`)

## Phase 0 — Build state

| Check | Result |
|-------|--------|
| `frontend-next/next.config.ts` → `typescript.ignoreBuildErrors` | **Not present** (no temporary TS bypass) |
| `eslint.ignoreDuringBuilds` | `true` (lint only; documented in config comment) |

TypeScript should be validated with `cd frontend-next && npm run typecheck` before release.

## What was slow (before)

1. **Stream route blocked before first byte** — `_build_standalone_request_context()` (retrieval + full Intelligence Core packet) ran before the SSE generator started, so the client saw nothing until retrieval + framing finished.
2. **Heavy Intelligence Core on every prompt** — general knowledge questions still ran domain map matching, gap detection, missingness graph (including **per-request JSON load** of `orb_scenario_sequences.json`), and quality-standard scans.
3. **Finalisation on the critical path** — quality gate and learning ledger ran before `metadata` SSE; ledger failures could theoretically break finalize (now isolated).
4. **Frontend** — intelligence panel and action chips were already deferred until `!streaming`, but no backend status events, no 400ms skeleton, micro-status used mode heuristics only.

## Routes audited

| Route | Intelligence Core | Quality gate | Learning ledger | Streaming |
|-------|-------------------|--------------|-----------------|-----------|
| `POST /orb/standalone/conversation` | Yes (`prepare_request_bundle`) | Yes (`finalize_standalone_intelligence`) | Yes (non-fatal on error) | N/A |
| `POST /orb/standalone/conversation/stream` | Yes (after early `status`) | Yes (before `metadata` event) | Yes (non-fatal on error) | SSE `status` → `token` → `metadata` → `done` |

## Services touched

- `services/indicare_intelligence_core_service.py` — `estimate_expert_depth()`, `general_light` fast path
- `services/indicare_intelligence_route_finalize_service.py` — timing marks, safe ledger errors
- `services/orb_knowledge_retrieval_service.py` — unchanged contract; benefits from lighter Core packet
- `services/orb_missingness_graph_service.py` — cached scenario sequences
- `services/orb_static_intelligence_cache.py` — shared static JSON cache
- `services/orb_chat_timing_service.py` — debug timing metadata
- `services/orb_stream_status_service.py` — SSE status copy by depth
- `routers/orb_standalone_routes.py` — stream generator reordering

## Frontend components

- `orb-care-companion.tsx` — optimistic send, stream `onStatus`, depth hint, composer clear
- `orb-assistant-message.tsx` — skeleton (400ms), inline stream status, lazy intelligence panel
- `orb-intelligence-micro-status.tsx` — backend status line override
- `standalone-client.ts` / `standalone-sse-parser.ts` — `status` SSE events
- `indicare-intelligence-core.ts` — depth-specific micro-status copy

## Timing instrumentation (debug only)

When `ORB_CHAT_TIMING_DEBUG=true` or `ENV=development`, `context_used.timing.debug_timing` may include:

- `request_received_ms`, `core_start_ms`, `core_complete_ms`, `model_start_ms`, `first_token_ms`
- `stream_complete_ms`, `finalise_start_ms`, `quality_gate_complete_ms`, `ledger_complete_ms`, `response_sent_ms`

Not shown in normal user UI. Use browser `[orb-timing]` logs in development.

## What still blocks first token (by design)

| Step | Blocking? | Notes |
|------|-----------|--------|
| Auth / CSRF / plan limits | Yes | Security & billing |
| Safeguarding opening token | Yes (critical only) | Immediate safe text before model stream |
| Provider TTFT | Yes | External model latency |
| Quality gate | No (before metadata only) | After tokens streamed |
| Learning ledger | No | After answer; errors logged only |
| Full retrieval bundle | Partially | Runs after first `status` in stream route |

## Remaining risks

- Agent/document paths may still chunk full answers before SSE tokens (pre-existing).
- Very large prompts on `deep` tier remain slow by design.
- `shared_institutional_cognition_runtime` still runs for non-`fast` tiers inside context build.

See `docs/orb-chat-speed-optimisation.md` for the change log and operational notes.
