# ORB Onboarding Flow

Route: `/orb/onboarding`

## Trigger

- First ORB login after signup
- Missing safety acceptance
- Incomplete onboarding preferences

## Steps

1. **About you** — display name, role (incl. NVQ assessor/learner)
2. **Your setting** — service type, age range, common needs
3. **How ORB should help** — answer length, tone, defaults
4. **Safety and data** — acceptance statements

## API

- `GET/POST /orb/standalone/onboarding/preferences`
- `POST /orb/standalone/safety/accept`
- `GET /orb/standalone/safety/status`

## Storage

- `orb_user_preferences` — role, environment, JSON preferences
- `orb_safety_acceptances` — versioned acceptance records

## Boundary copy

Standalone ORB does not access IndiCare OS records. Onboarding must not imply live OS data.
