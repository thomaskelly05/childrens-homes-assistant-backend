# P1 — Product Standards

| Field | Value |
|---|---|
| Document ID | P1 |
| Layer | L5 — Product Standards |
| Version | 1.0 |
| Status | **Ratified — Version 1** |
| Ratified | 2026-06-26 (founder ratification) |
| Owner | Product Owner (Tom Kelly, interim) |
| Reads with | `O1` Mission & Values, `O4`/`O5` (binding), `A1`/`A2` (AI), `E1` |
| Evidence base | `constitution/phase-1-discovery/` |

These are the product-level standards every IndiCare Intelligence product follows. They are
subordinate to the Constitution, Operating Principles, Engineering Principles, and AI/Model
Standards, and they bind the Product Specifications beneath them (S-layer). No guarantees are
claimed.

---

## 1. Chat is the front door (VERIFIED)

Chat is the primary way users meet the product, unless the founder changes it. **VERIFIED** as
an existing non-negotiable (`CLAUDE.md`); the standalone ORB surfaces are built around it
(`routers/orb_standalone_routes.py`; assistant_orb router group, evidence E21).

---

## 2. No surface duplication (VERIFIED)

No duplicate routes, stations, prompts, or state systems. **VERIFIED** as an existing rule
(`CLAUDE.md`); the router loader already encodes canonical vs legacy-compatibility surfaces
(`core/router_loader.py` classifications, E20). Phase 1 found a dead duplicate router (E41) —
exactly what this standard prevents.

---

## 3. Recording quality (VERIFIED — encoded)

Generated writing must be factual, warm, balanced, therapeutic, person-centred, specific,
evidence-based, and free from judgemental wording, and must clearly separate observation from
interpretation. The system should prompt adults to include: what happened; what was observed;
what the child may have been communicating; the child's voice where known; what adults did;
what helped; what did not; and follow-up/oversight/escalation where needed. **VERIFIED** —
`CLAUDE.md` "ORB tone and behaviour"; `assistant/prompts.py` recording-excellence block
(E54–E55). Records may one day be read by the young person (O1 §3).

---

## 4. Keep the adult in control (binding — O4)

Any AI-generated record, report, reflection, or prompt must be reviewable and editable before
use. No silent creation, editing, saving, sending, or escalation of records. **VERIFIED** as
an existing non-negotiable (`CLAUDE.md`; C1 Article 4; O4). **ORB supports reflection,
recording and evidence gathering. Adults remain responsible for judgement, safeguarding
escalation and final records.**

---

## 5. Designed for shift reality (VERIFIED)

Products must work for busy, interrupted, tired adults on mobile, with poor Wi-Fi, under
inspection pressure, in emotionally charged situations. **VERIFIED** —
`ORB_ENGINEERING_PRINCIPLES.md` §8. Tone is calm, safe, specialist, premium, human-centred
(`CLAUDE.md`).

---

## 6. Honest product claims (binding — C1 Article 7; NR-1)

- No product claim of guaranteed compliance, guaranteed safety, guaranteed security, or
  automated/AI safeguarding decisions.
- Use "supports / helps evidence / prompts reflection / improves consistency," not
  "guarantees / automates / replaces."
- **AI, Voice, and Dictate claims must keep Named Risk NR-1 visible** (A2): until NR-1 is
  fixed or re-verified, no product surface or marketing may claim that all AI egress is
  governed. This is binding on the ORB Residential Specification (S1).

---

## 7. Cost-aware product behaviour (O3)

Product features must respect cost as a feature (O3): avoid unnecessary large prompts,
duplicated context, hidden retries, or expensive default models. **VERIFIED** controls exist
(`services/ai_gateway_service.py` soft limits, E16–E17).

---

## 8. Current State vs Future Vision

**Current State (VERIFIED / DERIVED).** These standards are largely encoded already across
`CLAUDE.md`, `ORB_ENGINEERING_PRINCIPLES.md`, and `assistant/prompts.py`, and reflected in the
router taxonomy. They are not yet enforced by tooling, and NR-1 constrains AI/Voice/Dictate
claims.

**Future Vision (NOT YET BUILT).** Product-level checks (e.g. claim review, surface-duplication
guards); NR-1 closed so AI/Voice claims can be made; an independent Product Owner (O2).

---

## 9. What this document does not claim
- It does **not** claim every product surface currently meets every standard; gaps are carried.
- It does **not** permit any AI/Voice/Dictate claim that contradicts NR-1.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 4) | Initial draft presented for founder review. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder as the product-layer standard for IndiCare Intelligence products. Any change requires an explicitly proposed, versioned, approved amendment. |
