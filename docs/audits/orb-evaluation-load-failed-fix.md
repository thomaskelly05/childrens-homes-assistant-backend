# ORB Evaluation "Load failed" — audit and fix

**Date:** 2026-06-11  
**Issue:** Internal-brain high-risk test fails with `Load failed` / network connection lost on `POST /api/orb/evaluation/runs`  
**Status:** Fixed — async run creation with batched processing and polling

## Phase 1 — failure point audit

### Current flow (before fix)

1. User clicks **Run internal brain high-risk test** on `/founder/orb-evaluation`.
2. Frontend generates the high-risk scenario pack locally (`generateScenarioPack('high-risk')`).
3. Frontend calls `executeEvaluationRun` → `postEvaluationRun` → `POST /api/orb/evaluation/runs`.
4. Next.js route proxies to `POST /orb/admin/evaluation/runs` with full scenario payload.
5. Backend `OrbEvaluationPlatformService.run_evaluation` loops **synchronously** over every scenario, calling `orb_internal_brain_evaluation_service.evaluate_scenario` for each.
6. Backend returns a single response with all `scenario_results` when every scenario has finished.
7. Frontend scores results, persists the completed run, and shows success.

### Findings

| Check | Finding |
|-------|---------|
| Synchronous evaluation before response? | **Yes.** `run_evaluation` processes all scenarios in a `for` loop before returning. |
| High-risk pack scenario count | **~72** scenarios in the full pack (24 high/critical templates × role perspectives). UI passes `limit: 30`. |
| Frontend scoring before persistence? | **Yes.** Scoring runs in `executeEvaluationRun` after the long POST returns; nothing is persisted until the full run completes. |
| Request body too large? | **Moderate.** ~30 full scenario objects (~15–25 KB JSON). Not the primary failure mode. |
| Response body too large? | **Yes — likely contributor.** 30 scenarios × internal-brain fallback answers and routing metadata can exceed hundreds of KB in one response. |
| Proxy / runtime timeout exceeded? | **Yes — root cause.** Auth and CSRF succeed (`debug/security-post` passes). The browser error `The network connection was lost` on `runs` indicates the connection closed before the long synchronous POST completed. Next.js proxy allows up to 300 s, but upstream proxies (Vercel, load balancers, serverless) often enforce shorter limits. |
| Results persisted before network drops? | **No.** Persistence only happens after the full POST returns and frontend scoring completes. A dropped connection means no run is saved. |
| Backend completion vs exception? | Backend would eventually complete locally, but the client never receives the response. No persisted evidence on failure. |

### Conclusion

Auth and CSRF are not the blocker. The internal-brain run is a **single long synchronous POST** that evaluates every scenario before responding. Production proxies close the connection, producing browser `Load failed` with no persisted run.

## Fix summary

| Phase | Change |
|-------|--------|
| 2 | `POST /runs` for `internal-brain` creates a queued run and returns immediately. |
| 3–4 | `POST /runs/{runId}/process` evaluates scenarios in batches of 5, persisting progress after each batch. |
| 5 | Frontend creates run, polls `GET /runs/{runId}`, and loops the process endpoint until complete. |
| 6–7 | Dashboard and run detail show queued/running progress; blocker clears only on completed run with zero critical failures. |
| 8 | Duplicate clicks disabled while a high-risk internal-brain run is active. |

## Safety preserved

- Founder/admin auth unchanged.
- CSRF enforced on create and process POST routes.
- No fabricated runs or scores.
- Internal-brain mode does not call OpenAI.
- Live-llm mode still requires `OPENAI_API_KEY`.
