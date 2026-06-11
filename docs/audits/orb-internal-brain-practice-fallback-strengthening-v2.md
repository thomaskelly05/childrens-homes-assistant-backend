# ORB Internal Brain Practice-Specific Fallback Strengthening V2

**Status:** Implemented  
**Audience:** Founder / admin internal only  
**Scoring version:** `internal-brain-v2` (unchanged — output/phrase maps strengthened, severity rules unchanged)  
**Last updated:** 2026-06-11

## Purpose

Strengthen deterministic internal-brain fallback answers for high-risk safeguarding, daily practice and management/oversight scenarios so ORB gives sharper, sector-specific, child-centred guidance **before** any external LLM is used — without weakening safeguarding or hiding gaps.

## Baseline (before V2)

From founder UI evidence on `internal-brain-v2`:

| Pack | Pass | Critical | Missing | Improvements | Avg score |
|------|------|----------|---------|--------------|-----------|
| Adversarial | 10/10 | 0 | 0 | 0 | 84 |
| High-risk | 30/30 | 0 | 8 | 17 | 85 |
| Full | 39/39 | 0 | 4 | 23 | 83 |

**Problem:** Scenarios passed with zero critical failures, but many fallbacks used a generic safeguarding opener (“Safeguarding scenario detected…”) without category-specific wording. Phrase detection flagged missing requirements and improvement opportunities.

## After V2 (audit script, 2026-06-11)

Full pack re-run via `scripts/audit_internal_brain_critical_failures.py` (scenario bank from `orb-scenario-generator.ts`):

| Pack | Pass | Critical | Missing (raw) | Improvements | Avg backend score | Practice-specific fallbacks |
|------|------|----------|---------------|--------------|-------------------|----------------------------|
| Adversarial | 10/10 | 0 | 0 | 0 | 82 | 0 (adversarial structured fallbacks unchanged) |
| High-risk | 50/50 | 0 | 0 | 0 | 96 | 34 |
| Full | 39/39 | 0 | 0 | 0 | 94 | 29 |

> High-risk pack count is 50 in the generator (template variants × roles); founder UI “high-risk” button uses limit 30 from the same bank.

## Categories strengthened

### High-risk safeguarding (9 new + 2 strengthened)

| Category | Key wording added |
|----------|-------------------|
| `missing-from-home` | Missing-from-care protocol, welfare checks, police threshold, return interview |
| `self-harm` | Immediate risk assessment, access to means, health escalation, no secrecy |
| `suicidal-ideation` | Plan/means/intent urgency, remove medication/means, call 999/crisis route |
| `child-sexual-exploitation` | Safeguarding referral, CSE indicators, multi-agency, child not blamed |
| `criminal-exploitation` | Police notification threshold, county lines, avoid criminalising child |
| `online-harm` | Online safety escalation, preserve evidence, no blame/shame |
| `radicalisation` | Manager oversight, Prevent threshold, multi-agency if threshold met |
| `bullying` | Anti-bullying policy, supervision, safety planning |
| `emergency-escalation` | Medical emergency, call 999, first aid, Regulation 20 orientation |
| `allegation-against-staff` | Accused must not investigate; allegation protocol (strengthened) |
| `whistleblowing` | Protected disclosure, no retaliation, governance route (strengthened) |

### Daily practice (10 new)

`daily-record`, `handover`, `key-work-session`, `family-contact`, `medication-recording`, `education-concern`, `health-appointment`, `behaviour-incident`, `restraint-physical-intervention`, `substance-misuse`

Safety openers use care-recording / health / physical-intervention language — not generic “Safeguarding scenario detected” unless genuinely required.

### Management / oversight (8 new)

`regulation-44`, `regulation-45`, `supervision`, `management-oversight`, `staff-practice-concern`, `complaints`, `audit-preparation`, `ofsted-readiness`

Safety openers use management oversight / Regulation 44/45 evidence language.

## Implementation

| Component | Change |
|-----------|--------|
| `services/orb_internal_brain_practice_fallbacks.py` | **New** — 27 `CategoryFallbackContent` entries |
| `services/orb_internal_brain_fallbacks.py` | Merged practice fallbacks; expanded `SAFEGUARD_PHRASE_MAP` (~60 keys) |
| `services/orb_internal_brain_evaluation_service.py` | `practice_specific_fallback_used` in routing metadata |
| `services/orb_internal_brain_severity.py` | Extended `IMPROVEMENT_SAFEGUARD_LABELS` |
| `frontend-next/lib/orb/evaluation/orb-internal-brain-missing-requirements.ts` | Frontend phrase map aligned with backend |
| `frontend-next/lib/orb/evaluation/orb-internal-brain-severity.ts` | Mirror improvement labels |
| `frontend-next/components/founder/founder-orb-evaluation-run-detail-page.tsx` | Practice-fallback badge; improvements grouped by category |
| `tests/test_orb_internal_brain_practice_fallbacks.py` | **New** — category wording assertions |

Nine-section structure retained: safety position → cannot do → what to do → recording → child voice → therapeutic framing → escalation → regulatory orientation → boundary caveat.

## What internal-brain evidence proves

- Category-appropriate deterministic fallback text is present for 37 operational categories (27 new + 10 existing adversarial/allegation/whistleblowing).
- Required safeguard phrase detection passes for full/high-risk/adversarial packs at 0 missing.
- Critical failure rules remain at 0 across audited packs.
- Adversarial structured fallbacks untouched except shared allegation/whistleblowing strengthening.

## What internal-brain evidence does **not** prove

- Live LLM answer quality under real staff prompts
- Retrieval accuracy against IndiCare OS records
- Human professional judgement in situ
- Inspection or regulatory outcomes
- 100–5,000 scenario scale stability

## Why live-LLM validation is still required

Internal-brain mode tests routing, safeguards, phrase satisfaction and deterministic fallbacks only. Public launch evidence still requires `live-llm` runs with red-team agents, GOLD Quality Lab review and human sign-off for high-risk categories.

## Next recommendation

After confirming founder UI runs match audit script counts:

1. Run internal-brain **high-risk**, **full** and **adversarial** from `/founder/orb-evaluation`
2. Refresh and verify dashboard persistence
3. Proceed to **100-scenario** internal-brain scale run when all three packs remain clean

## Rules preserved

- No OpenAI in internal-brain mode
- No fake scores; missing requirements not hidden
- No weakening of critical failure rules
- Local policy / professional judgement caveats retained
- British English; children's homes terminology; child voice central
