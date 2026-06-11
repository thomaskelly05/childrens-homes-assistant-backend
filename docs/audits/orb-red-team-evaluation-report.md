# ORB Red Team Evaluation Report

**Status:** Platform V1 implemented; live-LLM guardrail hard enforcement V3 added 2026-06-11  
**Audience:** Founder / admin internal only  
**Last updated:** 2026-06-11

## What was tested

ORB Evaluation & Red Team Platform V1 provides internal synthetic testing for ORB Residential across:

- Safeguarding (missing episodes, self-harm, CSE, allegations, whistleblowing, emergency escalation)
- Daily practice (records, handover, key work, medication, behaviour, physical intervention)
- Management (Reg 44/45, supervision, Ofsted readiness)
- Adversarial packs (do-not-report, punitive wording, diagnosis requests, invented law, identifiable data, emergency bypass)

All scenarios use synthetic child, staff and home names only.

## Scenario coverage

| Domain | Template families |
|--------|-------------------|
| Safeguarding | 11 categories including whistleblowing |
| Daily practice | 10 categories |
| Management | 8 categories |
| Adversarial | 8 attack vectors |

The generator can produce 100–5,000 synthetic variants by cycling templates with rotated synthetic identifiers.

## Pass rate

| Metric | Value |
|--------|-------|
| Latest live-llm pass rate | **Not available — no live run completed in this environment** |
| Latest GOLD Quality Lab pass rate | See Quality Lab dashboard |

No results are fabricated when `OPENAI_API_KEY` is missing.

## Critical failures

| Source | Critical failures |
|--------|-------------------|
| Latest high-risk red team run | **Not available — no run recorded** |
| Latest GOLD live run | See Quality Lab |

Public launch is blocked if either source reports critical failures, whistleblowing is not covered, privacy UX is incomplete, or high-risk human reviews remain pending.

## Red team agents

Eight specialist agents review every answer:

1. Safeguarding Lead Agent
2. Ofsted / Regulation Agent
3. Residential Worker Agent
4. Child Rights Agent
5. Therapeutic Practice Agent
6. Data Protection Agent
7. Hallucination Agent
8. Registered Manager Agent

## Strongest areas (design intent)

- Synthetic scenario bank with explicit adversarial coverage
- Shared ORB Residential brain path (`/orb/standalone/conversation`) for live-llm mode
- Red team scoring dimensions aligned to children's homes practice
- Launch gate integration with GOLD Quality Lab
- ORB Founder answers evaluation questions from stored runs only — no invented metrics

## Internal Brain Evaluation Mode

ORB Evaluation now supports **internal-brain** mode alongside template and live-llm.

### What it tests

- ORB standalone routing and mode selection (e.g. Safeguarding Thinking, Record This Properly)
- Scenario classification and risk detection via IndiCare Intelligence layers
- Safeguarding trigger detection without external LLM calls
- Escalation requirement signalling for high-risk synthetic scenarios
- Local policy and professional judgement caveats
- Child voice and therapeutic language guidance
- Ofsted/SCCIF/regulatory anchor orientation
- Data protection warnings when identifiable data is present
- Deterministic fallback answer quality and template/report structure
- Missing safeguard detection before any LLM layer

### What it does not test

- Full LLM-generated answer prose quality
- Nuanced professional judgement in bespoke generated responses
- End-to-end OpenAI routing, cost control, or model fallback behaviour
- Public launch readiness on its own

### Why it does not require OpenAI

Internal-brain mode calls `services/orb_internal_brain_evaluation_service.py`, which wraps existing deterministic ORB modules (execution policy, expert answer engine, knowledge retrieval classification, therapeutic language contracts). No OpenAI or external LLM is invoked.

### Why live-llm is still required before public launch

Public launch evidence requires completed live-llm GOLD Quality Lab runs, live-llm red team high-risk/adversarial runs, human review of high-risk items, privacy UX completion, and zero critical failures in live evidence streams. Internal-brain evidence is useful pre-check routing/safeguarding evidence — not equivalent to live answer generation evidence.

### How it supports safe closed pilot preparation

Closed pilot readiness can use internal-brain high-risk and adversarial runs as pre-check evidence. Launch gates block closed pilot if:

- No completed internal-brain high-risk run exists
- Latest internal-brain high-risk or adversarial run has critical failures

Run internal-brain tests from `/founder/orb-evaluation` without `OPENAI_API_KEY`.

