# Demo year data

`scripts/seed_demo_year.py` creates a synthetic full year of IndiCare OS demonstration records.

## Safety controls

- Requires `DEMO_MODE=true`.
- Refuses to run when `APP_ENV`, `ENV` or `NODE_ENV` is `production`.
- Requires `ALLOW_DEMO_SEED=true` for writes.
- Reset requires `DEMO_RESET_CONFIRM=RESET_DEMO_DATA`.
- Writes to `public.demo_year_seed_records` with `demo=true`, `synthetic=true` and a seed version.
- Uses `.local`/demo identifiers and avoids real people.

## Commands

Dry run:

`DEMO_MODE=true python scripts/seed_demo_year.py --dry-run`

Apply:

`DEMO_MODE=true ALLOW_DEMO_SEED=true python scripts/seed_demo_year.py`

Reset and re-apply:

`DEMO_MODE=true ALLOW_DEMO_SEED=true DEMO_RESET_CONFIRM=RESET_DEMO_DATA python scripts/seed_demo_year.py --reset`

## Coverage

The generated year includes:

- 1 provider, 2 homes, 5 young people and 10 staff/adults.
- Daily recording across 12 months.
- Incidents, safeguarding, missing episodes, health/medication, education, keywork and actions.
- Documents, reports, regulatory/SCCIF mappings, chronology records and Orb/assistant sample conversations.
- Positive progress, setbacks, staff support, child voice and management oversight.

The seed is designed for demonstration and pilot understanding. It is not production data and must not be used to represent real children or staff.
