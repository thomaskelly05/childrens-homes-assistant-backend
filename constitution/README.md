# The IndiCare Intelligence Constitution

| Field | Value |
|---|---|
| Purpose | Index and reading guide for the IndiCare Intelligence Constitution |
| Type | Living index — maintained by the Documentation Owner (Tom Kelly, interim) |
| Last updated | 2026-06-26 |
| Change control | See `CONSTITUTION_CHANGE_CONTROL.md` |

---

## What this is

The IndiCare Intelligence Constitution is the governing framework for how IndiCare
Intelligence builds and operates. It governs **internal decision-making** — how the company
and its contributors (human and AI) prioritise, decide, and build — so that the child remains
central and adults stay responsible.

It is **company-level**. **ORB Residential is the first product governed by it**; LifeEcho and
future products inherit from it where relevant.

**ORB supports reflection, recording and evidence gathering. Adults remain responsible for
judgement, safeguarding escalation and final records.**

### What this Constitution does NOT claim

It makes **no claim** of guaranteed compliance, guaranteed safety, guaranteed security, or
automated/AI safeguarding decision-making. Every document separates **Current State**
(implemented, evidenced) from **Future Vision** (not yet built), and non-trivial factual
claims carry evidence labels (VERIFIED / DERIVED / INFERRED / FUTURE VISION / UNVERIFIED /
OUT OF SCOPE).

---

## ⚠ Open named risk — NR-1

**NR-1: AI egress is not yet enforced through a single governed chokepoint.** Governance is
split across more than one module and at least one request-reachable AI path (the provider
adapter, and the raw-client ORB Voice TTS path) does not yet demonstrate mandatory
privacy/redaction/cost/safety governance before provider egress.

- **NR-1 is OPEN** and is a high-priority pre-launch remediation item.
- **No public claim may state that "all AI egress is governed"** until NR-1 is fixed or
  formally re-verified.
- ORB Voice TTS must not be used in live provider contexts involving real child, staff, home,
  or safeguarding information until the egress risk is fixed or formally justified.

Owned by A2; cross-referenced in A1, E2, E6, P1, S1, C1, O4, O5.

---

## The hierarchy (see `documents/00-constitutional-hierarchy.md`)

Two orderings, never confused:

- **Structural authority** (which document governs): Constitution → Operating Principles →
  Engineering Principles → AI/Model Standards → Product Standards → Product Specifications →
  Implementation. *Implementation sits beneath the Constitution, never above it.*
- **Value ranking** (which principle wins): child welfare → safeguarding → professional
  judgement → truthfulness → privacy → trust → product quality → engineering quality →
  commercial sustainability → speed of delivery. *A lower value never compromises a higher one.*
- **Binding charters** (cross-cutting): Safeguarding (O4) and Data Protection & Privacy (O5)
  bind every layer.

---

## Ratified documents by layer

All documents are ratified Version 1 (or 1.1 where amended), 2026-06-26.

### L1 — Constitution
- `documents/00-constitutional-hierarchy.md` — **v1.1** — the spine: structural + value orderings.
- `documents/C1-indicare-intelligence-constitution.md` — **v1.1** — the supreme document.

### L2 — Operating Principles
- `documents/O1-mission-and-values.md` — v1.0
- `documents/O2-decision-ownership-and-governance-roles.md` — v1.0
- `documents/O3-commercial-sustainability-standard.md` — v1.0
- `documents/O4-safeguarding-charter.md` — **v1.1** — *binding charter*
- `documents/O5-data-protection-and-privacy-charter.md` — **v1.1** — *binding charter*

### L3 — Engineering Principles
- `documents/E1-engineering-principles.md` — v1.0
- `documents/E2-security-and-access-control-standard.md` — v1.0 *(NR-1 cross-ref)*
- `documents/E3-operational-and-release-governance-standard.md` — v1.0
- `documents/E4-architecture-canon-and-adr-governance.md` — v1.0
- `documents/E5-contributing-and-agent-governance.md` — v1.0
- `documents/E6-quality-and-verification-standard.md` — v1.0 *(NR-1 verification control)*

### L4 — AI / Model Standards
- `documents/A1-ai-safety-and-boundaries-standard.md` — v1.0 *(NR-1 cross-ref)*
- `documents/A2-model-provider-prompt-memory-and-routing-governance.md` — **v1.1** *(owns NR-1)*

### L5 — Product Standards
- `documents/P1-product-standards.md` — v1.0

### L6 — Product Specifications
- `documents/S1-orb-residential-product-specification.md` — v1.0 *(NR-1 caveat)*

### Cross-cutting
- `documents/X1-glossary-and-source-of-truth-index.md` — v1.0

**18 documents in total.** (LifeEcho's product specification, S2, is deferred.)

---

## Suggested reading order

1. `documents/00-constitutional-hierarchy.md` (read first)
2. `documents/C1-indicare-intelligence-constitution.md`
3. Operating layer: O1, O2, O3, **O4**, **O5**
4. Engineering layer: E1, E2, E3, E4, E5, E6
5. AI/Model layer: A1, **A2 (NR-1)**
6. Product: P1, S1
7. `documents/X1-glossary-and-source-of-truth-index.md` (terms + source-of-truth map)

---

## Repository layout

```
constitution/
├── README.md                     ← this index
├── CONSTITUTION_CHANGE_CONTROL.md ← how the Constitution may change
├── documents/                    ← the 18 ratified constitutional documents
├── phase-1-discovery/            ← evidence base (discovery, coverage, evidence index, open questions, review board)
└── phase-2-plan/                 ← the Phase 2 plan that sequenced the documents
```

---

## Relationship to existing governance files

This Constitution **references but does not modify** `CLAUDE.md` and
`ORB_ENGINEERING_PRINCIPLES.md`. Any change to those files must be a separate, versioned
proposal (see `CONSTITUTION_CHANGE_CONTROL.md`). The 463 existing `docs/` files are addressed
by the Q2 decision recorded in X1 (ADRs/trust/security promoted as subordinate standards;
remainder indexed; nothing deprecated without a per-document decision).
