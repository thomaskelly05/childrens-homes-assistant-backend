# 10 — Remediation Roadmap

Sequenced, small, safe phases (per E1 "smallest safe change" and E3). Each phase ends with
verification in a **test-capable environment** (app deps + DB), which this audit did not have.
Nothing here should be shipped to `main` without the gate in Phase R0.

## R0 — Make the system testable + gated (prerequisite, P0)
1. Stand up a dev environment with `requirements.txt` installed + Postgres (per AGENTS.md).
2. Run the full pytest suite; record real pass/fail (resolves R3 unknown).
3. Add a CI job (separate from the ORB scenario gate) running: pytest (excluding the documented
   non-pytest scripts), `ruff`, type-check, and **`python3 scripts/ai_egress_audit.py`** (the
   NR-1 guard). (E6 Q1/Q2/Q7.)
4. Protect `main`: require the gate to pass before merge (E3 R1/R2).
*Why first: every later fix needs a way to be verified and a gate to land safely.*

## R1 — Finish NR-1 (P0)
1. Enforce governance at the **provider-adapter chokepoint** (`openai_provider` /
   `ai_model_router_service`): `evaluate_external_call` + redaction + `record_model_usage`,
   scope from request/metadata, fail-safe. Validate against live provider/feature-allowlist
   settings so it does not block legitimate flows.
2. **Gate TTS** at the routes (`orb_voice_tts_routes.py`, `orb_voice_v2_service.py`) with scope;
   keep input caps. Until done, keep `ORB_TTS_ENABLED=false` for real sensitive content.
3. Re-run `scripts/ai_egress_audit.py` + guard tests; only then move NR-1 → RESOLVED.

## R2 — Security/tenancy verification (P0/P1)
1. Per-router audit of the 40 routers without `Depends(`; confirm each is intentionally public
   or add auth + policy engine (R4).
2. Verify **memory** (R5) and **cross-home trend** (R6) tenancy isolation; add tests.
3. Review + test **RLS** (`sql/008`) (R8).
4. Enforce default-credential rotation; remove the default from any production path (R10).

## R3 — Safeguarding & product (UI) verification (P1)
1. With the app running, verify **human review/edit before save/send** on every ORB output
   surface (Chat drafts, Write, Dictate) (R7).
2. Confirm Voice/Dictate/Write respect NR-1 and recording-quality prompts (child's voice,
   what-helped, follow-up).
3. Run adversarial/hallucination evals against the live model (R14).

## R4 — Data-protection completion (P1/P2)
1. Sampled log-PII audit across services (R15).
2. Finalise subprocessor register; produce RoPA + DPIA (R16).
3. Obtain provider contractual no-training assurance (R11).
4. Appoint/contract an independent DPO function; appoint a Safeguarding Lead (R9).

## R5 — Operational hygiene (P2/P3)
1. Consolidate migrations into one ordered ledger (R12).
2. Fold startup patches into reviewed app assembly (R13).
3. Generate an authoritative API surface map (R17); clarify the two frontends (R18).

## Sequencing rationale
R0 unblocks safe, verified change. R1–R2 address the data-handling cluster (egress, auth,
tenancy) that gates any real-data use. R3 covers the human-in-the-loop product guarantees. R4
completes the privacy/governance posture. R5 is hygiene. Each item maps to the risk register
(09) and a constitutional document.
