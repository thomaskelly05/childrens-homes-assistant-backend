# 00 — The Constitutional Hierarchy

| Field | Value |
|---|---|
| Document ID | 00 |
| Layer | L1 — Constitution (the spine all other documents hang from) |
| Version | 1.1 |
| Status | **Ratified — Version 1.1** |
| Ratified | 2026-06-26 (v1.0 founder ratification; v1.1 versioned consistency amendment, same date) |
| Owner | Founder (Tom Kelly, interim) |
| Supersedes | The informal ordering implied across `CLAUDE.md`, `ORB_ENGINEERING_PRINCIPLES.md`, and `docs/architecture/` |
| Evidence base | `constitution/phase-1-discovery/` (approved with conditions) |

This document defines the structure of authority for IndiCare Intelligence. It must be read
before any other constitutional document, because it states **which document wins, which
principle wins, and how conflicts are resolved.** It is written per the founder decision
that the hierarchy is defined *before* individual documents.

It claims no guarantees. It governs how decisions are ordered; it does not assert that the
system is compliant, safe, or secure. Those words are reserved and qualified throughout
the constitution.

---

## 1. The governed entity

**DERIVED** — IndiCare Intelligence is the company-level entity this constitution governs.
ORB Residential is the first product governed by it; LifeEcho and future products inherit
from it where relevant. (Founder decision, 2026-06-26; supported by Phase 1 §2 finding that
the repository is a multi-product monorepo — `repository-discovery.md` §2, evidence E7–E12.)

```
IndiCare Intelligence  (company)
├─ ORB Residential     (first product — governed in full)
├─ LifeEcho            (in-repo product — inherits shared standards; own spec deferred)
└─ Future products     (inherit shared standards)
```

The child remains central across every product and every layer. Every decision under this
constitution must be able to answer: *Does this help adults care better, record safer, and
evidence the child's experience more clearly?*

---

## 2. Two orderings, never to be confused

Authority in IndiCare Intelligence runs along **two independent axes**. Mixing them is a
governance error. Both are defined here and both bind every layer.

- **2a. Structural authority** — which *document* governs which.
- **2b. Value ranking** — which *principle* wins when two principles collide.

A document can be structurally junior yet enforce a senior value (a safeguarding charter
sits at the Operating layer but its value-rank outranks all product and engineering
concerns). Section 4 resolves how the two interact.

---

## 2a. Structural authority (the spine)

Higher tiers bind lower tiers. **Implementation sits beneath the Constitution, never above
it.** Code does not get to override a principle by existing.

```
IndiCare Intelligence              ← the governed company (subject, not a document)
└─ Constitution                    (L1)  supreme document
   └─ Operating Principles         (L2)  how the company operates; binding charters attach here
      └─ Engineering Principles    (L3)  engineering conduct
         └─ AI / Model Standards   (L4)  AI safety, model & provider governance, data-in-AI
            └─ Product Standards    (L5)  quality, recording, UX, safeguarding-in-product
               └─ Product Specs     (L6)  per product; ORB Residential first
                  └─ Implementation (L7)  code, tests, infrastructure — governed, not governing
```

**Rule S1.** A lower structural tier may add detail and constraint, but may never grant a
permission that a higher tier withholds. A Product Specification (L6) cannot authorise
behaviour that AI / Model Standards (L4) forbid.

**Rule S2.** Implementation (L7) is evidence of *what is*, never authority for *what ought
to be*. A behaviour existing in code does not make it constitutional. Where code and a
higher tier disagree, the higher tier governs and the code is recorded as a gap to close.

**Rule S3.** Each tier names an accountable owner role (see document O2, not yet written).
Ownership does not move down the stack by default.

---

## 2b. Value ranking (the principle hierarchy)

When two principles conflict, the higher-numbered-importance principle wins. **A lower
value may never be used to justify compromising a higher one.**

```
1  Child welfare
2  Safeguarding
3  Professional judgement
4  Truthfulness
5  Privacy
6  Trust
7  Product quality
8  Engineering quality
9  Commercial sustainability
10 Speed of delivery
```

**Rule V1.** A record that is not truthful (4) cannot support safeguarding (2) or protect a
child (1). Truthfulness is therefore load-bearing for everything above it, not a luxury.

**Rule V2.** Commercial sustainability (9) and speed of delivery (10) are real and
necessary — IndiCare must be viable and must ship — but they sit **below** safety, privacy,
and truthfulness. Neither may override a higher value. "We need to ship" never authorises a
safeguarding or privacy compromise.

**Rule V3.** Professional judgement (3) belongs to the adult, not the system. This is
binding on every AI surface: **ORB supports reflection, recording and evidence gathering.
Adults remain responsible for judgement, safeguarding escalation and final records.**

---

## 2c. Binding charters (cross-cutting)

Two domains bind **every** structural layer regardless of where a conflict surfaces:

- **Safeguarding** (value-rank #2) — governed by the Safeguarding Charter (O4 — ratified
  binding charter).
- **Data Protection & Privacy** (value-rank #5) — governed by the Privacy Charter (O5 —
  ratified binding charter).

**Rule B1.** These charters attach structurally at the Operating layer (L2) but their
value-authority overrides Product (L5), Engineering (L3), AI/Model (L4), and Commercial
concerns. No lower tier may dilute them by claiming "that is only an operating document."

---

## 3. The document set this hierarchy governs

**DERIVED** (from the approved Phase 2 plan and the ratified document set). *Updated in v1.1:
this section was drafted in Batch 1 when only the foundation existed and previously stated a
total of 17 with the remainder as FUTURE VISION; it now reflects the post-ratification state.*

The constitution comprises **18 documents** across the layers, **all ratified** (Version 1,
with 00/C1/O4/O5 at Version 1.1) on 2026-06-26. The state column below is current.

