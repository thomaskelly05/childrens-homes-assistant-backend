# ORB Residential safety acceptance gate

## Context

Google OAuth login for ORB Residential is working end-to-end. After a successful OAuth handoff, authenticated users with an active trial were blocked by the safety acceptance gate instead of entering ORB.

The front-door verdict correctly returned `safety_required` for users who had not yet accepted ORB Residential safety statements. The frontend, however, rendered a generic retry screen (`Try again` / `Back to sign in`) instead of the required safety acceptance UI.

## Fix

When `GET /orb/front-door/verdict` returns `safety_required` for an authenticated user (for example `access_state=trial_active`), the ORB auth gate now renders a dedicated safety acceptance screen:

- **Title:** Before using ORB Residential
- **Intro:** ORB supports residential childcare professionals, but it does not replace professional judgement, safeguarding procedures, managers, emergency services or legal advice.
- **Four required checkbox statements** covering guidance limits, safeguarding escalation, output review, and the ORB Residential / IndiCare OS boundary.
- **Primary CTA:** Accept and continue
- **Secondary:** Back to sign in (intentional logout)

After acceptance:

1. `POST /orb/standalone/safety/accept` records ORB Residential acceptance (`product=orb_residential`, versioned).
2. The front-door verdict cache is cleared and re-fetched.
3. The user enters `/orb` without being sent back to login or MFA.

## Backend endpoint

Existing endpoint used (no bypass):

- `POST /orb/standalone/safety/accept`
- Persists to `orb_safety_acceptances` via `record_orb_safety_acceptance` in `db/orb_subscription_db.py`

Front-door verdict states remain:

- `unauthenticated`
- `inactive` (billing / subscription required)
- `safety_required`
- `ready`
- `retry`

## Safety preserved

- Safety acceptance is **not** bypassed.
- Safeguarding disclaimers are shown in full before product access.
- Auth, billing, Google OAuth, and the ORB Residential / OS boundary were not changed.

## Tests run

Backend:

```bash
python -m pytest tests/test_orb_launch_routes.py tests/test_orb_front_door_verdict_serialization.py tests/test_orb_safety_acceptance_flow.py -q
```

Frontend:

```bash
cd frontend-next
npm run typecheck
npm run build
node --experimental-strip-types --test components/orb-residential/orb-safety-acceptance.test.ts
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run e2e:orb-auth
```

## Acceptance criteria

- Google login lands on safety acceptance when required
- Safety statements are visible with four checkboxes
- User can accept and continue into ORB
- No login loop after acceptance
- No MFA loop introduced
- Safety requirement preserved
