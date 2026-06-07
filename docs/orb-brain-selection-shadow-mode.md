# ORB brain selection — shadow mode

Shadow mode runs `orb_brain_selection_service` on every ORB Residential request **without changing live routing**. It collects evidence on how the unified Quick / Standard / Deep tier would behave compared to today's `prompt_tier` and `expert_depth` systems.

## Purpose

Before replacing parallel tier classifiers with a single brain selection entry point, we need real usage data on:

- How often the selected tier agrees with live `prompt_tier`
- How often it agrees with live `expert_depth`
- Where safeguarding or recording queries would be routed differently
- Confidence and reason distribution across modes and routes

Shadow mode is measurement only. Live prompts, models, retrieval packs, shared cognition skips, and intelligence packets are unchanged.

## What runs

For each ORB Residential request, the shadow hook:

1. Calls `orb_brain_selection_service.select_brain(prompt, mode=..., attachments=..., agent_type=...)`
2. Compares the result to the **live** values already chosen by existing services
3. Logs tier, confidence, reason, and agreement flags at INFO
4. Attaches a `brain_selection_shadow` block to `context_used`

## Wired routes

| Route | Surface | Notes |
|-------|---------|-------|
| `POST /orb/standalone/conversation` | `standalone_orb` | Sync chat |
| `POST /orb/standalone/conversation/stream` | `standalone_orb` | SSE stream (metadata event) |
| `POST /orb/residential/conversation` | `orb_residential` | Premium wrapper |
| `POST /orb/standalone/agents/run` | `orb_standalone` | Specialist agents (`agent_type` passed) |
| `POST /orb/standalone/agents/deep-research` | `orb_standalone` | Deep research agent |

Implementation: `services/orb_brain_selection_shadow_service.py`, invoked from route orchestration and agent services.

## `context_used.brain_selection_shadow`

```json
{
  "shadow_mode": true,
  "tier": "standard",
  "confidence": 0.88,
  "reason": "Recording or wording support — Standard tier with retrieval and grounding.",
  "recommended_route": "conversation",
  "selected_prompt_tier": "residential",
  "selected_expert_depth": "residential_standard",
  "selected_agent_depth": "standard",
  "live_prompt_tier": "residential",
  "live_expert_depth": "residential_standard",
  "live_unified_tier_from_prompt_tier": "standard",
  "live_unified_tier_from_expert_depth": "standard",
  "agrees_with_prompt_tier": true,
  "agrees_with_expert_depth": true,
  "agrees_with_unified_tier_from_prompt_tier": true,
  "agrees_with_unified_tier_from_expert_depth": true,
  "signals": { "...": "classification intents and legacy signals" }
}
```

### Comparison fields

| Field | Meaning |
|-------|---------|
| `tier` | Unified Quick / Standard / Deep recommendation |
| `selected_prompt_tier` | Legacy mapping from brain selection (`fast` / `residential` / `deep`) |
| `selected_expert_depth` | Legacy mapping from brain selection |
| `live_prompt_tier` | Value used for live retrieval and model routing |
| `live_expert_depth` | Value used for live intelligence packet depth |
| `agrees_with_prompt_tier` | Exact match: `selected_prompt_tier == live_prompt_tier` |
| `agrees_with_expert_depth` | Exact match: `selected_expert_depth == live_expert_depth` |
| `agrees_with_unified_tier_from_prompt_tier` | Unified tier vs mapping of live `prompt_tier` |
| `agrees_with_unified_tier_from_expert_depth` | Unified tier vs mapping of live `expert_depth` |

Unified mappings:

| Live `prompt_tier` | Unified tier |
|--------------------|--------------|
| `fast` | `quick` |
| `residential` | `standard` |
| `deep` | `deep` |

| Live `expert_depth` | Unified tier |
|---------------------|--------------|
| `general_light` | `quick` |
| `residential_light`, `residential_standard` | `standard` |
| `residential_deep`, `safeguarding_critical` | `deep` |

## Logging

Structured INFO log line prefix: `orb_brain_selection_shadow`

Fields: `route`, `tier`, `confidence`, `reason`, `live_prompt_tier`, `live_expert_depth`, agreement flags.

Use log aggregation to build disagreement dashboards before enabling `ORB_BRAIN_SELECTION_ENABLED` for live routing.

## What is **not** changed

- `orb_knowledge_retrieval_service.resolve_prompt_tier` — still drives retrieval packs and fast-path skips
- `indicare_intelligence_core_service` — still builds intelligence packets from live `expert_depth`
- `ai_model_router_service` — still uses live `prompt_tier`
- Agent orchestrator depth and specialist RAG paths
- Stream status sequences and fast opening tokens

## Next steps (after evidence collection)

1. Analyse shadow disagreement rate by route and mode (Phase 1 in `docs/orb-speed-optimisation-plan.md`)
2. Tune brain selection rules where systematic mismatches are acceptable
3. Introduce `ORB_BRAIN_SELECTION_ENABLED` for canary routing (5% traffic)
4. Dedupe `prepare_request_bundle()` once brain selection owns classification

## Related docs

- `docs/orb-intelligence-routing-audit.md` — three parallel tier systems
- `docs/orb-speed-optimisation-plan.md` — Q1 shadow mode quick win
- `services/orb_brain_selection_service.py` — selection rules and legacy mapping
- `tests/test_orb_brain_selection_shadow_service.py` — shadow comparison tests
