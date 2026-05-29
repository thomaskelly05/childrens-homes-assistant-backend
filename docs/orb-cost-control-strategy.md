# ORB cost control strategy (pre-billing)

## Prompt tiers

| Tier | Typical use |
|------|-------------|
| `fast` | Greetings, simple Q&A |
| `residential` | Standard practice answers |
| `deep` | Safeguarding / high-risk |
| `document` | Document intelligence |
| `action` | Action engine transforms |
| `academy_nvq` | Learning / NVQ support |

## Model routing

- **fast/simple** → cheapest text route or local template (no LLM)
- **action** → low/medium cost
- **residential** → medium
- **safeguarding / deep / complex document** → higher quality
- **deep research** → highest, daily cap
- **greetings / help** → `orb_local_response_service` templates

## Token limits

History capped by tier; `ai_cost_policy_service.max_tokens_for_prompt_tier()`; expert packet and document chunks bounded in retrieval services.

## Caching

`orb_cost_cache_service` — TTL caches for source registry, scenario family packets, citation decisions, document lens results, common help answers.

## Usage tracking

`orb_usage_events` extended in `sql/201_orb_feedback.sql` with `route`, `action_id`, `document_lens`, `prompt_tier`, `provider`. Standalone conversation routes call `record_standalone_orb_usage()`.

## Budget guards (env)

- `ORB_DAILY_SOFT_USAGE_LIMIT` / `ORB_DAILY_HARD_USAGE_LIMIT`
- `ORB_MONTHLY_SOFT_COST_LIMIT` / `ORB_MONTHLY_HARD_COST_LIMIT`
- `ORB_DEEP_RESEARCH_DAILY_LIMIT`
- `ORB_DOCUMENT_ANALYSIS_DAILY_LIMIT`

**Soft** → warning / shorter answer suggestion. **Hard** → friendly limit message. **Safeguarding** → safety template, not a dead end. Admins/founding plans may bypass via `orb_usage_budget_service.user_can_bypass()`.

## Future billing

Usage events and tiers are structured for subscription metering; billing enforcement is not required in this pass.
