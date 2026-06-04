# ORB Chat Speed Optimisation

## Summary

ORB chat should feel like modern assistants: **instant user feedback**, **early stream status**, **tokens before metadata**, **deferred intelligence UI**, and **non-blocking learning ledger** — without removing IndiCare Intelligence Core, quality gate, or safeguarding behaviour.

## What changed

### Backend streaming (`POST /orb/standalone/conversation/stream`)

1. SSE **`status`** events immediately (`stage: received`), then depth-specific micro-copy for residential/deep/safeguarding.
2. **Context build moved inside the generator** after the first status events (first byte no longer waits for full retrieval).
3. **`safeguarding_critical`** emits a safe opening token before provider streaming.
4. **Tokens stream before** `finalize_standalone_intelligence()`; **metadata** carries quality gate + intelligence summary.
5. **Debug timing** in `context_used.timing.debug_timing` when `ORB_CHAT_TIMING_DEBUG` or dev `ENV`.

### Intelligence Core

- **`estimate_expert_depth()`** for quick depth before full packet (status UX).
- **`general_light` fast path** when `care_relevance_score < 20`: skips domain/gap/missingness scans; keeps ORB 9 safety shell and quality preview.

### Finalisation

- Quality gate **still required** before response is complete.
- Learning ledger **try/except** — failures set `learning_ledger.recorded: false` and do not fail the user response.
- Optional **`OrbChatTimingTracker`** marks for audits.

### Static cache

- `services/orb_static_intelligence_cache.py` — process-wide JSON cache.
- `orb_missingness_graph_service` uses cache for `orb_scenario_sequences.json` (was reloading every request).

### Frontend

- Parses SSE **`status`**; shows inline + composer micro-status.
- **400ms skeleton** on empty streaming bubble.
- **Lazy-loaded** `OrbIntelligenceCorePanel` (dynamic import).
- Action chips / “What ORB checked” remain **after** streaming completes (`!streaming`).

## What is deferred (not blocking answer text)

| Feature | When user sees it |
|---------|-------------------|
| Full `indicare_intelligence_core` summary | End of stream (`metadata`) |
| Answer quality gate result | End of stream |
| Learning ledger write | After finalize (server-side) |
| What ORB checked panel | After complete; collapsed by default |
| Care-heavy action chips | After metadata on assistant message |

## What remains safety-critical / blocking

- Standalone OS boundary checks
- Safeguarding-critical opening line
- Quality gate before marking answer complete
- Quality gate answer fixes when `passed: false`
- No bypass of CSRF, auth, or plan limits

## Cached assets (static only)

- `assistant/knowledge/orb_scenario_sequences.json` (via shared cache)
- Existing per-service caches: domain map, quality standards brain, trusted sources registry

**Never cached globally:** child records, user permissions, OS-scoped data.

## Tests

- `tests/test_orb_chat_speed_contract.py`
- `tests/test_orb_streaming_early_status.py`
- `tests/test_orb_non_blocking_finalise.py`
- `tests/test_orb_static_intelligence_cache.py`
- `tests/test_orb_general_light_fast_path.py`

## How to verify locally

```bash
source .venv/bin/activate
ORB_CHAT_TIMING_DEBUG=true python -m pytest tests/test_orb_*speed* tests/test_orb_streaming* tests/test_orb_non_blocking* tests/test_orb_static* tests/test_orb_general_light* -q

cd frontend-next && npm run typecheck
```

## General_light expectations

Prompts like “What is the capital of France?” should:

- Resolve to `expert_depth: general_light`
- Avoid residential micro-status spam
- Not show heavy safeguarding/Ofsted chips unless message implies care risk

## Remaining limitations

- Non-stream `POST /conversation` still builds full context before the model call (unchanged contract).
- Provider time-to-first-token dominates for long prompts.
- Converged runtime `process_answer` may adjust final sanitised text after tokens were shown (metadata is authoritative).
