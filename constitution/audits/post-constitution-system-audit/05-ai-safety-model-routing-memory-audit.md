# 05 — AI Safety, Model Routing & Memory Audit (against A1, A2)

## Findings

**1. AI safety boundaries — aligned (VERIFIED), live robustness unverified.**
- 14 boundaries appended + style-overriding (`assistant/ai_boundaries.py:3-60`); citation
  enforcement (`assistant/citation_enforcer.py`), answer quality (`assistant/answer_quality.py`).
- Route-layer prompt-injection defence: `routers/assistant_routes.py:18`
  (`contains_prompt_injection_attempt` from `services/assistant_security.py`).
- **UNVERIFIED:** jailbreak/hallucination resistance against live models (tests exist but were
  not executed; no deps).

**2. Provider lock & strict mode — aligned (VERIFIED).**
- `assistant/llm_provider.py:22` (`APPROVED_LLM_PROVIDERS = {"openai"}`); `render.yaml`
  `AI_PROVIDER_STRICT=true`, default `gpt-4o-mini`. Single-provider dependency is deliberate
  (model-independence is FUTURE VISION; `docs/indicare-model-independence-roadmap.md`).

**3. Governed egress — partially aligned (VERIFIED + OPEN NR-1).**
- Primary chat path governed: `assistant/llm_provider.py` `stream_chat` (`:366` decision,
  `:378` redaction pre-egress; `:416` usage post-egress audit). Gateway governed
  (`services/ai_gateway_service.py:197`). Embeddings/transcription governed.
- **OPEN (NR-1):** adapter path caller-dependent; TTS not yet privacy-gated. See report 01.

**4. Model routing — aligned in structure (VERIFIED existence).**
- `assistant/mode_detector.py`, `assistant/modes.py`, `assistant/prompt_router.py`,
  `assistant/response_planner.build_response_plan` → `ModelPlan` (used by
  `assistant/orchestrator.py`). Routing *logic depth* not fully read (INFERRED).

**5. Prompt governance — aligned (VERIFIED).**
- Centralised: `assistant/prompts.py`, `assistant/prompt_router.py`, `services/ai_prompts.py`,
  `services/orb_prompt_registry.py`, `services/assistant_prompt_policy.py`. Grounded in the 9
  Ofsted Quality Standards + primary-source guidance (`assistant/prompts.py:14-90`).

**6. Memory — requires verification (UNVERIFIED).**
- Surfaces exist: `assistant/memory.py`, `routers/assistant_memory_routes.py`,
  `routers/ai_memory_routes.py`; operational memory per ADR-0004. **UNVERIFIED:** retention,
  deletion, and **tenancy isolation** of memory (must not leak across homes/providers) were
  not read in depth. This is a priority verification item (privacy + safeguarding relevant).

**7. Cost governance — partially aligned (VERIFIED).**
- Gateway soft limits (`services/ai_gateway_service.py:25-29`: £5/day, 12k tokens), low-cost
  default model, monthly usage report. Coverage of all egress depends on NR-1.

## Verdict
**Partially aligned.** Strong, specific AI-safety and prompt governance; deliberate provider
lock; structured routing. Requires remediation/verification: NR-1 egress enforcement, memory
tenancy/retention, and live-model adversarial/hallucination testing. No overclaim of jailbreak
resistance is made.
