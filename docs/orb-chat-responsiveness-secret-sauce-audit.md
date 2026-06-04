# ORB Chat Responsiveness + Product Secrecy — Audit

Date: 2026-06-04  
Scope: Standalone ORB conversation stream (`/orb/standalone/conversation/stream`) and `frontend-next` residential chat UI.

## Executive summary

ORB felt slow because the **first useful token** waited on full request context build (retrieval, shared cognition, framing) and model time-to-first-token. The UI also exposed **internal intelligence field names** in the “What ORB checked” panel and status copy.

## Latency path (before changes)

| Stage | Typical blocking? | User-visible? |
|-------|-------------------|---------------|
| `received` status | No | Yes — immediate |
| `estimate_expert_depth` | Light | No |
| Residential status sequence | No | Yes — after depth estimate |
| `_build_standalone_request_context` | **Yes** — retrieval, cognition, framing | No |
| Safeguarding-only fast opening | Partial | Only `safeguarding_critical` |
| `stream_answer` first model token | **Yes** — provider latency | Yes — first answer text |
| `finalize_standalone_intelligence` | Post-stream | Metadata only |

**First useful token** previously waited on context build + model unless safeguarding_critical (generic opening only).

**First token vs metadata:** Stream tokens are emitted before `finalize_standalone_intelligence`; metadata (including intelligence summary) arrives in the final `metadata` SSE event. Normal UI must not render raw internal keys from that payload.

## Files audited

| Area | File | Finding |
|------|------|---------|
| Route | `routers/orb_standalone_routes.py` | Status early; context build blocked first answer; limited fast opening |
| Core | `services/indicare_intelligence_core_service.py` | Full packet always built; required for depth/quality |
| Finalize | `services/indicare_intelligence_route_finalize_service.py` | Quality gate + learning ledger post-answer; summary exposed internal keys to UI |
| Retrieval | `services/orb_knowledge_retrieval_service.py` | Grounding block adds latency before stream |
| Expert engine | `services/orb_expert_answer_engine_service.py` | Depth preserved via retrieval bundle |
| Orchestrator | `services/orb_expert_brain_orchestrator_service.py` | Unchanged — still active in packet |
| Quality gate | `services/orb_answer_quality_gate_service.py` | Still runs at finalize — not removed |
| Chat UI | `frontend-next/components/orb-standalone/orb-care-companion.tsx` | SSE handler; showed `expert_depth` for micro-status routing |
| Message UI | `frontend-next/components/orb-standalone/orb-assistant-message.tsx` | Rendered intelligence panel with internal labels |
| Panel | `frontend-next/components/orb-standalone/orb-intelligence-core-panel.tsx` | “What ORB checked” + Depth/Care relevance/Quality gate chips |
| Micro status | `frontend-next/components/orb-standalone/orb-intelligence-micro-status.tsx` | Rotating backend messages |
| Types/helpers | `frontend-next/lib/orb/indicare-intelligence-core.ts` | Exposed internal fields to components |
| SSE | `frontend-next/lib/orb/standalone-sse-parser.ts` | Pass-through status including `expert_depth` (logic only) |

## UI leakage (before)

- Panel title: **What ORB checked**
- Chips: Expert depth, Care relevance, Quality Standards, Professional lenses, Registered home domains, Source basis, Quality gate
- Manager drawer: active_intelligence_layers, composite_score
- Stream status: “Checking recording gaps…”, technical tone

## Developer / debug gating (before)

- `isOrbDeveloperMode()` existed (`frontend-next/lib/orb/orb-developer-mode.ts`) but technical intelligence UI was tied to **manager role**, not developer mode.

## What can be hidden from normal users

All raw backend identifiers while keeping logic:

- `expert_depth`, `care_relevance_score`, layers, domains, lens hits, quality gate scores, missingness graph, route finaliser, learning ledger, expert_brain_9, indicare_intelligence_core packet internals.

Staff instead see: **Response support** plain chips, plain progress labels, and practical action chips.

## Recommended changes (implemented in companion doc)

1. Emit **scenario-based fast opening** immediately after depth estimate (before context build).
2. Align **user-facing status labels** to plain English.
3. Add `response_support` plain chips in API summary.
4. Redesign panel → **Response support**; technical drawer **developer mode only**.
5. Preserve full stream, quality gate, learning ledger, expert brain.

See `docs/orb-chat-responsiveness-secret-sauce.md` for implementation detail.
