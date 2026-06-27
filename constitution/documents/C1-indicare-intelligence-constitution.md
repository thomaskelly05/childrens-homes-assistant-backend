# C1 — The IndiCare Intelligence Constitution

| Field | Value |
|---|---|
| Document ID | C1 |
| Layer | L1 — Constitution (supreme document) |
| Version | 1.2 |
| Status | **Ratified — Version 1.2** |
| Ratified | 2026-06-26 (v1.0 ratification; v1.1 consistency amendment); 2026-06-27 (v1.2 founder role clarification) |
| Owner | Founder (Tom Kelly, interim) |
| Reads with | `00-constitutional-hierarchy.md` (read that first) |
| Evidence base | `constitution/phase-1-discovery/` |

This is the supreme document of IndiCare Intelligence. Every other document, standard,
specification, and line of code is subordinate to it. It is deliberately short: it states
what is true, what is binding, and what is not yet built. It claims no guarantees.

---

## Preamble

IndiCare Intelligence exists to build ethical intelligence for Ofsted-regulated children's
homes. The child remains central. We support the adults who care for children to think,
write, record, evidence and reflect better. We do not replace them.

**ORB supports reflection, recording and evidence gathering. Adults remain responsible for
judgement, safeguarding escalation and final records.**

This sentence is binding and appears verbatim wherever the responsibility of the adult is
asserted. It is not decoration. It is the line between a tool that helps and a tool that
harms.

---

## Article 1 — What IndiCare Intelligence is

**DERIVED.** IndiCare Intelligence is a company-level framework. ORB Residential is its
first product. LifeEcho and future products inherit from this constitution where relevant.
(Founder decision, 2026-06-26; Phase 1 §2, evidence E7–E12.)

**VERIFIED.** The platform today is a monolithic FastAPI backend (`core/app_factory.py`
titled "IndiCare API", evidence E2) that serves a legacy frontend and is fronted by a
modern Next.js application, with ORB/assistant intelligence, governance, safeguarding,
chronology, documents, reports, and compliance surfaces (`core/router_loader.py`, evidence
E20–E22). It is a **multi-product monorepo**, not a single backend (evidence E7–E12) — a
fact this constitution governs rather than hides.

---

## Article 2 — What ORB is and is not

**ORB is** a support for adults: it helps them think clearly, write clearly, record
honestly and defensibly, organise facts, improve recording quality, prepare evidence, and
reduce workload without reducing professional responsibility.
**VERIFIED** — this is how the system is actually built: the standalone assistant identity
is grounded in the nine Ofsted Quality Standards, primary-source guidance links, and
explicit care values (`assistant/prompts.py`, evidence E54–E55).

**ORB is not** a replacement for adults, managers, safeguarding processes, social workers,
LADO, police, medical professionals, Ofsted, or professional judgement.
**VERIFIED** — this is coded as hard boundaries, not merely promised: ORB "does not replace
professional judgement," "must not make safeguarding decisions," and "must not invent facts
… citations …" (`assistant/ai_boundaries.py`, evidence E4), reinforced by the architectural
decision that the assistant is an "operational copilot, not operational authority"
(ADR-0006, evidence E6).

**ORB supports reflection, recording and evidence gathering. Adults remain responsible for
judgement, safeguarding escalation and final records.**

---

## Article 3 — The hierarchy

This constitution adopts, in full, the structure defined in `00-constitutional-hierarchy.md`:

- **Structural authority:** Constitution → Operating Principles → Engineering Principles →
  AI/Model Standards → Product Standards → Product Specifications → Implementation.
  Implementation sits beneath the Constitution.
- **Value ranking:** child welfare > safeguarding > professional judgement > truthfulness >
  privacy > trust > product quality > engineering quality > commercial sustainability >
  speed of delivery. A lower value never compromises a higher one.
