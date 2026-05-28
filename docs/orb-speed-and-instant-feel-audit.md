# ORB Speed and Instant-Feel Audit

**Route:** `/orb` (`OrbCareCompanion`) · **Date:** 2026-05-28

This document records the end-to-end request path, bottlenecks found, quick wins shipped in this pass, and recommended next work. Safety is not traded for speed on high-risk residential topics.

---

## 1. Current response path

### Frontend (`orb-care-companion.tsx`)

1. User submits → composer clears immediately; user bubble + thinking placeholder appended to local workspace (`standalone-local-store.ts`).
2. `pending` set after optimistic UI commit (not before).
3. `queryStandaloneOrbConversation` → `POST /orb/standalone/conversation` with `AbortSignal`.
4. On response: thinking placeholder → streaming assistant bubble (`streamTextIntoView` — **client-side** reveal of full answer, not SSE).
5. Optional TTS if voice replies enabled.
6. Dev timing via `logOrbTiming` when `NODE_ENV=development` or `localStorage orb-cognition-debug=1`.

### Backend (`routers/orb_standalone_routes.py`)

1. Premium auth gate.
2. **Single** `prepare_request_bundle()` — classify once, tier (`fast` | `residential` | `deep`), packs + grounding.
3. Tiered `_build_framed_message()` — omits heavy blocks on fast path; skips full shared cognition build on fast path.
4. `orb_converged_general_assistant_service` (default) or `orb_general_assistant_service` → retrieval + LLM.
5. Answer sanitise, citations, explainability; `context_used.timing` metadata appended.

### Converged runtime (`orb_converged_general_assistant_service.py`)

- Fast tier: minimal convergence prompt block (no full residential spine injection).
- Residential/deep: full `build_prompt_block` + quality checks.

---

## 2. Likely bottlenecks found

| Bottleneck | Impact | Mitigation in this pass |
|------------|--------|-------------------------|
| Duplicate `classify_query` / `retrieve_sources` / `build_grounding_context` per request | High pre-LLM latency | `prepare_request_bundle()` |
| Full `STANDALONE_ORB_*` prompt blocks on every message | Large prompt, slower TTFT | Tiered `_build_framed_message` |
| `shared_institutional_cognition_runtime.build_context` on simple chats | Heavy cognition stack | Skipped on `fast` tier |
| Converged service full spine on all messages | Double prompt weight | Fast-path minimal block |
| `retrieve_preview` + assistant `prepare_retrieval` | Duplicate retrieval | Route uses bundle packs |
| Client waits for full HTTP response before any assistant text | Perceived slowness | Instant thinking UI; client stream reveal |
| No true SSE/token streaming | No first token until complete | Documented as P0 next build |

---

## 3. Quick wins implemented (this pass)

- **Tiered prompts:** `fast` | `residential` | `deep` via `resolve_prompt_tier()`.
- **Request bundle:** one classification/retrieval pass per conversation request.
- **Timing metadata:** `context_used.timing` (backend) + `logOrbTiming` (frontend dev).
- **Stop generating:** `AbortController` on fetch + stream; composer Stop button; `stopped` message status.
- **Instant composer:** clear input/attachments before `pending`; user + thinking messages before network.
- **Suggested reply chips:** six ORB-native follow-ups under latest completed answer.
- **Ask about this:** attachment chips after image user messages.
- **Read aloud:** Speak on last answer; Copy + Read aloud on older answers (hover row).

---

## 4. Remaining bottlenecks

- **No backend streaming** — largest gap for “ChatGPT instant” feel.
- **LLM latency** — dominates wall-clock after prompt trim.
- **Client-side stream simulation** — still waits for full JSON body.
- **Converged + general assistant** may still run RAG/agent paths for some queries.
- **localStorage workspace write** on every message change (debounce candidate).

---

## 5. Streaming status

| Layer | Status |
|-------|--------|
| Backend SSE / chunked tokens | **Not implemented** |
| Frontend token renderer | **Not implemented** |
| Client `streamTextIntoView` after full answer | **Implemented** (perceived typing only) |
| Stop mid-stream | **Implemented** (abort fetch + partial keep) |

---

## 6. Abort / stop status

| Action | Status |
|--------|--------|
| Abort in-flight `fetch` | Done — `requestAbortRef` |
| Abort client stream reveal | Done — `streamAbortRef` |
| Composer Stop control | Done — `data-orb-composer-stop-generating` |
| Partial answer preserved | Done — `stopped` status + partial text |
| Backend cancel provider job | Not implemented (provider APIs vary) |

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

1. **True streaming route** — `POST /orb/standalone/conversation/stream` (SSE), provider streaming, frontend incremental markdown.
2. **Defer non-critical metadata** — append citations/explainability after first tokens.
3. **Cache static sections** — operating brain summaries, product boundary strings.
4. **Debounce workspace persistence** — reduce main-thread localStorage cost.
5. **Parallelise** — profile block build while user types (already local).
6. **Provider routing** — fast model for `fast` tier where governance allows.

---

## 9. Risks if over-optimised

- Skipping safeguarding grounding on misclassified “short” messages.
- Over-trimming citations on regulatory answers.
- Hiding explainability that staff rely on for professional judgement.
- Caching stale knowledge spine version after deploy.

**Rule:** Never downgrade `deep` tier for high-risk vocabulary or Safeguarding modes.

---

## 10. Exact next recommended PR

**Title:** ORB true streaming + first-token metadata

**Scope:**

- Backend: streaming endpoint wrapping existing tiered prompt + provider stream.
- Frontend: replace wait-then-`streamTextIntoView` with SSE consumer; keep Stop/abort.
- Tests: route contract, abort mid-stream, safeguarding tier still `deep`.
