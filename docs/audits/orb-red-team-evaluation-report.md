# ORB Red Team Evaluation Report

**Status:** Platform V1 implemented — awaiting live-llm evidence in configured environments  
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
| Latest internal-brain high-risk run | **Not available — no run recorded in this environment** |
| Latest internal-brain adversarial run | **Not available — no run recorded in this environment** |

No results are fabricated when no internal-brain run has been completed.

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
