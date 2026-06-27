# 00 — Executive Summary: System Readiness vs the Constitution

| Field | Value |
|---|---|
| Scope | Whole IndiCare Intelligence / ORB Residential backend, audited against the 18 ratified constitutional documents |
| Branch | `fix/nr-1-egress-governance` |
| Date | 2026-06-27 |
| Method | Static analysis + targeted reads + a dependency-free runnable egress audit. **The app and full pytest suite were NOT run** (deps/DB unavailable); **frontends were NOT read** (OUT OF SCOPE). |

## Plain-English verdict

The **intelligence and safety "brain" is strong and genuinely encoded** — ORB is built to
support adults, not replace them, and it refuses to make safeguarding decisions. The
**governance, verification, and data-handling plumbing is partway there**: real controls exist,
but several load-bearing protections are **not yet enforced everywhere or not yet verified**.

**No part of the system should be described as compliant, safe, secure, or complete.** This
audit is honest about what is verified, what is only present, and what is unknown.

- **NR-1 (the named AI-egress risk): PARTIALLY RESOLVED.** The one raw, request-reachable
  egress (ORB Voice TTS) was converged to the approved sanitised client, the repo's own
  (previously failing) egress guards now pass, and a runnable guard was added. **Still open:**
  governance is not yet enforced at a single chokepoint (the provider-adapter path is
  caller-dependent; TTS isn't privacy-gated yet). See report 01.

## Top 10 system risks (full list in 09)

1. **NR-1** — AI egress not enforced at one governed chokepoint (P0, partially remediated).
2. **No pre-merge gate** before auto-deploy that mutates the production schema (P0).
3. **Test-suite health unknown** — not runnable here; not CI-gated (P0/P1).
4. **Per-router auth/policy enforcement unverified** — 40/229 routers have no `Depends(` (P0/P1).
5. **Memory tenancy/retention unverified** — cross-home leak risk (P1).
6. **Cross-home safeguarding-trend tenancy unverified** (P1).
7. **UI human-review-before-save unverified** for ORB outputs (P1).
8. **RLS correctness unverified** (P1).
9. **No independent Safeguarding Lead / DPO; roles concentrated in one person** (P1).
10. **Default admin credential shipped; provider no-training assurance absent** (P1).

## Readiness assessments

- **Ready for a public IndiCare Promise?** **No, not yet.** Several claims a promise would imply
  (governed AI, assured review) are open/unverified. Draft only after NR-1 is RESOLVED, the
  release/test gate exists, UI human-review is verified, and the no-training provider assurance
  is in place. (See 11.) The mandatory "ORB supports… adults remain responsible…" line *is*
  honestly sayable now.
- **Ready for early, controlled pilot use?** **Conditionally, with guardrails — founder
  decision.** A tightly-controlled pilot could be defensible **only if**: real
  child/staff/home/safeguarding data is restricted until R1–R2 are done; ORB Voice TTS stays
  disabled for sensitive content; external AI is enabled only where governed routes are
  confirmed; and pilots are briefed that outputs require adult review. Without those guardrails,
  not ready. This is a judgement call for the founder (and a Safeguarding Lead/DPO if appointed),
  not something this audit can certify.
- **Ready for broader launch?** **No.** Must first fix: NR-1 (R1), the release/test gate (R0),
  per-router + tenancy + RLS verification (R2), UI human-review (R3), and the data-protection
  completion items (R4) — see the roadmap (10).

## What must be fixed before broader launch (headline)
NR-1 fully closed → a real pre-merge gate + green test suite → verified per-router/tenancy/RLS
enforcement → verified UI human-review → finalised privacy posture (logs, erasure, RoPA/DPIA,
provider no-training, independent DPO/Safeguarding Lead).

## Honesty note
This summary reflects a backend-focused, static audit without runtime or UI verification. Items
marked UNVERIFIED are not assertions of failure — they are areas a test-capable, app-running
review must confirm before any readiness claim is made.
