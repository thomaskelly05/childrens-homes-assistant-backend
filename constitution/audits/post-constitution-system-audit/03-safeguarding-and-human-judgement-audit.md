# 03 — Safeguarding & Human-Judgement Audit (against O4, A1, C1)

Mandatory line under audit: **ORB supports reflection, recording and evidence gathering.
Adults remain responsible for judgement, safeguarding escalation and final records.**

Labels: VERIFIED / DERIVED / INFERRED / UNVERIFIED / OUT OF SCOPE / FUTURE VISION.

## Findings

**1. ORB does not make safeguarding decisions — aligned (VERIFIED, code-level).**
- 14 hard boundaries appended to system prompts and declared to override style:
  `assistant/ai_boundaries.py:3-17, 18-60` (boundaries 2/6/7: no safeguarding decisions, no
  advising bypass of escalation, prioritise immediate safety).
- The prompt-level safeguarding standard forbids determinations: `assistant/prompts.py:350`
  ("avoid making the final safeguarding threshold decision") and `:358, 492-494` (banned
  phrases: "no safeguarding concern", "no further action needed", "this is safe", "this is
  compliant", "ready for inspection", "ORB has determined").
- Architectural decision: assistant is copilot-not-authority — `docs/architecture/adr-0006…`.

**2. Human-in-the-loop — partially aligned (DERIVED).**
- Constitutional/prompt requirement that records are reviewable/editable before use is present
  (`CLAUDE.md` non-negotiables; O4 §4). **UNVERIFIED at the UI level:** that every
  ORB-generated record surface (Write, Dictate, Chat drafts) actually enforces an explicit
  human review/edit step before save/send was **not** verified (frontend not read; app not
  run).

**3. Escalation/urgency surfacing — aligned in intent (VERIFIED existence).**
- `assistant/prompts.py:222` ("urgent safeguarding: lead with immediate safety and
  escalation"); `assistant/escalation_monitoring.py`. Depth/behaviour not executed (UNVERIFIED).

**4. Standalone vs embedded isolation — aligned (VERIFIED).**
- Standalone assistant must not access live child records (`docs/ai-safety.md`; guarded by
  `OrbResidentialGuardMiddleware`). Limits the blast radius of any error.

**5. Adversarial / boundary testing — present but unverified at runtime (VERIFIED existence).**
- `tests/test_orb_adversarial_safety_firewall.py`, `tests/test_orb_agent_full_brain_boundary.py`.
  **Not executed** here (no deps). Live-model jailbreak robustness is therefore UNVERIFIED.

**6. Cross-home safeguarding trends vs tenancy — requires remediation (OPEN, Q4).**
- `assistant/cross_home_safeguarding_trends.py` aggregates across homes. Tenancy scoping exists
  (`core/provider_context.py`) but enforcement on aggregated/trend features was **not** verified
  at code level. A trend feature that crossed tenancy would be a safeguarding+privacy harm.

**7. Ownership gap — requires remediation (VERIFIED governance gap).**
- O4 is a *binding* charter with **no appointed Safeguarding Lead** (founder-accountable during
  development only). This is the single most important safeguarding-governance gap.

## Verdict
**Partially aligned.** The "ORB does not decide; adults remain responsible" posture is strong
and coded. Gaps requiring remediation: UI-level human-review enforcement (verify), cross-home
trend tenancy (verify/enforce), live adversarial verification, and the unfilled Safeguarding
Lead role. No evidence ORB makes safeguarding decisions; this audit does **not** assert
children are kept safe — that remains the adults' responsibility.
