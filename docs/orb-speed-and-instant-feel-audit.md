# ORB Speed and Instant-Feel Audit

**Route:** `/orb` (`OrbCareCompanion`) · **Date:** 2026-05-28 (updated for true streaming)

This document records the end-to-end request path, bottlenecks found, quick wins shipped, streaming status, and recommended next work. Safety is not traded for speed on high-risk residential topics.

---

## 1. Current response path

### Frontend (`orb-care-companion.tsx`)

1. User submits → composer clears immediately; user bubble + thinking placeholder appended.
2. Thinking placeholder is replaced with an empty **streaming** assistant bubble before the network call.
3. Primary transport: `sendStandaloneOrbMessageStream()` → `POST /orb/standalone/conversation/stream` (SSE `event: token`).
4. Tokens append to the assistant bubble as they arrive; **Stop** aborts via `AbortController`.
5. On `event: metadata`, citations/explainability/timing are applied; message status becomes `complete`.
6. **Fallback:** if streaming fails before any token, `POST /orb/standalone/conversation` runs and `streamTextIntoView` reveals the full answer (simulated typing only on fallback).
7. Dev timing via `logOrbTiming` when `NODE_ENV=development` or `localStorage orb-cognition-debug=1`.

### Backend (`routers/orb_standalone_routes.py`)

1. Premium auth gate (`require_standalone_orb_access`).
2. OS ID rejection (`child_id`, `staff_id`, `home_id`, `record_id`, `chronology_id`, …).
3. Single `prepare_request_bundle()` — classify once, tier (`fast` | `residential` | `deep`), packs + grounding.
4. Tiered `_build_framed_message()` — same logic as non-streaming route.
5. `stream_answer()` on converged or general assistant → provider token stream when available.
6. SSE: `token` → `metadata` → `done` (or `error`).
7. `context_used.timing` includes `first_token_ms`, `provider_elapsed_ms`, `total_elapsed_ms`, `prompt_tier`, provider/model.

### Converged runtime (`orb_converged_general_assistant_service.py`)

- Same tiered prompt behaviour as non-streaming.
- Fast tier: minimal convergence block.
- Residential/deep: full spine + quality processing on final answer.

---

## 2. Streaming endpoint status

| Item | Status |
|------|--------|
| `POST /orb/standalone/conversation/stream` | **Implemented** (SSE) |
| `POST /orb/standalone/conversation` | **Kept** (non-streaming) |
| Premium ORB dependency | **Same** as conversation |
| Standalone OS boundary / no live records | **Preserved** |
| Tiered prompts (fast / residential / deep) | **Shared** `_build_standalone_request_context()` |
| OpenAI provider token streaming | **Implemented** (`openai_provider.stream`) |
| Mock provider streaming | **Chunked** mock text |
| Agent / document paths without live stream | **Chunked** final answer (honest fallback) |
| Frontend true token UI | **Implemented** |
| Frontend fallback to POST | **Before first token only** |

---

## 3. First-token behaviour

- **Backend:** `first_token_ms` measured from route start to first yielded SSE token.
- **Frontend:** assistant bubble visible before fetch; first token updates content immediately (no wait for full HTTP body).
- **High-risk / safeguarding:** `resolve_prompt_tier()` still forces **deep**; streaming does not use a “fast” shortcut for those prompts.

---

## 4. Fallback behaviour

| Scenario | Behaviour |
|----------|-----------|
| Stream HTTP/parse failure, no tokens yet | Non-streaming `POST /conversation` + client `streamTextIntoView` |
| Stream error after partial tokens | Partial answer kept; subtle note if `error_detail` present |
| User Stop | Abort fetch; partial kept; `stopped` status |
| Provider unavailable mid-stream | `event: error` with `provider_unavailable` |
| OpenAI unavailable | Router may fall back to mock or chunked complete response |

---

## 5. Remaining provider limitations

- **Agent auto-run** and **document analysis** paths still produce the full answer first, then emit **chunked** SSE tokens (not true provider streaming for those branches).
- **Converged `process_answer`** may adjust the final sanitised text after tokens were shown; metadata `answer` is authoritative at end of stream.
- **Backend cancel in-flight provider jobs** on client disconnect is not implemented (provider APIs vary).
- **Deferring citations/explainability** until after first token is only partially realised (metadata still sent in one block at end).

---

## 6. Abort / stop status

| Action | Status |
|--------|--------|
| Abort in-flight stream `fetch` | Done — `streamAbortRef` |
| Composer Stop control | Done |
| Partial answer preserved | Done — `stopped` or partial + note |
| Backend cancel provider job | Not implemented |

---

## 7. Prompt-size strategy

| Tier | When | Injected |
|------|------|----------|
| **fast** | Short general/greeting; no specialist intent | Identity, boundaries, minimal grounding, mode hint |
| **residential** | Recording, Ofsted, therapeutic, manager modes, practice topics | Capabilities, shared cognition, clipped spine (≤3 modules), brain block |
| **deep** | Safeguarding Thinking, high-risk terms | Full blocks, operating brain prose, up to 8 spine modules |

High-risk topics always resolve to **deep** regardless of length.

---

## 8. Recommended next speed work (priority order)

1. **Stream agent/document paths** with provider streaming where safe, or progressive section emit.
2. **Defer non-critical metadata** — send citations/explainability in a trailing SSE event after answer text stabilises.
3. **Cache static prompt sections** — operating brain summaries, product boundary strings.
4. **Debounce workspace persistence** — reduce main-thread localStorage cost.
5. **Backend disconnect cancellation** — stop provider jobs when the client aborts.
6. **Provider routing** — fast model for `fast` tier where governance allows.

---

## 9. Risks if over-optimised

- Skipping safeguarding grounding on misclassified “short” messages.
- Over-trimming citations on regulatory answers.
- Hiding explainability that staff rely on for professional judgement.
- Caching stale knowledge spine version after deploy.

**Rule:** Never downgrade `deep` tier for high-risk vocabulary or Safeguarding modes.

---

## 10. Canonical routes

- UI: `/orb` only (no second ORB UI).
- Standalone conversation: `POST /orb/standalone/conversation`
- Standalone streaming: `POST /orb/standalone/conversation/stream`
