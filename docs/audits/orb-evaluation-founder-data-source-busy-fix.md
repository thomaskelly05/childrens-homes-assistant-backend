# ORB Evaluation — Founder data source busy fix

**Date:** 2026-06-11  
**Issue:** Internal-brain adversarial test fails with `Founder data source is busy` after successful high-risk and full runs.

## Where the message originates

The user-facing string **"Founder data source is busy"** is produced in the browser founder persistence client when any founder persistence request returns HTTP **≥ 500**:

- `frontend-next/lib/founder/api/founder-api-client.ts` — `parseErrorMessage()` maps `status >= 500` to that message.

It is **not** thrown by the ORB evaluation backend or internal-brain scoring engine directly.

## Persistence path for internal-brain runs

1. Dashboard calls `executeInternalBrainEvaluationRun()` / `executeEvaluationRun({ mode: 'internal-brain' })`.
2. Backend `POST /orb/admin/evaluation/runs` creates an in-memory queued run (no founder DB).
3. Frontend `persistEvaluationRun()` writes to `POST /api/founder/persistence/orb-evaluation-runs`.
4. Frontend loops `POST /api/orb/evaluation/runs/{id}/process` (batched backend processing).
5. After **each batch**, frontend calls `persistEvaluationRun()` again.
6. On completion, `loadEvaluationData()` calls `GET /api/orb/evaluation/runs` which reads founder persistence.

## Root cause

### Primary: duplicate create instead of update

`persistEvaluationRun()` always used `founderPost` (create). Internal-brain runs persist progress after every batch. The second and subsequent writes attempted another `INSERT` with the same run id, causing a PostgreSQL primary-key violation → HTTP 500 → **"Founder data source is busy"**.

High-risk and full runs could appear to succeed when:

- Only the first persist succeeded and later batches failed before this fix, or
- Runs completed in environments with dev persistence fallback (in-memory, no DB constraint).

Adversarial runs after completed high-risk/full runs hit this reliably because persistence already contained run records and concurrent dashboard refresh increased DB pool contention.

### Secondary: transient DB pool contention

Founder persistence uses PostgreSQL connection pooling (`db/connection.py`). Concurrent dashboard `GET` requests (runs list, bootstrap hydration) while a run is writing large JSON payloads can exhaust the pool briefly → 503/500 → same busy message.

### Not the cause

- Auth / CSRF — would return 401/403 with different messages.
- OpenAI — internal-brain mode does not call OpenAI.
- ORB brain behaviour — unchanged; evaluation only reads routing/fallback output.

## When busy occurred (by phase)

| Phase | Busy? | Notes |
|-------|-------|-------|
| Creating queued adversarial run (backend POST) | Rare | Backend is in-memory; not founder DB |
| First `persistEvaluationRun` after create | Sometimes | Pool contention on first write |
| Persisting batch progress | **Yes (primary)** | Duplicate POST / INSERT for same run id |
| `POST .../process` | No | Backend in-memory only |
| Persisting final results | **Yes** | Same duplicate POST issue |
| `GET /runs` during refresh | Sometimes | Pool contention; should not fail the run |
| Launch gate refresh | Sometimes | Reads persisted runs via GET |
| Run detail refresh | Sometimes | GET single run from persistence |

## Fix summary

1. **Upsert persistence** — POST on first write, PATCH on updates; retry transient busy errors with exponential backoff (250ms, 500ms, 1000ms).
2. **Single internal-brain processor** — only one internal-brain evaluation may be queued/running at a time; reuse active run instead of creating duplicates.
3. **Stale run recovery** — runs stuck in queued/running for >10 minutes marked `interrupted` so new runs can start; partial results preserved.
4. **Process endpoint hardening** — in-flight lock per run; structured `{ success: false, code: 'busy', retryable: true, retryAfterMs }` when batch processing contends.
5. **Dashboard clarity** — distinct messages for busy vs active run; disable internal-brain buttons while any internal-brain run is active.

## Constraints preserved

- Auth and CSRF unchanged.
- No fake runs or scores.
- No deletion of prior run evidence.
- Internal-brain mode does not call OpenAI.
- ORB brain behaviour unchanged.
