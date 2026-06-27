# A2 — Model, Provider, Prompt, Memory & Routing Governance

| Field | Value |
|---|---|
| Document ID | A2 |
| Layer | L4 — AI / Model Standards |
| Version | 0.1 — Phase 2 Batch 3 draft |
| Status | **Drafted — awaiting founder review. Not yet ratified.** |
| Owner | AI Safety Owner (Tom Kelly, interim) |
| Reads with | `A1` (AI Safety), `O5` (Privacy, binding), `O3` (Commercial cost) |
| Evidence base | `constitution/phase-1-discovery/` |

This standard governs the **prompt, memory, and model-routing** layer the founder named for
Batch 3: which models/providers are used, how AI requests are routed, how memory is handled,
and how data is governed on the way to a model. It supports the Privacy Charter (O5, binding)
and the Commercial standard (O3), and **makes no claim of guaranteed safety or compliance**.

---

## Named Risk — NR-1: AI egress is not yet enforced through a single governed chokepoint

**Status: OPEN — high-priority pre-launch remediation. Constitutional named risk.**
**Owner:** AI Safety Owner (Tom Kelly, interim), with Engineering Owner. **Raised:** 2026-06-26
(founder decision). **Evidence:** gateway sole-egress verification, `constitution/phase-1-discovery/`
+ Batch 3 read-only repository scan.

**Statement of risk.** AI/provider egress is **not** currently enforced through one mandatory
governance checkpoint. Governance is **split across more than one module**
(`services/ai_gateway_service.py` *and* `services/ai_external_call_governance.py`, the latter
used by `assistant/llm_provider.py`), and **at least one request-reachable AI path does not
yet demonstrate mandatory privacy / redaction / cost / safety governance before provider
egress.**

**What is governed (VERIFIED).**
- The **primary chat path** — `services/ai_service.generate_ai_stream` →
  `assistant/llm_provider.py` `stream_chat` (`:349`) — applies `evaluate_external_call` →
  `redact_chat_messages` → `record_model_usage` before `chat.completions.create` (`:271`).
- The **named gateway** `services/ai_gateway_service.py` (`:197`) applies privacy decision,
  redaction, cost, and usage.
- **Embeddings** (`ai_external_call_governance.py:320`) and **transcriptions** (`:384`) redact
  inputs within the governance module.

**What is not proven / uneven (the risk).**
- **OpenAI provider adapter path — UNCLEAR/uneven.** `services/ai_providers/openai_provider.py`
  (`:61`, `:128`), reached via `services/ai_model_router_service.py` from request-path services
  (`orb_action_engine_service`, `orb_operational_assistant_service`,
  `orb_brain_convergence_orchestrator_service`), applies **no** `evaluate_external_call` /
  `redact_chat_messages` at the adapter or router. Redaction appears to depend on **caller
  discipline** (e.g. `orb_operational_assistant_service.py:213` references
  `privacy_guard.redaction_applied`), not on an enforced gate.
- **ORB Voice TTS — raw direct egress.** `services/orb_voice_tts_service.py:354` constructs a
  **raw** `OpenAI(api_key=…)` (bypassing even the sanitised client factory) and sends
  `input=text` with no governance call visible.
- **Possible dead code.** `assistant/streaming.py` (`run_chat_stream`, `:93`) is governed but
  has **no importers** found; status unclear.

**Constitutional consequence.** **IndiCare Intelligence must not publicly claim that "all AI
egress is governed"** until this is fixed or formally re-verified. That claim is **not
currently supportable**. This is recorded as a **high-priority pre-launch remediation item,
especially before any live provider use involving real child, staff, home, or safeguarding
information.**

**Remediation options (DOCUMENTED, NOT IMPLEMENTED — no code changed by this constitution).**
1. Route the provider adapter path (`ai_providers/openai_provider.py` via
   `ai_model_router_service`) through mandatory `evaluate_external_call` / redaction / usage
   governance.
2. Route ORB Voice TTS through the same governed egress layer, **or** document a formally
   approved exception with strict input limits.
3. Confirm whether `assistant/streaming.py` is dead code and remove or justify it in a
   **separate code-change proposal** (not part of this constitution work).
4. Add a CI/test guard that fails if new direct OpenAI/provider calls are introduced outside
   approved governance modules (see E6).
5. Re-run the sole-egress verification after fixes; only then may NR-1 move from OPEN/risk
   toward VERIFIED.

Cross-referenced by: A1 (§5), E2 (§4a), E6 (§4 future verification control).

---

## 1. Provider governance (VERIFIED)

- **Provider lock:** approved providers are restricted to OpenAI, with a comment reserving
  future approved adapters. **VERIFIED** — `assistant/llm_provider.py:22`
  (`APPROVED_LLM_PROVIDERS = frozenset({"openai"})`) — evidence E15.
- **Strict provider mode in production:** `AI_PROVIDER_STRICT=true`,
  `AI_DEFAULT_PROVIDER=openai`. **VERIFIED** — `render.yaml`.
