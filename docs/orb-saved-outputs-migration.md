# ORB saved outputs — canonical schema migration

## Problem

`sql/075_orb_saved_outputs.sql` and `sql/200_orb_residential_premium.sql` both reference `orb_saved_outputs` with incompatible shapes. The runtime service expects the rich standalone schema **with** `user_id`.

## Canonical migration

Apply after base user tables exist:

```bash
psql "$DATABASE_URL" -f sql/207_orb_saved_outputs_canonical.sql
```

## Behaviour

- Adds `user_id` and missing rich columns when upgrading from 075.
- Detects 200 premium shape (`workflow`, `output_type`, numeric `id`) and rebuilds into canonical text-id table.
- Legacy `tags TEXT[]` (200 shape) is copied into temporary `tags_jsonb` before canonical rebuild — never assigns JSONB into the legacy `TEXT[]` column.
- Rows without `user_id` are moved to `orb_saved_outputs_orphaned` (not served by the API).

## Verification

- `GET /orb/system/health` → `checks.saved_outputs_schema`
- `services/orb_schema_verification.verify_saved_outputs_schema()`

## Service contract

All saved-output operations require `user_id`. Queries always include `WHERE user_id = :user_id`. In-memory fallback is keyed per user.
