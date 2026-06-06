# ORB access request deduplication

## Problem

Multiple components and remounts issued concurrent `GET /orb/standalone/access` requests.

## Solution

`frontend-next/lib/orb/orb-access-request-cache.ts`:

- **In-flight dedupe** — concurrent callers share one promise
- **Short cache** — 4s TTL per page lifecycle
- **Force refresh** — `retry()`, `refresh()`, sign-in/out reset cache
- **Abort** — superseded forced requests abort prior controller
- **Counter** — `getOrbAccessRequestCount()` for debug panel

## Acceptance

On initial `/orb` load after authentication:

- Max **1 active** `/orb/standalone/access` request (plus cache hits)
- No access storm on remount within cache window
