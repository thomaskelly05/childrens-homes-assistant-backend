# ORB Residential production migrations

Apply these SQL migrations to the Render production PostgreSQL database **before** enabling ORB Residential paid access at `/orb`. Missing migrations are a common cause of `/orb/standalone/conversation` failures (`psycopg2.errors.InFailedSqlTransaction` or `UndefinedTable` in access checks).

## Migration order

Run in this exact order against the production database:

| Order | File | Purpose |
|------:|------|---------|
| 1 | `sql/200_orb_residential_premium.sql` | Core ORB Residential product tables: trials, usage events, saved projects/outputs, user preferences |
| 2 | `sql/201_orb_feedback.sql` | Answer feedback and extended usage telemetry columns |
| 3 | `sql/202_orb_improvement_candidates.sql` | Feedback review trail and improvement candidate queue |
| 4 | `sql/203_orb_residential_subscriptions.sql` | Stripe subscription spine and safety acceptances |
| 5 | `sql/204_orb_stripe_events.sql` | Idempotent Stripe webhook event log |
| 6 | `sql/205_orb_oauth_accounts.sql` | OAuth provider account linkage for ORB Residential sign-in |

## What each migration creates

### 200 — `orb_residential_premium`

- `orb_trials` — 7-day trial tracking per user
- `orb_usage_events` — conversation and workflow usage metering
- `orb_saved_projects` — user-owned project folders
- `orb_saved_outputs` — saved answers and artefacts
- `orb_user_preferences` — onboarding profile and preferences

### 201 — `orb_feedback`

- `orb_feedback` — thumbs up/down and structured feedback on answers
- Additional columns on `orb_usage_events` for route, action, document lens, prompt tier, provider

### 202 — `orb_improvement_candidates`

- Review columns on `orb_feedback` (`reviewed`, `reviewed_by`, etc.)
- `orb_improvement_candidates` — admin-reviewed improvement proposals

### 203 — `orb_residential_subscriptions`

- `orb_subscriptions` — Stripe customer/subscription state for £9.99/month ORB Residential
- `orb_safety_acceptances` — required safety statement acceptance per product version

### 204 — `orb_stripe_events`

- `orb_stripe_events` — deduplicated Stripe webhook processing

### 205 — `orb_oauth_accounts`

- `orb_oauth_accounts` — Google/Microsoft/Apple OAuth linkage for ORB Residential users

## How to apply on Render

From a shell with `DATABASE_URL` set to the production connection string:

```bash
export DATABASE_URL='postgresql://…'   # Render external connection string

for f in \
  sql/200_orb_residential_premium.sql \
  sql/201_orb_feedback.sql \
  sql/202_orb_improvement_candidates.sql \
  sql/203_orb_residential_subscriptions.sql \
  sql/204_orb_stripe_events.sql \
  sql/205_orb_oauth_accounts.sql
do
  echo "Applying $f …"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Migrations use `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` where possible, so re-running is generally safe. Always take a backup before applying to production.

## Verify tables and columns exist

After applying, confirm the ORB Residential spine is present:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'orb_trials',
    'orb_usage_events',
    'orb_saved_projects',
    'orb_saved_outputs',
    'orb_user_preferences',
    'orb_feedback',
    'orb_improvement_candidates',
    'orb_subscriptions',
    'orb_safety_acceptances',
    'orb_stripe_events',
    'orb_oauth_accounts'
  )
ORDER BY table_name;
```

Expect **11 rows**. Also verify safety acceptance is queryable:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orb_subscriptions'
ORDER BY ordinal_position;
```

Quick access-state smoke check (replace `:user_id`):

```sql
SELECT 1 FROM orb_subscriptions WHERE user_id = :user_id LIMIT 1;
SELECT 1 FROM orb_safety_acceptances WHERE user_id = :user_id LIMIT 1;
SELECT 1 FROM orb_trials WHERE user_id = :user_id LIMIT 1;
SELECT 1 FROM orb_user_preferences WHERE user_id = :user_id LIMIT 1;
```

## Warning — missing migrations and `/orb/standalone/conversation`

If migrations **200–203** are not applied, ORB Residential access checks may fail when reading:

- `orb_subscriptions` / `orb_safety_acceptances` (203)
- `orb_user_preferences` / `orb_trials` (200)

The application rolls back failed transactions and returns a controlled access-denied or 503 response rather than crashing, but users will not be able to use premium conversation features until migrations are applied.

Symptoms in Render logs:

- `relation "orb_user_preferences" does not exist`
- `relation "orb_subscriptions" does not exist`
- `InFailedSqlTransaction: current transaction is aborted`

**Fix:** apply migrations 200–203 (minimum) in order, then redeploy or retry the request.

## Related documentation

- [ORB Residential billing](./orb-residential-billing.md)
- [ORB auth and payments convergence](./orb-auth-and-payments-convergence.md)
- [ORB data safety and privacy](./orb-data-safety-and-privacy.md)

## Application code references

Access state is loaded via:

- `db/orb_residential_db.py` — `get_orb_access_state()`
- `db/orb_subscription_db.py` — subscription and safety acceptance reads
- `services/orb_access_service.py` — commercial access decisions
- `auth/orb_standalone_premium_dependency.py` — premium gate for `/orb/standalone/*`

There is no automatic migration runner in the deploy pipeline; migrations must be applied manually to the production database.
