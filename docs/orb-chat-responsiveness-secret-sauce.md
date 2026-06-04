# ORB Chat Responsiveness + Product Secrecy

## What was made faster

1. **Fast opening tokens** — After quick `expert_depth` estimate and status events, ORB streams a safe, practical first sentence *before* full retrieval/context build completes (`services/orb_fast_opening_service.py`).
2. **Earlier status** — `received` + depth-appropriate status still emit immediately.
3. **Plain working labels** — `services/orb_stream_status_service.py` uses staff-facing copy only.

Full model streaming is unchanged: fast opening is **prepended**, not a replacement.

## How fast openings work

- `estimate_expert_depth()` runs on the raw message (cheap).
- `fast_opening_for_message()` matches safeguarding/residential scenarios (e.g. missing/cannabis, “don’t care”, allegation, self-harm, restraint).
- If matched (or depth is `residential_standard` / `residential_deep` / `safeguarding_critical`), a conservative opening is sent as an SSE `token` event.
- `_build_standalone_request_context()` and `stream_answer()` then run as before.

### Examples

| Prompt | Fast opening (first visible text) |
|--------|-----------------------------------|
| Missing + cannabis | Physically safe, calm approach, no blame/interrogation |
| “Doesn’t care” | Communication not attitude; calm 1:1 |
| Allegation | Listen, reassure, no secrecy promise |
| Self-harm | Immediate safety / medical need |
| Restraint | Everyone safe; record necessity/proportionality |

## What remains safety-blocking

- Full retrieval and expert framing still run before the model answer body.
- **Quality gate** still runs in `finalize_standalone_intelligence` before metadata is sent.
- Safeguarding openings are conservative; they do not skip escalation/recording content in the full answer.

## Full answer depth preserved

- No prompt tier reduction.
- Expert answer engine metadata still attached when active.
- Quality gate and learning ledger unchanged.
- Finalize still merges intelligence into `context_used` for logic/chips.

## Internal metadata hidden

Still present in API `context_used` for routing/chips but **not shown** to normal staff:

`expert_depth`, `care_relevance_score`, `active_intelligence_layers`, `registered_home_domains`, `quality_standard_hits`, `professional_lens_hits`, `quality_gate` internals, missingness graph, route finaliser, learning ledger, expert_brain_9, etc.

## What staff see instead

| Internal | Staff-facing |
|----------|----------------|
| What ORB checked | **Response support** (collapsed) |
| Quality gate | Response reviewed (chip) |
| Expert depth | (hidden; developer: “Response type (internal)”) |
| Layers/domains | Plain chips: Safety considered, Recording points included, … |
| Stream status | Preparing guidance… / Checking the safest next steps… |

## Managers / RIs

- Same plain **Response support** chips.
- May see **missing evidence** gap labels (still plain language, not field names).
- No raw backend identifiers unless developer mode.

## Developers

- Enable: `localStorage` key `orb-developer-mode` = `1` or `NEXT_PUBLIC_ORB_DEVELOPER_MODE=1`.
- **Technical details** drawer on Response support panel shows internal depth, scores, layers.

## Tests added

- `tests/test_orb_fast_opening_stream.py`
- `tests/test_orb_secret_sauce_hidden.py`
- `tests/test_orb_response_support_panel.py`
- `tests/test_orb_full_answer_depth_preserved.py`
- `tests/test_orb_user_facing_status_labels.py`

## Build / typecheck

Run:

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_fast_opening_stream.py tests/test_orb_secret_sauce_hidden.py tests/test_orb_response_support_panel.py tests/test_orb_full_answer_depth_preserved.py tests/test_orb_user_facing_status_labels.py tests/test_orb_streaming_early_status.py -q

cd frontend-next && npm run typecheck
```

## Remaining limitations

- Fast opening uses **quick depth estimate**; rare mismatch if full retrieval classifies differently.
- `general_light` has no fast opening (by design — should stay fast end-to-end).
- Duplicate thematic content possible if model repeats opening themes (acceptable for perceived speed).
- Non-stream POST `/conversation` path unchanged (stream is primary UX).
