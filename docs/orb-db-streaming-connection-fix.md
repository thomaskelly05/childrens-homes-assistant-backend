# ORB DB Streaming Connection Fix

## Problem

Long-lived SSE streams (`POST /orb/standalone/conversation/stream`) could outlive Postgres idle SSL timeouts. When FastAPI `get_db()` finalised the request, `commit()` on a closed connection raised:

`psycopg2.OperationalError: SSL connection has been closed unexpectedly`

## Fix

`db/connection.py` now uses `_safe_db_finalize()`:

- Skips commit/rollback when connection already closed.
- Catches `OperationalError` / `InterfaceError` on commit and logs a single warning instead of propagating.

## Guidance

- Do not hold DB sessions open across entire AI streams when DB work is complete before streaming starts.
- Prefer short `db_connection()` scopes for pre-stream writes; release before `StreamingResponse` yields.
