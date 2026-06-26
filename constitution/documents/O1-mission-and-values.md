# O1 — Mission & Values

| Field | Value |
|---|---|
| Document ID | O1 |
| Layer | L2 — Operating Principles |
| Version | 0.1 — Phase 2 Batch 2 draft |
| Status | **Drafted — awaiting founder review. Not yet ratified.** |
| Owner | Founder (Tom Kelly, interim) |
| Reads with | `C1-indicare-intelligence-constitution.md`, `00-constitutional-hierarchy.md` |
| Evidence base | `constitution/phase-1-discovery/` |

This document states the "why." It is subordinate to the Constitution (C1) and the
Hierarchy (00). It claims no guarantees.

---

## 1. Mission

IndiCare Intelligence builds ethical intelligence for Ofsted-regulated children's homes.
ORB Residential, its first product, supports the adults who care for children to think,
write, record, evidence and reflect better.

**The child remains central.**

**ORB supports reflection, recording and evidence gathering. Adults remain responsible for
judgement, safeguarding escalation and final records.**

---

## 2. The north-star test

**VERIFIED** as the existing, encoded test (`CLAUDE.md` "Product truth";
`ORB_ENGINEERING_PRINCIPLES.md` §1). Every feature, change, and decision must be able to
answer:

> Does this help adults care better, record safer, and evidence the child's experience more
> clearly?

If the answer is unclear, pause before building.

---

## 3. Records are part of a child's story

**VERIFIED** (`ORB_ENGINEERING_PRINCIPLES.md` §2). For children in care, records may become
part of their lifelong story. Build with the assumption that every generated prompt,
rewritten sentence, summary, report, or suggested reflection may one day be read by the
young person it describes. Records must be factual, warm, balanced, person-centred,
dignified, specific, and free from blaming or punitive language.

---

## 4. Values

**VERIFIED** — these values are not aspirational slogans; they are already encoded as the
care values that shape ORB's writing (`assistant/prompts.py` `CARE_VALUES`, evidence E54):

- child-centred
- relationship-based
- trauma-informed
- autism-aware / neurodiversity-respecting
- non-punitive
- professionally accountable
- clear, steady, defensible
- warm but boundaried
- inspection-aware
- evidence-led

**VERIFIED** — ORB's practice reasoning is anchored to the nine Ofsted Quality Standards
and primary-source guidance (`assistant/prompts.py` `QUALITY_STANDARDS`,
`OFFICIAL_GUIDANCE_LINKS`, evidence E54), so values connect to regulation rather than
floating free.

---

## 5. How values bind

These values sit under the constitutional value ranking (00 §2b): child welfare,
safeguarding, professional judgement, and truthfulness outrank product, engineering,
commercial, and speed. A value in this document may never be used to justify compromising a
higher-ranked constitutional value.

The honesty principle (C1 Article 7) applies here too: we describe what helps adults, and we
do not claim ORB cares *for* children. Adults care; ORB supports.

---

## 6. Current State vs Future Vision

**Current State (VERIFIED / DERIVED).** The mission and values are real and encoded across
`CLAUDE.md`, `ORB_ENGINEERING_PRINCIPLES.md`, and `assistant/prompts.py`. They have not, until
now, existed as a single ratified statement — Phase 1 found governance content distributed
across 463 documents (evidence E40).

**Future Vision (NOT YET BUILT).** A single quotable mission-and-values statement used in
product, onboarding, sales, and pilot materials without overclaiming; values measured
against real outcomes for children and homes rather than asserted.

---

## 7. What this document does not claim
- It does not claim ORB improves outcomes for children directly; it helps the adults who do.
- It does not claim the values are fully realised in every surface; Phase 1 named gaps that
  the rest of the constitution carries forward.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 2) | Initial draft presented for founder review. |
