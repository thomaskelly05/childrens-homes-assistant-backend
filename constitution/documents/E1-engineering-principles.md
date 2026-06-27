# E1 — Engineering Principles (Ratified Successor)

| Field | Value |
|---|---|
| Document ID | E1 |
| Layer | L3 — Engineering Principles |
| Version | 1.0 |
| Status | **Ratified — Version 1** |
| Ratified | 2026-06-26 (founder ratification) |
| Owner | Engineering Owner (Tom Kelly, interim) |
| Relationship | **Successor that references** `ORB_ENGINEERING_PRINCIPLES.md` — it does **not** modify or replace that file. |
| Evidence base | `constitution/phase-1-discovery/` |

This document brings engineering conduct under the constitution. It **references**
`ORB_ENGINEERING_PRINCIPLES.md` and `CLAUDE.md` as authoritative existing sources and does
not edit them (founder condition; Phase 2 plan §9). Where this document and those files
agree, those files remain the working text; this document adds constitutional standing and
cross-references.

Engineering quality is value-rank #8 — below child welfare, safeguarding, professional
judgement, truthfulness, privacy, trust, and product quality. Good engineering serves those;
it never overrides them.

---

## 1. Principles carried (VERIFIED — already documented)

The twelve principles in `ORB_ENGINEERING_PRINCIPLES.md` are adopted as constitutional
engineering principles. **VERIFIED** (`ORB_ENGINEERING_PRINCIPLES.md`, read in full in Phase
1). In summary, not replacement:

1. The child comes first.
2. Records are part of a child's story.
3. Support professional judgement.
4. Safety before cleverness (factual > fluent; transparent > magical; explainable >
   automated; safe > fast; useful > impressive).
5. Be honest with uncertainty.
6. Change carefully (read before writing; smallest safe change).
7. Test what matters.
8. Design for real children's homes (shift reality, mobile, poor Wi-Fi).
9. Simplicity is the default.
10. Cost is a product feature.
11. Preserve trust.
12. Build to last.

---

## 2. Working standard (VERIFIED — from CLAUDE.md)

**VERIFIED** (`CLAUDE.md` "Working standard"). Before changing code: read the existing files;
identify the current route/state/component/API/data flow; state the assumption; make the
smallest safe change; do not rewrite working areas unnecessarily; do not introduce duplicate
routes/stations/prompts/state systems; test the thing changed and the nearest working flow;
say clearly what changed, what was not, and what still needs verification.

The relevance is concrete: Phase 1 found a **dead duplicate router at the repository root**
(`routersyoung_people_statutory_documents_routes.py`, unreferenced; evidence E41) — exactly
the kind of duplication this standard exists to prevent.

---

## 3. Constitutional engineering rules

- **Read before writing.** No blank rewrites of working areas without explicit, justified
  need and a rollback plan.
- **Smallest safe change.** Large refactors require justification and rollback.
- **Keep the adult in control.** Any AI-generated record, report, reflection, or prompt must
  be reviewable and editable before use (binding via O4; C1 Article 4).
- **Cost-aware AI.** Avoid unnecessary large prompts, repeated calls, hidden retries,
  expensive default models, duplicated context (governed by O3; VERIFIED controls exist —
  `services/ai_gateway_service.py` soft limits, evidence E16–E17).
- **Error handling.** Errors must be clear, calm, safe, and must not expose sensitive data
  (binding via O5).
- **Verification before "done."** Do not say "complete" unless implemented and verified
  (E6 governs what "verified" means).

---

## 4. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| Dead duplicate root router | VERIFIED (E41) | Housekeeping; remove or justify. |
| Import-time startup patches mutate behaviour; one unimported | VERIFIED / risk (E45, Q5) | Fold into reviewed assembly (E4). |
| Full test/type/lint not gated in CI | VERIFIED (E34) | Governed by E6, E3. |
| `CLAUDE.md` references missing `SAFETY.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` | VERIFIED (E37) | E4 and E5 fill the architecture/contributing references. |

---

## 5. Current State vs Future Vision

**Current State (VERIFIED).** Strong engineering doctrine already exists
(`ORB_ENGINEERING_PRINCIPLES.md`, `CLAUDE.md`). It is not yet enforced by tooling, and Phase
1 found concrete examples of the rules being needed (duplicate router, import-time patches).

**Future Vision (NOT YET BUILT).** Enforcement in CI (E6); the missing referenced files
filled by E4/E5; an independent Engineering Owner distinct from founder/product (O2).

---

## 6. What this document does not claim
- It does **not** modify `ORB_ENGINEERING_PRINCIPLES.md` or `CLAUDE.md`; it references them.
  Any proposed change to those files goes through a separate, versioned proposal.
- It does **not** claim the codebase currently conforms to every principle; gaps are carried.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder. Any change requires an explicitly proposed, versioned, approved amendment. |
