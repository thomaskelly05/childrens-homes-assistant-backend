# ORB Residential route map

## Frontend app shell

| Route | Purpose |
|-------|---------|
| `/orb` | ORB Residential app shell (Next.js) |

## Account, setup, billing

| Route | Purpose |
|-------|---------|
| `/orb/*` | Profile, memory, subscription, usage, safety, projects |
| `/orb/standalone/billing/*` | Stripe checkout, portal, webhook |
| `/orb/usage/*` | Usage metering and top-up checkout |

## Standalone AI runtime (canonical)

| Route | Purpose |
|-------|---------|
| `/orb/standalone/conversation` | Non-stream chat |
| `/orb/standalone/conversation/stream` | SSE stream |
| `/orb/standalone/knowledge/*` | Read/search (premium); mutations admin-only |
| `/orb/standalone/documents/*` | Document intelligence |
| `/orb/standalone/outputs/*` | Saved outputs (user-scoped) |
| `/orb/standalone/agents/*` | Agent orchestration |

## Product libraries

| Route | Purpose |
|-------|---------|
| `/templates/*` | Template library |
| `/saved-outputs/*` | Canonical saved outputs API |

## Voice and Dictate

| Route | Purpose |
|-------|---------|
| `/orb/voice/*` | ORB Voice / Realtime session |
| `/orb/dictate/*` | ORB Dictate (premium + safety gated) |

## System

| Route | Purpose |
|-------|---------|
| `/orb/system/health` | Admin readiness checks (no secrets) |

## Compatibility only (no new frontend calls)

| Route | Purpose |
|-------|---------|
| `/orb/residential/*` | Legacy premium aliases |
| `/orb/ask` | Deprecated; use `/orb/standalone/conversation` |

## OS-only

Routes under `/os/*`, Care Hub, chronology, and child workspaces must not be called from standalone ORB surfaces.
