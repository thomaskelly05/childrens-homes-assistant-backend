# Provider AI Trust Settings

## Overview

Authorised provider leaders (admin / responsible individual) can view and update AI trust controls per provider, with optional stricter home-level overrides. Normal staff cannot change these settings.

## Safe defaults

| Control | Default |
|---------|---------|
| External AI | Off |
| Redaction | Strict |
| Prompt storage | Off |
| Transcript storage | Off |
| Premium TTS | Off |
| Report AI drafting | Off |
| Realtime voice | Off |
| Restricted decisions | Blocked always |

If the database cannot be read, the service fails closed (external AI off, strict redaction, storage off) unless `AI_EXTERNAL_PROCESSING_ENABLED` explicitly allows legacy env behaviour.

## API

### GET `/api/admin/ai-settings`

Returns `effective`, `provider_level`, `home_override`, `env_defaults`, `sources`, `warnings`, and blocked restricted features.

Query: `home_id` (optional) for home-scoped effective view.

### PATCH `/api/admin/ai-settings`

Body fields match DB columns. Include `acknowledgements` when enabling high-risk options:

| Change | Required acknowledgement flags |
|--------|-------------------------------|
| Enable external AI | `acknowledge_external_ai_processing`, `acknowledge_subprocessor_terms`, `acknowledge_human_review_required` |
| Prompt storage | `acknowledge_prompt_storage` |
| Transcript storage | `acknowledge_transcript_storage` |
| Redaction off | `acknowledge_redaction_off` |
| Premium TTS | `acknowledge_premium_tts_external_provider` |

### GET `/api/admin/ai-trust-status`

Plain-English status for dashboards.

### GET `/api/admin/ai-usage-audit`

Safe metadata only (feature, model, tokens, cost estimates, redaction flags). No raw prompts or transcripts.

## Home overrides

- Home can disable capabilities the provider enabled.
- Home cannot enable external AI, prompt storage, or transcript storage when the provider disabled them.
- Home cannot set redaction below the provider level.

## Settings audit

Each PATCH writes rows to `provider_ai_settings_audit` with `setting_key`, `previous_value`, `new_value`, `changed_by`, acknowledgement flags, and safe request metadata.

## Human review

All AI outputs remain draft-only. Enabling external AI requires explicit acknowledgement that human review is required.

## Applying migrations

```bash
psql "$DATABASE_URL" -f sql/210_provider_ai_settings.sql
psql "$DATABASE_URL" -f sql/211_ai_usage_audit.sql
```

## Frontend

Provider admins can use **Settings → AI Trust & Data Settings** at `/settings/ai-trust` in the Next.js app.
