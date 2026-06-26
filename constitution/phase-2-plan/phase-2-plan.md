# Phase 2 Plan — The IndiCare Intelligence Constitution

**Status: PLAN ONLY. No constitutional document bodies are written.**
This document sequences and specifies Phase 2. It is the deliverable of "prepare the
Phase 2 plan." Writing of any constitutional body begins **only** on explicit founder
authorisation.

Branch: `docs/indicare-constitution` · Base: `08ca6f4` · Date: 2026-06-26
Builds on: `constitution/phase-1-discovery/` (approved with conditions).

This plan supersedes the document set proposed in
`constitution/phase-1-discovery/constitutional-architecture.md` (the old D1–D13). The
mapping from D1–D13 to the new layered model is given in §4. Nothing in Phase 1 is
discarded; it is re-shaped to the founder's hierarchy and extended.

---

## 1. Founder decisions and conditions — binding inputs

These govern Phase 2. Each is carried into the plan and traceable to a deliverable.

| # | Founder input | Where honoured in this plan |
|---|---|---|
| D1 | **Scope:** company-level IndiCare Intelligence Constitution; ORB Residential is first product; LifeEcho + future products inherit. Not ORB-only. | §2, §3 (L1/L6), §4 |
| D2 | **Hierarchy first:** define the constitutional hierarchy before individual documents. | §3 (the layer model) and §5 Step 1 (hierarchy is the first body written) |
| C3 | **Carry forward the gaps**, not hide them. | §6 Carry-Forward Gaps Register |
| C4 | **Commercial sustainability** is a constitutional concern. | §4 O3; §3 (Operating layer) |
| C5 | **Decision ownership:** define roles separately even if one person holds many. | §4 O2; §7 Role Model |
| C6 | **No overclaiming:** no guaranteed compliance / AI safety / security / automated safeguarding; current vs future vision separated. | §8 Writing Standard |
| C7 | **Existing files locked:** no edits to `CLAUDE.md` / `ORB_ENGINEERING_PRINCIPLES.md` without a separate proposal. | §9 Existing-File Change Protocol |
| C8 | **Release governance early**, not an afterthought. | §5 (E3 pulled forward to first writing batch) |

Mandatory wording, reused verbatim wherever the concept appears (never paraphrased):
**ORB supports reflection, recording and evidence gathering. Adults remain responsible
for judgement, safeguarding escalation and final records.**

---

## 2. Scope of the Constitution (resolves Q1)

- The Constitution governs **IndiCare Intelligence** as a company-level framework.
- **ORB Residential** is the first product governed by it.
- **LifeEcho** and future products **inherit** from it where relevant, and may add their
  own Product Specification beneath the shared standards.
- The **multi-product monorepo boundary** (Discovery §2: four frontends + LifeEcho as an
  in-repo standalone product) is itself a governed fact, carried in the Architecture
  Canon (§4 E4) and the Glossary/Source-of-Truth index (§4 X1).

**Still needs founder input before writing begins:**
- **Q2 — authority over the 463 existing docs:** which are *promoted* to constitutional
  status, which become *subordinate standards*, which are *deprecated*. The plan proposes
  a default in §10; founder confirmation required.
- **Q3 / C5 — role holders:** the role *set* is proposed in §7; founder confirms holders
  (expected: founder holds several initially).

---

## 3. The constitutional hierarchy (to be ratified FIRST — D2)

Two orthogonal orderings must not be confused. Phase 2's first written body
(`00-constitutional-hierarchy.md`) will define both and how they interact.

### 3a. Structural authority (the founder's spine)
Higher tiers bind lower tiers. Implementation sits **beneath** the Constitution.

```
IndiCare Intelligence            (the governed company — the subject, not a document)
└─ Constitution                  (L1 — supreme document)
   └─ Operating Principles       (L2 — how the company operates; mission, ownership, commercial; binding charters attach here)
      └─ Engineering Principles  (L3 — engineering conduct)
         └─ AI / Model Standards (L4 — AI safety, model & provider governance, data-in-AI)
            └─ Product Standards  (L5 — quality, recording, UX, safeguarding-in-product)
               └─ Product Specifications (L6 — per product; ORB Residential first)
                  └─ Implementation        (L7 — code, tests, infra; governed, not governing)
```

### 3b. Value ranking (the principle hierarchy the Constitution declares)
The Constitution encodes this ordering; **every** structural layer must honour it. A lower
value may never compromise a higher one.