- **Binding charters:** Safeguarding (#2) and Data Protection & Privacy (#5) bind every
  layer.

Where any document, decision, or implementation conflicts with this ordering, this ordering
governs and the conflict is recorded as a gap to close.

---

## Article 4 — Non-negotiables

Carried from the operating reality already encoded in `CLAUDE.md` and
`ORB_ENGINEERING_PRINCIPLES.md` (referenced, **not** modified). These are constitutional:

1. Do not introduce AI features that silently create, edit, save, send, or escalate records
   without adult review. **VERIFIED** as existing intent (`CLAUDE.md` non-negotiables).
2. Do not make safeguarding decisions. **VERIFIED** (`assistant/ai_boundaries.py`, E4).
3. Do not diagnose children or adults. **VERIFIED** (`assistant/ai_boundaries.py`).
4. Do not invent facts, evidence, citations, case details, or compliance status.
   **VERIFIED** (boundary 3, E4).
5. Do not overclaim that ORB guarantees compliance. **VERIFIED** as existing rule
   (`CLAUDE.md`); reinforced by Article 7 below.
6. Do not expose identifiable child, staff, provider, or safeguarding information in logs,
   test data, public output, or screenshots. **VERIFIED** as existing rule (`CLAUDE.md`);
   supported by redaction/privacy services (evidence E16, and `services/ai_redaction_service.py`).
7. Do not break working `/orb` routes; chat is the front door unless the founder changes it.
   **VERIFIED** as existing rule (`CLAUDE.md`).

---

## Article 5 — Governance and ownership

**VERIFIED (founder decision, 2026-06-26).** Roles are defined separately even where one
person currently holds several. Interim holders:

| Role | Interim holder | Owns (future documents) |
|---|---|---|
| Founder | Tom Kelly | 00, C1, O1 |
| Product Owner | Tom Kelly | P1, S1 |
| Engineering Owner | Tom Kelly | E1, E2, E3, E4, E5, E6 |
| AI Safety Owner | Tom Kelly | A1, A2 |
| Documentation Owner | Tom Kelly | X1 |
| Commercial Owner | Tom Kelly | O3 |
| Release / Operations Owner | Tom Kelly (interim) | E3 |
| Safeguarding accountability (interim) | Tom Kelly (interim accountable holder — **not** an independent Safeguarding Lead) | O4 |
| Data Protection Owner / ICO-named data protection contact | Tom Kelly (interim — **not** an independent DPO) | O5 |

**Carried-forward gap (honest record).** *Updated in v1.2 (founder role clarification,
2026-06-27).* **All internal governance roles sit with Tom Kelly as the interim accountable
holder**, including **safeguarding accountability** and **data-protection ownership**. This is
**not** an independent Safeguarding Lead appointment and **not** an independent DPO arrangement
— it is the founder-led interim reality, recorded without pretending independent roles exist.
For data protection, IndiCare Intelligence is **ICO registered** and Tom Kelly is the
**ICO-named data protection contact** (founder-attested). Independent safeguarding and
external/independent data-protection support remain **future scaling priorities**, given the
sensitivity of children's social care data (see O2, O4, O5). The Responsible Individual remains
**provider-side** and is not assumed by ORB or IndiCare unless IndiCare becomes a registered
provider. The concentration of roles in one person is a named **bus-factor and independence
risk**. Future Vision: appoint an independent Safeguarding Lead and an independent/external DPO
function and separate the roles in practice.

---

## Article 6 — Carried-forward gaps (Phase 1 findings, not hidden)

Per founder condition, the constitution names the gaps Phase 1 discovered. Each is carried
into a named document (some not yet written — FUTURE VISION) and recorded with its label.

| Gap | Label | Carried to |
|---|---|---|
| `CLAUDE.md` references three missing files (`SAFETY.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`) | VERIFIED (E37) | E4 fills ARCHITECTURE; E5 fills CONTRIBUTING; O4/A1 the safety content |
| Auto-deploy from `main` + startup schema-doctor/migrations + narrow CI = no enforced full-test/migration gate before production schema change | INFERRED risk (A1, Q9) | **E3 (this batch)** |
| Three migration locations, partly manual | VERIFIED (E42) | E3 |
| Safeguarding Lead unfilled; data protection has a named ICO contact (Tom Kelly) but no independent DPO | UNVERIFIED ownership (Q3) | Article 5; O2/O4/O5 |
| Default admin password in examples | VERIFIED (E43) | E2; noted in E3 |
| 463 docs, no source-of-truth index | VERIFIED (E40) | X1 |
| Multi-product monorepo boundary | DERIVED (E7–E12) | E4, X1, S-layer |
| AI governance boundaries (implemented, not guaranteed) | VERIFIED (E4, E16, E32, E51–E55) | A1, A2 |
| AI gateway sole-egress unproven — **Named Risk NR-1** (AI egress not enforced through a single governed chokepoint) | UNVERIFIED / OPEN (open-questions §E) | A2 (owns NR-1), A1, E2, E6 |
| Per-router policy enforcement unverified | UNVERIFIED (Q4) | E2 |

This table is the constitution's promise that nothing found in discovery is buried.

---

## Article 7 — The honesty principle

Truthfulness is value #4 and load-bearing for all safety above it. Therefore:

- No document under this constitution may claim **guaranteed** compliance, **guaranteed** AI
  safety, **guaranteed** security, or **automated/AI safeguarding decision-making**. These
  claims are constitutionally prohibited.
- Every document separates **Current State (implemented, evidenced)** from **Future Vision
  (not yet built)**. The two are never blended.
- Non-trivial factual claims carry an evidence label
  (VERIFIED / DERIVED / INFERRED / FUTURE VISION / UNVERIFIED / OUT OF SCOPE).
- We say "supports / helps evidence / prompts reflection / improves consistency," not
  "guarantees / automates / replaces" — consistent with `ORB_ENGINEERING_PRINCIPLES.md` §11
  (referenced, unmodified).

---

## Article 8 — Relationship to existing governance files

**VERIFIED.** `CLAUDE.md` and `ORB_ENGINEERING_PRINCIPLES.md` already exist and carry real
operating and engineering doctrine. This constitution **sits above and references** them; it
does **not** modify them. Any future change to either file must be presented as a separate
proposal for founder review (per founder condition and the Phase 2 plan §9), never applied
inline. The ratified engineering successor (E1) will reference
`ORB_ENGINEERING_PRINCIPLES.md` rather than replace the file.

---

## Article 9 — Amendment

This constitution is amended only by the Founder (interim holder of multiple roles, Article
5). Amendments are recorded with their date and rationale so that truthfulness (value #4) is
preserved across the document's history. This document was ratified as **Version 1** by the
Founder on **2026-06-26** following Batch 1 review. Any change to a ratified document
requires an explicitly proposed, versioned, and approved amendment.

---

## Current State vs Future Vision (summary)

**Current State (VERIFIED / DERIVED).** The product's *safety intent is strong and
encoded* (Articles 2, 4). The *governance layer is ratified but still incomplete*: the
Safeguarding Lead binding-charter role is unfilled, data protection has a named ICO contact
(Tom Kelly) but no independent DPO, enforcement is manual, and several operational risks
(Article 6) are open — including **Named Risk NR-1** (AI egress not enforced through a single
governed chokepoint; see A2). Much governance content exists but is distributed and unordered.

**Future Vision (NOT YET BUILT).** A fully ratified constitution (18 documents); an appointed
independent Safeguarding Lead and an independent/external DPO function; NR-1 closed; an enforced
release/quality gate; a single source-of-truth index; and the multi-product framework extended
cleanly to LifeEcho and beyond. None of this is claimed as present today.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 1) | Initial draft presented for founder review. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder following Batch 1 review. Any change requires an explicitly proposed, versioned, approved amendment. |
| 1.1 | 2026-06-26 | **Ratified — Version 1.1** | Versioned consistency amendment following whole-constitution review. Corrected stale Data Protection wording (ICO registered; Tom Kelly is ICO-named data protection contact / interim DP Owner, not an independent DPO; independent/external support is a future scaling priority); Safeguarding Lead remains a recorded unfilled gap; added canonical **NR-1** reference to the sole-egress gap. No other substance changed. |
| 1.2 | 2026-06-27 | **Ratified — Version 1.2** | Founder role clarification (Article 5) recorded honestly: all internal governance roles sit with Tom Kelly as the interim accountable holder, incl. safeguarding accountability and data-protection ownership; explicitly **not** independent Safeguarding Lead / DPO appointments; independent safeguarding + external/independent DP support are future scaling priorities; concentration is a bus-factor/independence risk; Responsible Individual remains provider-side. No independent roles implied; no other meaning changed. |
