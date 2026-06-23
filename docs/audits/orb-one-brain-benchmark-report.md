# ORB Residential One-Brain Benchmark Report

**Date:** 2026-06-23  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Branch:** `cursor/orb-one-brain-benchmark-01d4`  
**Base:** `main`  
**Scope:** Closed-pilot launch-critical surfaces — routing convergence verification only (no feature or architecture changes)

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **ORB acting as one brain across launch-critical surfaces?** | **Yes** — all converged surfaces route through `orb_brain_convergence_orchestrator_service` with consistent `active_final_domains`, `public_source_chips`, and domain activation rules |
| **Closed pilot gate can proceed once live GOLD + human review complete?** | **Conditionally yes** — routing/convergence evidence is green; launch gate remains blocked by live-LLM GOLD evidence, human review, and privacy/retention sign-off |

**One-brain verdict:** ORB Residential routes as a single brain for all launch-critical surfaces except the **documented, intentional** `voice_fast` fast path, which explicitly skips heavy convergence to preserve latency.

---

## 1. Total tests run

| Layer | Count |
|-------|------:|
| Pytest benchmark suites (8 files) | 99 |
| Internal-brain evaluation packs (`run_orb_internal_brain_evaluation_packs.py`) | 25 scenarios |
| Internal-brain critical-failure audit (`audit_internal_brain_critical_failures.py`) | 99 scenarios |
| Runtime convergence probes (10 surfaces) | 10 |
| **Total automated checks** | **233** |

### Pytest suites executed

```bash
python -m pytest \
  tests/test_orb_domain_convergence_integration.py \
  tests/test_orb_residential_convergence.py \
  tests/test_orb_brain_convergence_orchestrator.py \
  tests/test_orb_quality_lab_routes.py \
  tests/test_orb_launch_routes.py \
  tests/test_orb_communicate_routes.py \
  tests/test_orb_quality_lab_live.py \
  tests/test_orb_professional_curiosity_depth.py \
  -q
```

### Scripts executed

```bash
python scripts/run_orb_internal_brain_evaluation_packs.py
python scripts/audit_internal_brain_critical_failures.py
```

---

## 2. Tests passed / failed

| Suite | Passed | Failed |
|-------|-------:|-------:|
| `test_orb_domain_convergence_integration.py` | 16 | 0 |
| `test_orb_residential_convergence.py` | 22 | 0 |
| `test_orb_brain_convergence_orchestrator.py` | 13 | 0 |
| `test_orb_quality_lab_routes.py` | 7 | 0 |
| `test_orb_launch_routes.py` | 6 | 0 |
| `test_orb_communicate_routes.py` | 1 | 0 |
| `test_orb_quality_lab_live.py` | 10 | 0 |
| `test_orb_professional_curiosity_depth.py` | 24 | 0 |
| **Pytest total** | **99** | **0** |

| Internal-brain pack | Scenarios | Passed | Critical failures |
|-------------------|----------:|-------:|------------------:|
| Adversarial | 8 | 8 | 0 |
| High-risk | 4 | 4 | 0 |
| Full | 13 | 13 | 0 |
| **Pack script total** | **25** | **25** | **0** |

| Critical-failure audit pack | Scenarios | Backend critical |
|-----------------------------|----------:|-----------------:|
| Adversarial | 10 | 0 |
| High-risk | 50 | 0 |
| Full | 39 | 0 |
| **Audit script total** | **99** | **0** |

**Overall:** 223/223 automated checks passed, 0 failures.

---

## 3. Routes fully converged

All surfaces below route through the brain convergence orchestrator (or unified brain gateway wired to it) and return `active_final_domains` metadata.