```
1 Child welfare  2 Safeguarding  3 Professional judgement  4 Truthfulness
5 Privacy  6 Trust  7 Product quality  8 Engineering quality
9 Commercial sustainability  10 Speed of delivery
```

### 3c. Binding charters (cross-cutting, value-rank authority)
**Safeguarding** (value-rank #2) and **Data Protection & Privacy** (value-rank #5) bind
**all** structural layers. Structurally they attach at the Operating layer, but their
value-authority outranks Product, Engineering, and Commercial regardless of where a
conflict arises. The hierarchy document will state this explicitly so no one argues "it's
only an operating doc."

**Why value-rank ≠ structural tier matters:** Commercial sustainability is structurally an
Operating concern (C4) but value-ranked #9 — it must never override safeguarding,
truthfulness, or privacy. The hierarchy document makes this non-negotiable.

---

## 4. Phase 2 document architecture (supersedes D1–D13)

IDs are namespaced by layer. "Old" = the Phase 1 D-number it traces to. Each document, when
written, carries separate **Current state** and **Future vision** sections (C6).

### L1 — Constitution
| ID | Document | Old | Owner role | Purpose (one line) |
|---|---|---|---|---|
| **00** | Constitutional Hierarchy | (new, from D2) | Founder | Defines 3a/3b/3c and precedence rules. **Written first.** |
| **C1** | The IndiCare Intelligence Constitution | D1 | Founder | Supreme document; mission, hierarchy reference, what IndiCare is/is not, precedence. |

### L2 — Operating Principles
| ID | Document | Old | Owner role | Purpose |
|---|---|---|---|---|
| **O1** | Mission & Values | D2 | Founder | The "why"; child central; the test question. |
| **O2** | Decision Ownership & Governance Roles | (new, C5) | Founder | Defines roles separately (see §7), even where one person holds several. |
| **O3** | Commercial Sustainability Standard | (new, C4) | Commercial Owner | Cost-aware AI, pricing affordability for homes, viability as product safety; value-rank #9. |
| **O4** | Safeguarding Charter (binding) | D5 | Safeguarding Lead | Human responsibility lines; mandatory wording; never makes safeguarding decisions. |
| **O5** | Data Protection & Privacy Charter (binding) | D7 | Data Protection Officer | No-training, redaction, classification, retention/deletion/export, subprocessors. |

### L3 — Engineering Principles
| ID | Document | Old | Owner role | Purpose |
|---|---|---|---|---|
| **E1** | Engineering Principles (ratified) | D4 | Engineering Lead | Successor framing to `ORB_ENGINEERING_PRINCIPLES.md`. **Not an edit of it** (C7, §9). |
| **E2** | Security & Access Control Standard | D8 | Engineering Lead + Security owner | RBAC, tenancy/policy, MFA/passkeys, CSRF, audit, secrets, default-credential rotation. |
| **E3** | Operational & Release Governance Standard | D10 | Release/Operations Owner | **EARLY (C8):** release path, auto-deploy-from-main risk, startup schema-doctor/migration governance, three-migration-location reconciliation. |
| **E4** | Architecture Canon & ADR Governance | D11 | Engineering Lead | Canonical map; monorepo boundaries; fills missing `ARCHITECTURE.md`. |
| **E5** | Contributing & Agent Governance | D12 | Engineering Lead | Human + AI agent contribution rules; fills missing `CONTRIBUTING.md`. |
| **E6** | Quality & Verification Standard | D9 | Engineering Lead | Definition of "tested"; ORB quality gate; honest CI-coverage gap. |

### L4 — AI / Model Standards
| ID | Document | Old | Owner role | Purpose |
|---|---|---|---|---|
| **A1** | AI Safety & Boundaries Standard | D6 | AI Safety Owner | The 14 boundaries, standalone-vs-embedded firewall, route-layer injection defence, citation/no-fabrication. |
| **A2** | Model & Provider Governance | (new, from D6/D7) | AI Safety Owner | Provider lock (OpenAI today), model selection/cost routing, data-in-AI, egress governance, model-independence roadmap (Future Vision). |

### L5 — Product Standards
| ID | Document | Old | Owner role | Purpose |
|---|---|---|---|---|
| **P1** | Product Standards | D3 | Founder + Product | Chat as front door, no surface duplication, recording quality, UX for shift reality, safeguarding-in-product. |

### L6 — Product Specifications
| ID | Document | Old | Owner role | Purpose |
|---|---|---|---|---|
| **S1** | ORB Residential Product Specification | (new) | Founder + Product | First product spec; inherits all above. Current vs Future Vision strictly separated. |
| **S2+** | LifeEcho / future product specs | (new) | per product | Inherit shared standards; deferred. |

### Cross-cutting
| ID | Document | Old | Owner role | Purpose |
|---|---|---|---|---|
| **X1** | Glossary & Source-of-Truth Index | D13 | Founder | Defines terms; indexes which doc/code is authoritative; resolves the 463-doc sprawl. |

**Total Phase 2 bodies:** 17 (00, C1, O1–O5, E1–E6, A1–A2, P1, S1, X1). S2+ deferred.

---

## 5. Sequencing and writing batches

Founder rule D2 (hierarchy first) and C8 (release governance early) drive the order. Each
batch is a **separate authorisation checkpoint** — I stop after each for review unless you
tell me to run a batch through.

**Batch 0 — Pre-writing gates (no bodies):**
- Resolve Q2 (existing-doc promotion/subordination — §10 proposes a default).
- Confirm the §7 role set and current holders.
- Confirm this document architecture (§4).

**Batch 1 — Foundation (written first, in this order):**
1. `00` Constitutional Hierarchy ← **must be first** (D2).
2. `C1` The IndiCare Intelligence Constitution.
3. `E3` Operational & Release Governance Standard ← **pulled forward** (C8).

**Batch 2 — Operating + binding charters (value-rank top):**
`O2` Decision Ownership & Roles · `O4` Safeguarding Charter · `O5` Data Protection &
Privacy Charter · `O1` Mission & Values · `O3` Commercial Sustainability.

**Batch 3 — Engineering + AI standards:**
`E1` Engineering Principles (ratified) · `E2` Security & Access Control · `E4` Architecture
Canon · `E5` Contributing & Agent Governance · `E6` Quality & Verification · `A1` AI Safety
& Boundaries · `A2` Model & Provider Governance.

**Batch 4 — Product:**
`P1` Product Standards · `S1` ORB Residential Specification · `X1` Glossary & Source-of-Truth.

Rationale: foundation and release governance first (highest authority + highest current
operational risk), then the value-rank-top charters, then engineering/AI standards, then
product. LifeEcho spec (S2) is explicitly deferred.

---

## 6. Carry-Forward Gaps Register (C3 — gaps must be carried, not hidden)

Every Phase 1 gap is assigned to a document that will record it **as a current-state
finding with its evidence label**, never as a solved problem unless it is solved.

| Phase 1 finding | Label | Carried into | Recorded as |
|---|---|---|---|
| `CLAUDE.md` references 3 missing files (SAFETY/ARCHITECTURE/CONTRIBUTING) (E37, §14) | VERIFIED | E4 (Architecture Canon fills ARCHITECTURE), E5 (fills CONTRIBUTING), O4/A1 (safety content); X1 indexes | Current gap + the documents that close it |
| Auto-deploy from `main` + startup schema-doctor/migrations + narrow CI = no full-test/migration gate (A1, Q9) | INFERRED risk | **E3 (early)** | Current operational risk + target controls (Future Vision) |
| Three migration locations, partly manual (A4, Q6) | VERIFIED / risk | E3 | Current state + reconciliation plan |
| No named safeguarding lead / DPO / AI / engineering owner (Q3) | UNVERIFIED | O2 (+ owners on O4/O5/A1/E1) | Roles defined separately even if one holder (C5) |
| Default admin password in examples (E43, A5, Q10) | VERIFIED | E2 | Current state + mandatory rotation control |
| Doc sprawl, no source-of-truth index (E40, §14) | VERIFIED | X1 | Current state + index |
| Multi-product monorepo boundary (E7–E12, §2) | DERIVED | E4, X1, S-layer | Governed boundary fact |
| AI governance boundaries (E4–E5, E16, E32, E51–E55) | VERIFIED | A1, A2 | Current implemented controls (not "guaranteed safe") |
| Gateway sole-egress unproven (Review Board; open-questions §E) | UNVERIFIED | A2 + E6 | Open question + verification task |
| Import-time startup patches; one unimported (A2, Q5) | VERIFIED/risk | E3/E4 | Current state + intent to resolve |
| Dead duplicate root router (E41, A3, Q7) | VERIFIED | E4 (+ housekeeping note) | Current state |
| Tests not executed in discovery; fixture fragility (A8, Q11) | VERIFIED not-run | E6 | Honest coverage statement |
| Every-router policy enforcement unverified (A6, Q4) | UNVERIFIED | E2 | Open verification task |

---

## 7. Decision Ownership & Role Model (C5 — proposal for O2)

Roles are **defined separately** even though the founder currently holds several. This is
the candidate set for your confirmation (Batch 0); it is **not** written as a body yet.

| Role | Accountable for | Likely initial holder |
|---|---|---|
| Founder / CEO | Constitution ratification; mission; precedence decisions | Tom |
| Responsible Individual (Ofsted sense) | Regulatory responsibility for the service | Tom / TBC |
| Safeguarding Lead | O4 Safeguarding Charter; escalation posture | **TBC — gap** |
| Data Protection Officer | O5 Privacy Charter; no-training; retention | **TBC — gap** |
| AI Safety Owner | A1/A2; boundaries; model governance | Tom / TBC |
| Engineering Lead | E1–E6; architecture; security | Tom / TBC |
| Release / Operations Owner | E3; production release; migration governance | Tom / TBC |
| Commercial Owner | O3; pricing affordability; viability | Tom / TBC |

O2 will state: where one person holds multiple roles, that concentration is **named as a
current risk** (bus-factor) with a Future-Vision separation path — consistent with C6
(no overclaiming) and the Review Board (Investor lens).

---

## 8. Writing Standard for Phase 2 bodies (C6 — no overclaiming)

Every constitutional body MUST:
1. Use the evidence labels from Phase 1 (VERIFIED / DERIVED / INFERRED / FUTURE VISION /
   UNVERIFIED / OUT OF SCOPE) for non-trivial factual claims.
2. Carry **separate** "Current state (implemented)" and "Future vision (not yet built)"
   sections. No blending.
3. **Never** claim: guaranteed compliance; guaranteed AI safety; guaranteed security;
   automated/AI safeguarding decisions; that ORB replaces adults, managers, social
   workers, or Ofsted.
4. Use the mandatory wording verbatim wherever human-responsibility is asserted.
5. Prefer "supports / helps evidence / prompts reflection / improves consistency" over
   "guarantees / automates / replaces" (per `ORB_ENGINEERING_PRINCIPLES.md` §11).
6. Cite repository evidence (path + line) for any claim of current capability.

A short **claims-review checklist** will be applied to each body before it is presented.

---

## 9. Existing-File Change Protocol (C7)

- `CLAUDE.md` and `ORB_ENGINEERING_PRINCIPLES.md` are **not edited** during Phase 2.
- E1 (Engineering Principles, ratified) is written as a **successor/superset that
  references** `ORB_ENGINEERING_PRINCIPLES.md`, not a replacement of the file.
- If Phase 2 surfaces a needed change to either file (e.g. fixing the three broken
  references in `CLAUDE.md`), it is captured in a **separate proposal**
  `constitution/proposed-changes/` for your review — never applied inline.

---

## 10. Open decisions needed from you before Batch 1 writing

| Ref | Decision | Proposed default (for your yes/no) |
|---|---|---|
| Q2 | Which existing docs are promoted / subordinated / deprecated? | **Promote** the ADRs (`docs/architecture/adr-*`), the trust pack (`docs/trust/`), and security docs (`docs/security/`) to *subordinate standards referenced by* the relevant Phase 2 docs; **index** the rest via X1; **deprecate** nothing without a per-doc decision. |
| C5 | Confirm the §7 role set and initial holders. | As tabled; safeguarding & DPO holders marked TBC. |
| §4 | Confirm the 17-document architecture and IDs. | As tabled. |
| §5 | Confirm batch sequencing (hierarchy first, release governance in Batch 1). | As tabled. |
| Output | Do you want the eventual bodies on this branch, or a fresh `docs/indicare-constitution-phase-2` branch? | This branch. |

---

## 11. What this plan explicitly does NOT do
- Does not write `00`, `C1`, or any other body.
- Does not edit `CLAUDE.md` or `ORB_ENGINEERING_PRINCIPLES.md`.
- Does not assert any role holder without your confirmation.
- Does not treat any open question (Q2, Q3, gateway-egress, router enforcement) as resolved.

**Next action:** await founder answers to §10 and explicit authorisation to begin Batch 1
writing. No constitutional body will be written before that authorisation.
