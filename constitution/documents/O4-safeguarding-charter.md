# O4 — Safeguarding Charter (Binding)

| Field | Value |
|---|---|
| Document ID | O4 |
| Layer | L2 — Operating Principles · **Binding charter** (value-rank #2; binds every layer) |
| Version | 1.1 |
| Status | **Ratified — Version 1.1** |
| Ratified | 2026-06-26 (v1.0 founder ratification with ownership decisions; v1.1 versioned consistency amendment, same date) |
| Owner | **Safeguarding Lead — TBC, not yet formally filled (current governance gap).** The Founder (Tom Kelly) is accountable for safeguarding posture during development; this is **not** an independent Safeguarding Lead appointment. |
| Reads with | `00` (§2c binding charters), `C1` (Articles 2, 4), `A2` (Named Risk NR-1), `docs/ai-safety.md` |
| Evidence base | `constitution/phase-1-discovery/` |

This is a **binding charter**. Its value-authority (safeguarding, value-rank #2) overrides
Product, Engineering, AI/Model, and Commercial concerns wherever they conflict (00 §2c). It
claims no guarantees: it does not, and cannot, promise that children are kept safe. It
governs how the system supports the adults who carry that responsibility.

---

## 1. The line that must never move

**ORB supports reflection, recording and evidence gathering. Adults remain responsible for
judgement, safeguarding escalation and final records.**

This sentence is binding and appears verbatim wherever the responsibility of the adult is
asserted.

---

## 2. What ORB must never do (VERIFIED — already coded)

These are not aspirations; they are implemented boundaries.

- **ORB must not make safeguarding decisions** on behalf of staff, managers, providers,
  social workers, LADO, police, medical professionals, or emergency services.
  **VERIFIED** — `assistant/ai_boundaries.py` boundary 2 (evidence E4).
- **ORB must not make the final safeguarding threshold decision.**
  **VERIFIED** — `assistant/prompts.py:350` ("avoid making the final safeguarding threshold
  decision").
- **ORB must not state safeguarding determinations.** It must not say *"no safeguarding
  concern"*, *"no further action needed"*, *"this is safe"*, *"this is compliant"*, *"ready
  for inspection"*, or *"ORB has determined"*. **VERIFIED** — `assistant/prompts.py:358` and
  `:492-494`.
- **ORB must not advise bypassing** safeguarding procedures, management escalation, local
  authority processes, LADO, police, emergency services, medical advice, or organisational
  policy. **VERIFIED** — `assistant/ai_boundaries.py` boundary 6 (E4).
- **ORB must not invent** facts, incidents, disclosures, injuries, actions, outcomes,
  citations, or safeguarding escalations. **VERIFIED** — `assistant/ai_boundaries.py`
  boundary 3 (E4); `assistant/prompts.py:451`.
- **ORB must not diagnose** children or adults. **VERIFIED** — `assistant/ai_boundaries.py`
  boundary 5; `CLAUDE.md` non-negotiables.

---

## 3. What ORB must do (VERIFIED — already coded)

- **Prioritise immediate safety and escalation** where the situation suggests urgent or
  heightened risk. **VERIFIED** — `assistant/ai_boundaries.py` boundary 7;
  `assistant/prompts.py:222` ("urgent safeguarding: lead with immediate safety and
  escalation").
- **Encourage local safeguarding procedures** and escalation to the appropriate manager,
  on-call, safeguarding lead, social worker, police, LADO, or emergency services where
  relevant, and record who was informed. **VERIFIED** — `assistant/prompts.py:347-348, 354`.
- **Distinguish observation, interpretation, concern, pattern, and inference**, and label
  gaps where information is incomplete. **VERIFIED** — `assistant/ai_boundaries.py`
  boundaries 4, 11 (E4).
- **Use children's-home language** (manager, senior on shift, Registered Manager, local
  safeguarding procedure) rather than defaulting to school-based DSL terminology unless the
  user supplied it. **VERIFIED** — `assistant/prompts.py:415`.
- **Keep records proportionate** — not adding disproportionate safeguarding paragraphs or
  automatic escalation to ordinary daily records without cues. **VERIFIED** —
  `assistant/prompts.py:416`.

---

## 4. Human-in-the-loop requirement

No AI-generated record, reflection, escalation, or report may be created, edited, saved,
sent, or escalated **without adult review** (C1 Article 4(1); `CLAUDE.md` non-negotiables).
The architectural position is settled: the assistant is an operational copilot, not an
operational authority. **VERIFIED** — ADR-0006 (evidence E6).

The standalone assistant must not access live operational child records; only the embedded
OS assistant may use scoped operational context. **VERIFIED** — `docs/ai-safety.md`
(evidence E32). This boundary is safeguarding-relevant because it limits the blast radius of
any error to non-identifiable context in the standalone surface.

**Cross-reference — Named Risk NR-1 (A2) [added in v1.1].** Safeguarding AI boundaries are
**strongest where calls pass through the governed routes** (the governed chat path and the
named gateway, where redaction and external-call evaluation run before egress). Because AI
egress is **not yet enforced through a single governed chokepoint** (A2 Named Risk NR-1 —
e.g. the provider-adapter and ORB Voice TTS paths), boundary enforcement is only as
consistent as the route taken. **NR-1 remains OPEN until fixed or formally re-verified**, and
until then no claim may be made that safeguarding boundaries apply uniformly to every AI call.

---

## 5. Verification signals (VERIFIED existence; behaviour not executed here)

- Adversarial safety testing: `tests/test_orb_adversarial_safety_firewall.py`.
- Full-brain boundary testing: `tests/test_orb_agent_full_brain_boundary.py`.
- Cross-home safeguarding trends: `assistant/cross_home_safeguarding_trends.py` with
  `tests/test_cross_home_safeguarding_trends.py`.

**Honest limit:** no test was executed during discovery (deps absent, evidence E49). These
are signals of intent and coverage, not proof of live robustness.

---

## 6. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| **Safeguarding Lead not yet formally filled** | UNVERIFIED ownership (Q3) | This charter's own owner seat is empty. The Founder is accountable for safeguarding posture during development, but this is **not** an independent Safeguarding Lead. The most important independence gap in the constitution; a future priority (founder decision, 2026-06-26). |
| Cross-home trend aggregation may cross tenancy | OPEN (Q4) | Tenancy scoping exists (`core/provider_context.py`) but trend-aggregation enforcement was not verified at code level. |
| AI gateway sole-egress unproven — **Named Risk NR-1 (A2)** | UNVERIFIED / OPEN (open-questions §E) | If any AI call bypasses governed routes, boundary enforcement could be inconsistent. Boundaries strongest on governed routes; NR-1 open until fixed/re-verified. |
| Releases touching safeguarding surfaces lack a required human-review gate | UNVERIFIED (E3 R11) | Carried in E3; not yet enforced. |

---

## 7. Current State vs Future Vision

**Current State (VERIFIED).** The safeguarding boundaries are **coded and tested in mock**,
strongly and specifically. But the charter has **no appointed owner**, enforcement
completeness (tenancy on trends, gateway egress, release review) is unverified, and nothing
was executed live in discovery.

**Future Vision (NOT YET BUILT).** An appointed, independent Safeguarding Lead; verified
tenancy enforcement on aggregated/trend features; a confirmed sole-egress AI gateway; a
required safeguarding-review gate for relevant releases (E3 R11); periodic adversarial
boundary audits with live models.

---

## 8. What this charter does not claim
- It does **not** claim ORB keeps children safe, or that safeguarding outcomes are assured.
- It does **not** claim the boundaries are unbreakable; jailbreak robustness was not
  executed here.
- It does **not** fill the Safeguarding Lead role; that gap is recorded.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 2) | Initial draft presented for founder review. Owner seat (Safeguarding Lead) recorded as unfilled. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder as a binding charter. Safeguarding Lead remains unfilled (founder-accountable during development, not an independent appointment) and recorded as a current governance gap and future priority. Any change requires an explicitly proposed, versioned, approved amendment. |
| 1.1 | 2026-06-26 | **Ratified — Version 1.1** | Versioned consistency amendment following whole-constitution review. Added canonical cross-reference to **Named Risk NR-1 (A2)**: safeguarding boundaries are strongest on governed routes; NR-1 remains OPEN until fixed or formally re-verified. No other substance changed. |