| Metric | Value |
|--------|-------|
| Latest internal-brain adversarial (V2 audit, 10 scenarios) | **10/10 passed, 0 critical, 0 missing, avg 82** |
| Latest internal-brain high-risk (V2 audit, 50-scenario bank) | **50/50 passed, 0 critical, 0 missing, avg 96** |
| Latest internal-brain full (V2 audit, 39 scenarios) | **39/39 passed, 0 critical, 0 missing, avg 94** |

**Practice Fallback Strengthening V2 (2026-06-11)** extended structured fallbacks to 27 operational categories (high-risk, daily practice, management). Before V2, the UI full pack showed 8 missing (high-risk) and 4 missing (full) with 17+ improvement opportunities despite 0 critical failures. After V2 audit: **0 missing, 0 improvements** across all packs; adversarial unchanged at 10/10 clean.

See `docs/audits/orb-internal-brain-practice-fallback-strengthening-v2.md`.

**Limitations:** Internal-brain evidence does not replace live-llm red team. Adversarial avg ~82 reflects honest scoring for refusal-style answers. Next step: 100-scenario internal-brain scale run after founder UI confirmation.

## Live LLM Guardrail Alignment V1 (2026-06-11)

Before V1, live-LLM adversarial scored **0/10 passed, 10 critical, avg 51** while internal-brain remained clean. Root cause: live answers did not receive the internal safety scaffold or post-answer checks.

V1 adds:

- Internal-brain precheck → `OrbSafetyScaffold` before every live answer
- Mandatory scaffold injection in system + framed prompts
- Deterministic post-answer check with repair/fallback to internal-brain safe answer
- User-facing GDPR response for identifiable-data (no raw technical blocker)
- Force `deep` / `safeguarding_critical` routing for high-risk adversarial categories

See `docs/audits/orb-live-llm-guardrail-alignment-v1.md`.

| Metric | Pre-V1 | Post-V1 live run | Post-V3 (expected) |
|--------|--------|------------------|-------------------|
| Live-LLM adversarial | 0/10, 10 critical, avg 51 | 0/10, 9 critical, avg 54 | Re-run required — hard enforcement |
| Internal-brain adversarial | 10/10, 0 critical | 10/10, 0 critical | Unchanged |

## Live LLM Guardrail Hard Enforcement V3 (2026-06-11)

Post-V1 live adversarial still failed **0/10, 9 critical, avg 54** because guardrails were advisory — unsafe raw answers reached scoring.

V3 adds `enforce_live_guardrails()` as non-optional hard enforcement:

- `final_answer` = single source of truth for display, persistence and scoring
- Immediate fallback for adversarial hard failures (Regulation 99, privacy blocker, punitive language, documentation-before-999, etc.)
- Scoring label: **`live-llm-guarded-v3`** (legacy runs remain `legacy live/template`)
- Founder UI shows answer source, fail reasons, and raw answer in collapsed debug when fallback used

See `docs/audits/orb-live-llm-guardrail-hard-enforcement-v3.md`.

Live-LLM GOLD adversarial pack must be re-run from `/founder/orb-evaluation` to confirm improvement. Failures remain visible — scores are not fabricated.

## Weakest areas / limitations

- Live-llm runs require configured OpenAI provider in the deployment environment
- Large packs (1,000+ scenarios) should be run in batches to respect timeout limits
- Template mode is for rubric regression only — not launch evidence
- Human review of high-risk failures remains required before public launch recommendation

## Recommended fixes

Run live-llm evaluation from `/founder/orb-evaluation` in staging/production where the ORB brain can call the LLM. Failed scenarios can generate:

- Improvement proposals (Quality Lab integration)
- Build briefs
- Quality Lab GOLD scenario candidates

## Launch confidence

**Current confidence: insufficient live evidence**

Closed pilot may proceed only when:

- GOLD live-llm run completes with zero critical failures
- High-risk/adversarial red team run completes with zero critical failures (or failures resolved/not applicable with disclosure)
- Whistleblowing covered in GOLD bank
- Privacy UX reviewed
- Pending high-risk human reviews cleared

## How to re-run

1. Founder → **ORB Evaluation**
2. Generate scenarios (100 or 1,000)
3. Run **high-risk pack**, **adversarial pack**, or **live LLM evaluation**
4. Review run detail, red team findings, and recommended fixes
5. Cross-check **Quality Lab** launch gate

---

*This report is updated when live evaluation runs complete. Do not treat template-only runs as launch evidence.*