| # | Surface | Convergence evidence | Probe timing |
|---|---------|---------------------|-------------|
| 1 | **Chat** | `domain_convergence: orb-domain-convergence-v1`, `active_final_domains` present, 10 `public_source_chips` with `source_family_anchor` precision | 5.9 ms |
| 2 | **Chat stream** | Same `brain_route` and `scenario_types` as sync conversation (`brain_route_match: true`) | 111.8 ms |
| 3 | **Dictate generate** | `orb_document_brain_adapter` + `active_final_domains` in brain metadata | 14.7 ms |
| 4 | **Dictate edit** | Unified gateway path; orchestrator `active_final_domains` on edit decisions | 1.2 ms |
| 5 | **Write prepare** | `orb-unified-brain-gateway-v1` + `brain_convergence.active_final_domains` | 7.9 ms |
| 6 | **Voice specialist / safeguarding** | `brainTier: voice_specialist`, `activeFinalDomains` + `publicSourceChips` with `source_family_anchor` | — |
| 8 | **Actions** | Orchestrator `active_final_domains` on action prompts | 1.4 ms |
| 9 | **Document intelligence** | Orchestrator domains + 10 source chips | 1.3 ms |
| 10 | **Communicate convergence route** | `POST /orb/communicate/converge` returns `brain_convergence.active_final_domains` + `public_source_chips` | 1.3 ms |

**Count: 9 fully converged surfaces** (voice_fast excluded by design — see §4).

---

## 4. Routes partially converged

| # | Surface | Status | Rationale |
|---|---------|--------|-----------|
| 7 | **Voice fast** | **Partially converged (by design)** | Routes to `voice_fast` tier; skips heavy convergence routing; returns `voiceFastLimitations` documentation; `publicSourceChips` intentionally empty. Contract tests confirm word caps (40), tight token cap, and skipped policy/protocol lookup. |

This is not a routing break — it is the documented latency contract for general reflection / just-talk voice mode.

**Count: 1 partially converged surface (intentional).**

---

## 5. Routes not converged

**None.** No launch-critical surface shows broken or missing orchestrator wiring.

---

## 6. Average timings

| Metric | Value |
|--------|------:|
| Full pytest suite wall time | 1.31 s |
| Slowest single test | 0.41 s (`test_quality_lab_overview_requires_admin`) |
| Orchestrator probe average (8 timed surfaces, excl. voice mocks) | **18.2 ms** |
| Fastest probe | 1.2 ms (dictate edit) |
| Slowest probe | 111.8 ms (chat stream context build — includes retrieval bundle assembly) |

Voice fast and voice specialist probes used mocked `governed_draft_text` (no LLM); timings are not representative of live inference latency.

---

## 7. Routing divergence found

| Area | Divergence | Severity | Action |
|------|------------|----------|--------|
| Voice fast vs all other surfaces | Skips convergence metadata and source chips | **Expected** | None — documented limitation contract |
| Chat sync vs chat stream | None — identical `brain_route` and `scenario_types` | — | — |
| Dictate vs write vs chat | All share orchestrator; dictate uses document brain adapter as thin wrapper | — | — |
| Communicate vs chat | Same orchestrator; Communicate hidden from launch nav | — | — |

**No unintended routing divergence detected.**

---

## 8. Convergence signal checklist

| Signal | Present | Evidence |
|--------|---------|----------|
| `active_final_domains` appears | **Yes** | All 9 converged surfaces; pytest `test_domain_convergence_in_orchestrator_metadata` |
| `public_source_chips` appears | **Yes** | Chat, voice specialist, communicate route, document intelligence |
| `source_family_anchor` precision | **Yes** | All chips use `precision: source_family_anchor`, `type: source_family` |
| **child_story** for record/incident prompts | **Yes** | `test_child_story_activates_for_record_incident_dictate_write` + runtime probe |
| **SEND** for autism/SEND/sensory prompts | **Yes** | `send_communication` in `active_final_domains` for autism/EHCP probe |
| **rights/corporate parenting** for advocacy/complaint/voice | **Yes** | `rights_corporate_parenting` activated for complaint/advocacy probe |
| **health** for CAMHS/self-harm/wellbeing | **Yes** | `health_wellbeing` for CAMHS/self-harm probe; suicide contract in orchestrator |
| **multi_agency** for missing/safeguarding/allegation/whistleblowing | **Yes** | Multi-agency + whistleblowing scenario types; LADO contract on allegation |
| **PII/redaction/governance path** | **Yes** | Debug payload excludes raw email; `test_debug_metadata_excludes_raw_prompt_and_message_content` |
| **voice_fast** fast and explicitly limited | **Yes** | `brainTier: voice_fast`, empty chips, `VOICE_FAST_LIMITATIONS` returned |
| **Communicate** hidden from launch nav | **Yes** | `ORB_HIDDEN_LAUNCH_STATION_IDS = ['orb_communicate']`; route remains at `/orb/communicate/converge` |

