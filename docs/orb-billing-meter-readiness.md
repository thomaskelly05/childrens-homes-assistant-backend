# ORB billing meter readiness

## Purpose

Prepare standalone ORB usage data for future £9.99/month subscription limits and Stripe billing — without implementing full payment flow in this PR.

## User meter

`GET /orb/standalone/billing/meter` (premium standalone access)

Returns for the **current user only**:

- Period bounds (calendar month)
- Request counts by prompt tier (fast, residential, deep, document, action, academy_nvq, deep_research)
- Estimated cost and tokens
- Plan name and limit summary
- `soft_limit_reached` / `hard_limit_reached`

## Admin usage

`GET /orb/admin/billing/usage?days=30`

Returns platform summary:

- Active users, total requests, estimated cost
- Top cost users, routes, actions
- Prompt tier split, daily trend
- Budget warnings

## Data model

Source: `orb_usage_events`

Key fields: `user_id`, `event_type`, `prompt_tier`, `action_id`, `document_lens`, `route`, `provider`, `tokens_in`, `tokens_out`, `estimated_cost`, `created_at`.

Recording: `record_standalone_orb_usage()` after standalone conversations/actions.

## Plan limits

Configured in `services/orb_plan_limits_service.py`:

- `orb_residential_individual` (£9.99 fair-use defaults)
- `founding_plan`
- `admin`
- `enterprise` (future provider)

Limits are env-overridable per plan prefix.

## Future Stripe integration

Existing OS Stripe routes live in `routers/billing_routes.py`. Next PR should:

1. Map Stripe subscription status → `plan_name`
2. Enforce meter limits at request time (soft warnings, hard safety caps)
3. Expose usage in ORB settings for subscribers
4. Keep safeguarding exception: safety guidance when hard limit reached on high-risk messages

## Fallback

If `orb_usage_events` migration is not applied, meter services return empty/zero stats safely — they do not block ORB chat.