- **Default model:** `gpt-4o-mini` (low cost). **VERIFIED** — `render.yaml`, `.env.example`,
  `services/ai_gateway_service.py:23` (E14).

---

## 2. Governed egress (VERIFIED)

Governed AI egress is provided by **two** modules — `services/ai_gateway_service.py` and
`services/ai_external_call_governance.py` (the latter used by `assistant/llm_provider.py`) —
each running a **privacy decision**, **redaction**, **cost/usage** governance before the call.
**VERIFIED** — `services/ai_gateway_service.py:1-50,197` (E16); cost soft limits and "invoices
are the source of truth" at `:25-29` (E17); `assistant/llm_provider.py:349,366,378,416`. Data
classification is applied via `schemas/data_protection.py` `DataClassification` (E16; cross-ref
O5 §2).

**This is governance across two modules, not a single chokepoint, and not all paths are
covered — see Named Risk NR-1 above.** The earlier framing that "all intended AI egress flows
through the gateway" is **not** accurate: the primary chat path is governed via
`ai_external_call_governance` + `llm_provider`, the named gateway is a separate governed path,
and the provider-adapter and TTS paths are uneven/direct. Whether egress is enforced through a
single checkpoint is **UNVERIFIED and recorded as named risk NR-1** (`open-questions.md` §E).

---

## 3. Model routing (VERIFIED — implemented)

AI requests are routed by intent/mode and mapped to a model plan: `assistant/mode_detector.py`,
`assistant/modes.py`, `assistant/prompt_router.py`, and a `ModelPlan` produced by
`assistant/response_planner.build_response_plan` (used by `assistant/orchestrator.py`).
**VERIFIED** — `assistant/orchestrator.py:1-55` and the module listing. Depth of routing logic
not fully read (Medium confidence).

---

## 4. Prompt governance (cross-reference A1)

Prompt construction governance is defined in A1 §2 (centralised registries, sector grounding,
safeguarding block, banned determinations). A2 adds: prompt size and context payloads are a
**cost and privacy** concern — large/duplicated context must be avoided (O3 cost-aware AI;
O5 data minimisation) and only scoped, classified data may enter a prompt to an external
model (O5).

---

## 5. Memory governance (VERIFIED existence; behaviour not fully read)

- Memory surfaces exist: `assistant/memory.py`, `routers.assistant_memory_routes`,
  `routers.ai_memory_routes`, and "operational memory" per ADR-0004. **VERIFIED (existence)**
  (E38 for the ADR; listings for the modules).
- **Governance requirements:** memory is personal data and inherits O5 (classification,
  retention, deletion/export, minimisation) and the tenancy isolation of E2/`provider_context`.
  Memory must not leak across homes/providers (cross-ref O4 §6 Q4).
- **Honest limit:** memory persistence rules, retention, and tenancy enforcement were **not**
  fully read in Phase 1 (`open-questions.md` — memory implementation UNVERIFIED).

---

## 6. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| **AI egress not enforced through a single governed chokepoint (Named Risk NR-1)** | OPEN — high-priority pre-launch risk | See NR-1 above. Governance split across two modules; adapter and TTS paths uneven/direct. Blocks any claim that all AI egress is governed. |
| Memory retention & tenancy enforcement unverified | UNVERIFIED | Inherits O5/E2; not read in depth. |
| Single-provider dependency (OpenAI) | VERIFIED (E15) | Deliberate; model-independence is Future Vision. |
| Provider-side no-training configuration | OUT OF SCOPE / UNVERIFIED | Lives with the provider (O5). |

---

## 7. Current State vs Future Vision

**Current State (VERIFIED).** A governed AI path exists: OpenAI-locked, strict-provider in
production, low-cost default model, a gateway running privacy/redaction/cost/usage, typed data
classification, intent-based routing, and memory surfaces. Gateway-sole-egress and memory
governance completeness are unverified; the platform depends on a single provider.

**Future Vision (NOT YET BUILT).** Proven sole-egress; verified memory retention/tenancy; the
model-independence roadmap (`docs/indicare-model-independence-roadmap.md`) realised so a second
approved provider can be added without changing call sites; per-feature cost transparency (O3).

---

## 8. What this standard does not claim
- It does **not** claim all AI egress is currently governed. Per **Named Risk NR-1**, egress is
  not enforced through a single chokepoint and the claim "all AI egress is governed" is **not
  currently supportable**.
- It does **not** claim memory is tenancy-safe or retention-compliant; those are unverified.
- It does **not** claim provider independence today; the platform is OpenAI-dependent.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. Covers prompt / memory / model-routing governance as planned. |
| 0.2 | 2026-06-26 | Drafted (Batch 3 amendment) | Added **Named Risk NR-1** (AI egress not enforced through a single governed chokepoint) per founder decision, with documented (not implemented) remediation options; corrected §2 to reflect two-module governance and uneven adapter/TTS paths. Still awaiting founder review; not ratified. |