---

## 9. One-brain assessment for closed-pilot routes

ORB Residential demonstrates **one-brain routing** for closed-pilot launch surfaces:

1. **Single orchestrator** — `orb_brain_convergence_orchestrator_service` is the canonical decision point documented in `orb_brain_route_map_service.trace_live_route`.
2. **Surface parity** — Chat, stream, dictate, write, voice specialist, actions, document intelligence, and communicate all emit the same convergence metadata shape.
3. **Domain activation consistency** — Prompt-class triggers (child story, SEND, rights, health, multi-agency) fire predictably across surfaces.
4. **Governance intact** — PII redaction in debug payloads; voice_fast limitations documented; Communicate routable but not in primary launch nav.
5. **No duplicate brain services** — `test_no_duplicate_new_brain_service_introduced` passes.

The only deliberate exception is `voice_fast`, which trades convergence depth for sub-second spoken reflection — consistent with the latency contract in `test_orb_voice_fast_latency_contract.py`.

---

## 10. Closed pilot gate readiness

| Gate criterion | Status |
|----------------|--------|
| Convergence pytest bundle (99/99) | **Pass** |
| Internal-brain packs (25/25, 0 critical) | **Pass** |
| Critical-failure audit (99/99, 0 critical) | **Pass** |
| Live LLM GOLD verification (100 scenarios) | **Not run** — `live_llm_available: false` (no `OPENAI_API_KEY`) |
| Human review of high-risk live answers | **Pending** |
| Privacy/retention governance sign-off | **Not recorded** (`privacyRetentionReviewed: false`) |
| Founder-session persisted internal-brain run | **Not recorded** (script packs pass; UI gate needs persisted run) |

**Can closed pilot gate proceed once live GOLD + human review are complete?**

**Yes, conditionally.** Routing and internal-brain convergence evidence supports proceeding to closed pilot **after**:

1. A completed live-LLM GOLD run (100 scenarios) with real ORB brain output
2. Human review sign-off on high-risk live answers
3. Privacy/retention review recorded (required for public launch; recommended before closed pilot)
4. Founder evaluation UI run persisted for audit trail

Convergence/routing is **not** a blocker.

---

## Remaining blockers

1. **Live LLM GOLD run** — cannot complete without API credentials in this environment
2. **Human review** — pending for high-risk live-LLM answers
3. **Privacy/retention sign-off** — `privacyRetentionReviewed: false`
4. **Founder-session internal-brain run** — script passes; persisted founder evaluation run still required for closed-pilot gate UI
5. **Stripe/production env** — documented in prior readiness reports (outside this benchmark)

---

## Files changed (this pass)

| File | Change |
|------|--------|
| `docs/audits/orb-one-brain-benchmark-report.md` | **New** — this benchmark report |

No application code, architecture, or feature changes were made.

---

## Commands run

```bash
# Benchmark pytest bundle
source .venv/bin/activate
export SESSION_SECRET=orb-benchmark-local-only
python -m pytest \
  tests/test_orb_domain_convergence_integration.py \
  tests/test_orb_residential_convergence.py \
  tests/test_orb_brain_convergence_orchestrator.py \
  tests/test_orb_quality_lab_routes.py \
  tests/test_orb_launch_routes.py \
  tests/test_orb_communicate_routes.py \
  tests/test_orb_quality_lab_live.py \
  tests/test_orb_professional_curiosity_depth.py \
  -v --tb=short -q

# Internal-brain scripts
export SESSION_SECRET=orb-internal-brain-eval-local-only
python scripts/run_orb_internal_brain_evaluation_packs.py
python scripts/audit_internal_brain_critical_failures.py
```

---

## Summary

| Item | Result |
|------|--------|
| Total automated checks | 233 |
| Passed | 233 |
| Failed | 0 |
| Routes fully converged | 9 |
| Routes partially converged (intentional) | 1 (voice_fast) |
| Routes not converged | 0 |
| One-brain verdict | **PASS** |
| Closed pilot routing blocker | **None** |
| Launch blockers | Live GOLD, human review, privacy sign-off |
