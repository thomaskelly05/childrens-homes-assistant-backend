# 11 — Public Promise Readiness

**Question:** is IndiCare Intelligence ready to draft a public-facing IndiCare Promise (e.g. for
the login screen)?

**This document does NOT draft the promise.** It assesses what could honestly be said, and what
cannot, on current evidence. No marketing claims are created here.

## Recommendation: NOT YET — draft only after R0–R3 of the roadmap

A public promise is a trust artifact; under the honesty principle (C1 Article 7) it must be
fully supportable. Today several load-bearing claims are unverified or open (NR-1, release
gating, test-suite health, per-router enforcement, UI human-review). Publishing a promise that
implies governed AI or assured safety **before** those are verified would breach the
Constitution.

## What we could NOT say yet (prohibited now)
- ❌ "All AI processing is governed / all data is redacted before AI" — **NR-1 OPEN**.
- ❌ "Guaranteed compliance / safety / security" — prohibited by C1 Article 7 regardless.
- ❌ "ORB keeps children safe" / "ORB makes safeguarding decisions" — false and prohibited.
- ❌ "Fully tested / inspection-ready" — test health unverified; banned phrasing.

## What appears honestly sayable now (VERIFIED), subject to final review
- ✅ "ORB supports reflection, recording and evidence gathering. Adults remain responsible for
  judgement, safeguarding escalation and final records." (mandatory line; coded in
  `assistant/ai_boundaries.py`, ADR-0006.)
- ✅ "ORB does not make safeguarding decisions and does not replace professional judgement."
- ✅ "AI-generated content is for adult review and editing." (subject to R7 UI verification.)
- ✅ "We minimise data sent to AI and redact on governed routes." (precise, not "all").
- ✅ "We are ICO registered." (founder-attested; verify the registration reference before
  publishing.)
- ✅ "We do not use your data to train AI models." — only if the **provider contractual
  assurance (R11)** is in place; otherwise soften to the in-repo controls.

## Gate to drafting the promise
Draft the IndiCare Promise once: NR-1 is RESOLVED (R1), the release/test gate exists (R0), UI
human-review is verified (R3 step 1), and the no-training provider assurance (R11) is confirmed.
At that point this document can be turned into honest public wording in a **separate,
explicitly-authorised** task — not before.
