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

All intended AI egress flows through `services/ai_gateway_service.py`, which runs a **privacy
decision**, **redaction**, **cost governance**, and **usage recording** before the call.
**VERIFIED** — `services/ai_gateway_service.py:1-50` (E16); cost soft limits and "invoices
are the source of truth" at `:25-29` (E17). Data classification is applied via
`schemas/data_protection.py` `DataClassification` (E16; cross-ref O5 §2).

**Critical open question (UNVERIFIED).** Whether the gateway is the **sole** egress to OpenAI
— i.e. that no call bypasses governance — was **not** proven in Phase 1 (`open-questions.md`
§E). This is the single most important verification task for this standard, because privacy
redaction, cost metering, and boundary enforcement all depend on it.

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
| Gateway sole-egress unproven | UNVERIFIED (open-questions §E) | Blocks claims that all AI traffic is governed/metered/redacted. |
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
- It does **not** claim all AI egress is currently governed; sole-egress is UNVERIFIED.
- It does **not** claim memory is tenancy-safe or retention-compliant; those are unverified.
- It does **not** claim provider independence today; the platform is OpenAI-dependent.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. Covers prompt / memory / model-routing governance as planned. |
