# ORB Access Gating Contract

## Endpoint

`GET /orb/standalone/access`

## Response contract

All payloads include:

```json
{ "contract_version": "orb_access_v2", ... }
```

Frontend rejects responses without matching `contract_version` → retry screen (`access_contract_mismatch`).

## Status codes

| Session | HTTP | Body |
|---------|------|------|
| No cookie | 200 | Guest payload (`can_use_orb: false`) |
| Invalid/expired session | **401** | `{ success: false, error: {...} }` |
| Valid session | 200 | Full access payload |

**Important:** Invalid session must **not** return 200 guest — that caused stale-session loops when `/auth/me` and `/access` disagreed.

## Frontend hook (`useOrbAccountState`)

Exposes only:

- `accessStatus`: `idle` | `loading` | `ready` | `error`
- `accessFetchStatus` (HTTP code)
- `accessFailureKind`
- `contractMismatch`
- `retry()` — no routing

`OrbAuthGate` maps hook output to gate states.

## Gate outcomes

| Access result | Gate state |
|---------------|------------|
| 401 | Clear stale state → logout → login |
| 402 / inactive | Upgrade |
| 403 safety | Safety retry |
| 429 / timeout / 5xx | Access retry |
| Active + safety OK | Product (`ready`) |