| Layer | Documents (ID) | State |
|---|---|---|
| L1 Constitution | 00 Hierarchy (v1.1), C1 Constitution (v1.1) | **Ratified** |
| L2 Operating | O1 Mission & Values, O2 Roles, O3 Commercial, O4 Safeguarding Charter (v1.1, binding), O5 Privacy Charter (v1.1, binding) | **Ratified** |
| L3 Engineering | E1 Engineering Principles, E2 Security & Access *(NR-1)*, **E3 Release Governance**, E4 Architecture Canon, E5 Contributing & Agent Gov, E6 Quality & Verification *(NR-1)* | **Ratified** |
| L4 AI / Model | A1 AI Safety & Boundaries *(NR-1)*, A2 Model/Provider/Prompt/Memory/Routing *(owns NR-1)* | **Ratified** |
| L5 Product Standards | P1 Product Standards | **Ratified** |
| L6 Product Specs | S1 ORB Residential Spec *(NR-1 caveat; LifeEcho S2 deferred)* | **Ratified** |
| Cross-cutting | X1 Glossary & Source-of-Truth Index | **Ratified** |

*Supporting (not counted among the 18 governed documents):* `README.md` (index) and
`CONSTITUTION_CHANGE_CONTROL.md` (ratified v1). **Named Risk NR-1 remains OPEN** (owned by A2)
regardless of ratification.

---

## 4. Conflict-resolution procedure

When a decision is contested, resolve in this order:

1. **Identify the values in tension** (§2b). If one value clearly outranks the other, the
   higher value governs the outcome. Stop here for value conflicts.
2. **Identify the governing documents** (§2a). The higher structural tier's document
   governs the *rule*; a binding charter (§2c) overrides lower tiers within its domain.
3. **If a document is silent**, defer upward to the next tier, and ultimately to the
   Constitution (C1) and this hierarchy (00).
4. **If the Constitution is silent**, the decision escalates to the Founder (interim holder
   of multiple roles — see §5), and the resolution is recorded so the constitution can be
   amended.
5. **Record the decision and its evidence.** Truthfulness (value #4) requires that
   contested decisions are documented, not just made.

**Worked example (illustrative, not a current claim):** A proposal speeds delivery (value
10) by auto-generating a safeguarding record without adult review. Value ranking decides it
immediately: safeguarding (2) and professional judgement (3) outrank speed (10); the
binding Safeguarding Charter (§2c) governs; the proposal is refused. This mirrors an
existing coded boundary — **VERIFIED**: AI must not make safeguarding decisions and records
require adult review (`assistant/ai_boundaries.py`, evidence E4; `CLAUDE.md` non-negotiables).

---

## 5. Ownership of the hierarchy

**VERIFIED (founder decision, 2026-06-26).** Interim role holders:

| Role | Interim holder |
|---|---|
| Founder | Tom Kelly |
| Product Owner | Tom Kelly |
| Engineering Owner | Tom Kelly |
| AI Safety Owner | Tom Kelly |
| Documentation Owner | Tom Kelly |
| **Safeguarding Lead** | **TBC — recorded current governance gap** |
| **Data Protection Officer** | **TBC — recorded current governance gap** |

**Carried-forward gap (honest record, per founder condition).** Two of the roles that own
*binding charters* (Safeguarding Lead → O4; DPO → O5) are **unfilled**. This is a current
governance gap, not silently filled. Until filled, the Founder holds these responsibilities
on an interim basis, and the concentration of roles in one person is itself a named risk
(bus-factor) to be addressed — see `phase-1-discovery/open-questions.md` Q3 and the Review
Board (Investor lens). Amendment of this hierarchy requires Founder ratification.

---

## 6. Current State vs Future Vision

**Current State (VERIFIED / DERIVED).**
- This hierarchy was established in Phase 2 Batch 1, **ratified as Version 1 on 2026-06-26**,
  and amended to **Version 1.1** the same day. The full document set beneath it (18 documents)
  is now **ratified**; it remains newly adopted and not yet enforced by tooling.
- Substantial governance *content* already exists, but **distributed** across 463 docs,
  code boundaries, and ADRs with no single ordering — the reason this document exists
  (`repository-discovery.md` §13–14, evidence E37, E40).
- No automated enforcement of this hierarchy exists in CI today.

**Future Vision (NOT YET BUILT — explicitly not a current claim).**
- An independent Safeguarding Lead and an independent/external DPO function appointed; roles
  separated in practice, not just on paper. NR-1 closed (fixed or formally re-verified).
- Enforcement hooks (e.g. CI checks that a PR touching a higher tier is reviewed against
  this hierarchy) — aspirational; none exist today.
- The hierarchy referenced from contributor and AI-agent onboarding (E5, future).

---

## 7. What this document does not claim

- It does **not** claim IndiCare Intelligence is compliant, safe, or secure. It orders how
  those concerns are governed.
- It does **not** assert that lower tiers currently conform to higher tiers; Phase 1 found
  gaps, carried forward honestly across the constitution.
- It does **not** edit or override `CLAUDE.md` or `ORB_ENGINEERING_PRINCIPLES.md`; it sits
  above them and references them. Those files remain unmodified.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 1) | Initial draft presented for founder review. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder following Batch 1 review. Any change requires an explicitly proposed, versioned, approved amendment. |
| 1.1 | 2026-06-26 | **Ratified — Version 1.1** | Versioned consistency amendment following PR review (resolves P2 review comment on §3). Corrected the stale document-set count (was "17" / remainder "FUTURE VISION") to the post-ratification state: **18 documents, all ratified**; refreshed §2c binding-charter references, the §3 table, and the §6 current/future wording. NR-1 remains OPEN. No substance of the hierarchy changed. |
