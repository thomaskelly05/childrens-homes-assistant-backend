# 01 — NR-1 Remediation Report

| Field | Value |
|---|---|
| Risk | NR-1: AI egress is not yet enforced through a single governed chokepoint |
| Owner | AI Safety Owner (Tom Kelly, interim) + Engineering Owner |
| Status after this work | **PARTIALLY RESOLVED** |
| Branch | `fix/nr-1-egress-governance` |
| Environment caveat | App dependencies (fastapi/openai) and a database are **not** available here, so the app and full pytest suite were **not** run. Verification was done with dependency-free static analysis and standalone execution of the stdlib-only guard logic. |

## What was found (VERIFIED)

A dependency-free AST audit (`scripts/ai_egress_audit.py`) enumerated **22 egress sites
across 9 files**. Classification:

| Path | Classification |
|---|---|
| `services/openai_header_sanitisation.py:205,211` | Approved client factory (only place raw clients may be built) |
| `services/ai_gateway_service.py:134,197` | Governed (privacy decision + redaction + cost + usage) |
| `services/ai_external_call_governance.py:319,320,382,384` | Governed (embeddings, transcription) |
| `assistant/llm_provider.py:230,271` | Governed (primary chat path; pre-egress decision+redaction, post-egress usage audit) |
| `services/ai_providers/openai_provider.py:59,61,126,128` | Approved adapter — **governance caller-dependent** (not enforced at the adapter) |
| `services/orb_voice_tts_service.py:352,354` | **Was a raw direct `OpenAI()` egress** — the NR-1 hotspot |
| `assistant/streaming.py:92,93` | Governed legacy path (allow-listed; not a live route) |
| `scripts/generate_orb_scenario_variants.py:28,41` | Script/tooling |
| `tests/test_openai_header_sanitisation.py` | Test |

**VERIFIED, additionally:** the repository already had two egress-guard tests
(`tests/test_no_direct_external_ai_bypass.py`, `tests/test_no_remaining_direct_ai_bypass.py`)
that were **failing on `main`** — they flagged `services/orb_voice_tts_service.py` (raw egress)
and `services/openai_header_sanitisation.py` (the factory, missing from the allow-list). These
guards are not run by CI (the only workflow is the ORB scenario gate), so the failures were
latent. (Confirmed by running the guard logic standalone.)

## What was fixed (VERIFIED here, statically)

1. **ORB Voice TTS converged to the sanitised client factory.**
   `services/orb_voice_tts_service.py` no longer constructs a raw `OpenAI(...)`; it uses
   `create_sync_openai_client(...)` — the single approved client path. This removes the only
   raw, request-reachable direct egress.
2. **Egress guard allow-list corrected.** Added the sanitised factory to the governed
   allow-list in `tests/test_no_direct_external_ai_bypass.py`. With (1), the pre-existing
   guard tests now **pass** (verified standalone).
3. **New runnable guard.** `scripts/ai_egress_audit.py` (stdlib-only) enforces: no raw client
   outside the factory; inference calls only in approved modules. `tests/test_ai_egress_audit_guard.py`
   wraps it for CI. Verified: `python3 scripts/ai_egress_audit.py` exits 0.
4. **Approved-egress documentation:** `docs/ai-egress-approved-modules.md`.

Verification run in this environment: `py_compile` OK; `ruff` clean; audit guard exit 0; the
two pre-existing bypass guard tests and the new guard test pass when executed standalone.
(Full pytest/app run not possible here.)

## What remains OPEN (honest — why NR-1 is not RESOLVED)

These are behavioural changes to **working/shared or opt-in routes** that **cannot be
runtime-verified** in this environment; shipping them blind would risk breaking live routes
(contrary to E1/E3 and the founder's instruction). They are specified for a follow-up with a
test-capable environment.

1. **Provider-adapter chokepoint enforcement (primary remaining item).**
   `services/ai_providers/openai_provider.py` (via `services/ai_model_router_service.py`) does
   not itself call `evaluate_external_call` / `redact_chat_messages` / `record_model_usage`;
   governance depends on each caller (e.g. `orb_operational_assistant_service.py:213` applies a
   privacy guard, others may not). **Proposed fix:** enforce governance inside the adapter or
   the router's `complete_with_routing`, deriving scope from the request/metadata, failing
   safe (block) when not allowed. **Risk:** the feature-allowlist gate
   (`ai_privacy_decision_service.py:122`) can block flows whose feature is not allow-listed —
   must be validated against live provider settings before enabling.
2. **Full TTS privacy-decision gating.** TTS now uses the sanitised client but does **not** yet
   apply `evaluate_external_call` / redaction / usage with proper scope (the synth layer has no
   provider/home/user context). **Proposed fix:** gate at the TTS routes
   (`routers/orb_voice_tts_routes.py`, `services/orb_voice_v2_service.py`) where `current_user`
   exists. TTS is opt-in (`ORB_TTS_ENABLED=false` by default) with input-length caps, which
   limits current exposure.
3. **CI enforcement.** Wire `scripts/ai_egress_audit.py` (and the guard tests) into CI; today
   the suite is not CI-gated (E6).

## Status determination

**PARTIALLY RESOLVED.** The raw/unmanaged direct egress (TTS) is eliminated and a runnable
guard now prevents new direct calls; the repo's own (previously failing) guards are green. But
governance is **not yet enforced at a single chokepoint** — the adapter path remains
caller-dependent and TTS lacks full privacy-decision gating. **Until those are done and
re-verified in a test-capable environment, the constitutional rule stands: IndiCare
Intelligence must not publicly claim that all AI egress is governed.**
