# ORB Closed Pilot Readiness Pass — Report

**Date:** 2026-06-23  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Branch:** `cursor/orb-closed-pilot-readiness-9c90`  
**Base:** `main` (includes merged PR #1711)

---

## Executive verdict

| Gate | Ready |
|------|-------|
| **Closed pilot ready** | **Possible** when live GOLD + internal-brain + human review evidence exists |
| **Public launch ready** | **No** until `privacyRetentionReviewed` is manually recorded |

Closed pilot is now a distinct readiness state from public launch. Privacy/retention sign-off remains a public-launch-only gate and is never set automatically.

---

## PR #1711 merge verification

| Check | Result |
|-------|--------|
| PR #1711 merged to `main` | Yes (`decccb3e`) |
| Merge-tree with current `main` | **Clean** — no conflicts |

---

## Readiness states

| Flag | Meaning |
|------|---------|
| `internalBrainHighRiskPassed` | Latest completed internal-brain high-risk run with 0 critical failures |
| `liveGoldRunCompleted` | Latest Quality Lab run completed in `live-llm` mode |
| `highRiskHumanReviewed` | All high/critical GOLD scenarios in latest live run human-reviewed |
| `privacyRetentionReviewed` | Founder manually recorded privacy/retention governance review |
| `closedPilotReady` | `recommendation === 'closed-pilot-ready'` |
| `publicLaunchReady` | `recommendation === 'public-launch-ready'` |

`closedPilotReady` does **not** require `privacyRetentionReviewed`. `publicLaunchReady` does.

---

## Manual GOLD workflow (no OPENAI_API_KEY)

When `live_llm_available` is false, Quality Lab shows a step-by-step manual workflow:

1. Run internal-brain high-risk pack (ORB Evaluation)
2. Obtain live answers in staging or paste manually
3. Evaluate high-risk GOLD answers via manual eval
4. Complete human review of high-risk scenarios
5. Privacy & retention review (public launch only — not auto-recorded)

---

## Remaining public launch blockers

1. **Privacy and retention review not recorded** (`privacyRetentionReviewed: false` until founder action)
2. **No completed live-llm GOLD verification run** (when not yet executed)
3. **Human review** of high-risk live answers (when pending)
4. **Stripe domain verification / production env** (outside this pass)

---

## Files changed

| File | Change |
|------|--------|
| `frontend-next/lib/orb/quality/launch-governance-store.ts` | Internal-brain high-risk session persistence + sync |
| `frontend-next/lib/orb/quality/launch-manual-gold-workflow.ts` | **New** — manual GOLD workflow steps |
| `frontend-next/lib/orb/quality/launch-quality-gate.ts` | Explicit readiness boolean fields |
| `frontend-next/lib/founder/quality-lab/quality-lab-types.ts` | Extended `OrbLaunchQualityGate` type |
| `frontend-next/lib/orb/evaluation/orb-evaluation-run-service.ts` | Record governance on internal-brain persist |
| `frontend-next/components/founder/founder-quality-lab-page.tsx` | Readiness status + manual workflow UI |
| `frontend-next/components/founder/founder-orb-evaluation-page.tsx` | Readiness status panel |
| `frontend-next/lib/orb/quality/launch-quality-gate.test.ts` | Closed pilot vs public launch tests |
| `frontend-next/lib/orb/quality/launch-governance-store.test.ts` | Governance + workflow contract tests |
| `frontend-next/components/founder/founder-quality-lab-page.test.ts` | UI hook assertions |
| `docs/audits/orb-closed-pilot-readiness-pass-report.md` | **New** — this report |

---

## Tests run

```bash
cd frontend-next && node --experimental-strip-types --test \
  lib/orb/quality/launch-quality-gate.test.ts \
  lib/orb/quality/launch-governance-store.test.ts \
  components/founder/founder-quality-lab-page.test.ts
```

Result: **23/23 pass**
