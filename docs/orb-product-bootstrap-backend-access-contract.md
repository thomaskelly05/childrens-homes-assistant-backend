# ORB product bootstrap — backend access contract

## Dependency

`require_orb_product_bootstrap_access` in `auth/orb_product_bootstrap_dependency.py`.

## Requirements

1. Valid ORB residential session (`get_orb_residential_user`)
2. Active trial or subscription (`orb_access_service.check_access`, workflow `ask_orb`)
3. Safety acceptance recorded
4. No guest or partial product payloads on bootstrap routes

## Status codes

| Condition | HTTP | `detail.error` |
|-----------|------|----------------|
| No session | 401 | `not_authenticated` |
| Safety not accepted | 403 | `safety_acceptance_required` |
| No trial/subscription | 402 | `premium_required` |
| Access check failure | 503 | `access_check_unavailable` |
| Ready | 200 | Normal payload |

## Protected routes

- `GET /orb/projects`
- `GET /orb/standalone/config`
- `GET /orb/voice/session/status`
- `GET /orb/standalone/outputs/summary`

## Explicitly not protected

- `GET /orb/standalone/access` — access decision endpoint
- `GET /orb/auth/providers` — login
- `GET /auth/me` — session probe
- OAuth callbacks and Stripe webhooks
