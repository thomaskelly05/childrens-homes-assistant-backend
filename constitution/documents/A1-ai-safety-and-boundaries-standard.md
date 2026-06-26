# A1 — AI Safety & Boundaries Standard

| Field | Value |
|---|---|
| Document ID | A1 |
| Layer | L4 — AI / Model Standards |
| Version | 0.1 — Phase 2 Batch 3 draft |
| Status | **Drafted — awaiting founder review. Not yet ratified.** |
| Owner | AI Safety Owner (Tom Kelly, interim) |
| Reads with | `O4` (Safeguarding Charter, binding), `O5` (Privacy Charter, binding), `A2` |
| Evidence base | `constitution/phase-1-discovery/` |

This standard consolidates the AI safety boundaries that protect children, adults, and
truthfulness. It is subordinate to the binding charters (O4, O5) and **makes no claim of
guaranteed AI safety** (C1 Article 7). The strongest-evidenced area of the codebase.

---

## 1. The boundary block (VERIFIED — implemented)

Fourteen hard AI boundaries are defined and **appended to system prompts**, declared to
override style "where necessary for safety, accuracy, and accountability." **VERIFIED** —
`assistant/ai_boundaries.py:3-17` (the boundaries) and `:18-60` (`append_ai_boundaries`,
the override) — evidence E4, E5. They include: does not replace professional judgement; must
not make safeguarding decisions; must not invent facts/citations; must distinguish fact /
observed / interpretation / uncertainty; no diagnosis; must not advise bypassing escalation;
must prioritise immediate safety; must label gaps.

---

## 2. Prompt construction governance (VERIFIED — implemented)

- Prompts are centralised, not scattered string literals: `assistant/prompts.py`,
  `assistant/prompt_router.py`, `services/ai_prompts.py`,
  `services/assistant_prompt_policy.py`, `services/orb_prompt_registry.py`. **VERIFIED**
  (E30).
- The standalone assistant identity is grounded in the nine Ofsted Quality Standards,
  primary-source guidance, and care values. **VERIFIED** — `assistant/prompts.py:14-90`
  (E54–E55).
- A safeguarding operating block sets explicit recording/escalation language and **banned
  determinations** ("no safeguarding concern", "no further action needed", "this is safe",
  "this is compliant", "ready for inspection", "ORB has determined"). **VERIFIED** —
  `assistant/prompts.py:325-358, 492-494` (this is the engine behind the O4 charter).

---

## 3. Scope isolation and injection defence (VERIFIED — implemented)

- **Standalone vs embedded firewall:** the standalone assistant must not access live OS
  child records; only the embedded assistant uses scoped operational context. **VERIFIED** —
  `docs/ai-safety.md` (E32); enforced via `OrbResidentialGuardMiddleware`
  (`core/middleware.py`).
- **Route-layer prompt-injection defence:** **VERIFIED** —
  `routers/assistant_routes.py:18` (`contains_prompt_injection_attempt` from
  `services/assistant_security.py`) — evidence E52.
- **Citation enforcement / no-fabrication:** `assistant/citation_enforcer.py`,
  `assistant/answer_quality.py`. **VERIFIED (existence)**.

---

## 4. Verification signals (VERIFIED existence; not executed)

`tests/test_orb_adversarial_safety_firewall.py`, `tests/test_orb_agent_full_brain_boundary.py`,
and the AI-governance no-raw-logging test. **Honest limit:** no test executed in discovery
(E49); robustness against live-model jailbreaks is **not** demonstrated here.

---

## 5. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| Boundaries are prompt-appended; live jailbreak robustness unproven | INFERRED | Tested in mock; not executed live (E49). |
| AI gateway sole-egress unproven | UNVERIFIED (open-questions §E) | If any call bypasses the gateway, boundary/redaction enforcement could be inconsistent. Shared with A2/O4. |
| AI Safety Owner is interim and not independent | INFERRED risk (O2) | Same person as Engineering/Product. |

---

## 6. Current State vs Future Vision

**Current State (VERIFIED).** AI safety is strongly and specifically implemented: a coded
boundary block that overrides style, centralised prompt governance, a standalone/embedded
firewall, route-layer injection defence, citation enforcement, and adversarial tests. Live
robustness and gateway-sole-egress are unverified.

**Future Vision (NOT YET BUILT).** Proven sole-egress gateway; measured adversarial
robustness against live models; an independent AI Safety Owner; periodic boundary audits.

---

## 7. What this standard does not claim
- It does **not** claim ORB is jailbreak-proof or that AI safety is guaranteed.
- It does **not** claim every AI call is governed; gateway-sole-egress is UNVERIFIED.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. |
