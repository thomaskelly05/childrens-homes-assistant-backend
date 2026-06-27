# X1 — Glossary & Source-of-Truth Index

| Field | Value |
|---|---|
| Document ID | X1 |
| Layer | Cross-cutting |
| Version | 1.0 |
| Status | **Ratified — Version 1** (a source-of-truth spine, not a claim that all 463 docs are reconciled) |
| Ratified | 2026-06-26 (founder ratification) |
| Owner | Documentation Owner (Tom Kelly, interim) |
| Reads with | All constitutional documents |
| Evidence base | `constitution/phase-1-discovery/` |

This document defines key terms and indexes **which document or code is the source of truth**
for each domain, so the 463 existing Markdown files (evidence E40) gain a navigable spine. It
resolves the Phase 1 finding that "no document tells you which document wins" (§14).

---

## 1. Glossary

| Term | Meaning |
|---|---|
| **IndiCare Intelligence** | The company-level entity the Constitution governs. |
| **ORB Residential** | The first product governed by the Constitution. |
| **IndiCare OS** | The platform/backend (FastAPI) that ORB and OS surfaces run on. |
| **LifeEcho** | A second in-repo product (`life_echo/`); inherits the Constitution; own spec deferred. |
| **Standalone vs embedded assistant** | Standalone = no live OS records; embedded = scoped operational context (`docs/ai-safety.md`). |
| **Station** | A product surface/workspace within ORB (e.g. shift builder, records workspace). |
| **Chronology** | The operational truth plane of events (ADR-0001). |
| **Evidence graph / operational memory** | Linked operational evidence and replayable memory (ADR-0004/0005). |
| **Governed gateway / governed egress** | An AI call passing privacy decision + redaction + cost/usage before provider egress (A2). |
| **Named Risk NR-1** | AI egress is not yet enforced through a single governed chokepoint (A2). |
| **Binding charter** | A charter (O4 Safeguarding, O5 Privacy) whose value-authority overrides lower structural tiers. |
| **Structural authority / value ranking** | The two orderings defined in `00` (which document governs / which principle wins). |
| **Responsible Individual (RI)** | An Ofsted regulatory role belonging to the **provider**, not an internal IndiCare role (O2 §3). |
| **Data classification** | Typed sensitivity scheme (`schemas/data_protection.py`: CONFIDENTIAL_CHILD, SAFEGUARDING_SENSITIVE, …). |
| **SCCIF / Quality Standards** | Ofsted's Social Care Common Inspection Framework / the nine Children's Homes Quality Standards. |
| **Reg 44 / Reg 45** | Children's Homes Regulations 2015 independent visit (44) and quality-of-care review (45). |

---

## 2. Source-of-truth index

For each domain, the authoritative constitutional document and the code/docs it rests on.

| Domain | Authoritative document | Rests on (code / existing docs) |
|---|---|---|
| Hierarchy & precedence | `00` | — |
| The Constitution | `C1` | `CLAUDE.md`, ADR-0006 |
| Mission & values | `O1` | `CLAUDE.md`, `ORB_ENGINEERING_PRINCIPLES.md`, `assistant/prompts.py` |
| Decision ownership / roles | `O2` | founder decisions |
| Commercial sustainability | `O3` | `services/ai_gateway_service.py`, Stripe billing |
| **Safeguarding (binding)** | `O4` | `assistant/ai_boundaries.py`, `assistant/prompts.py:325-358`, ADR-0006, `docs/trust/orb-human-review-and-safeguarding.md` |
| **Privacy (binding)** | `O5` | `schemas/data_protection.py`, `services/ai_redaction_service.py`, `docs/security/`, `docs/trust/` |
| Engineering principles | `E1` | `ORB_ENGINEERING_PRINCIPLES.md`, `CLAUDE.md` |
| Security & access control | `E2` | `auth/rbac.py`, `core/policy_engine.py`, `core/provider_context.py`, `core/middleware.py` |
| Release & operations | `E3` | `render.yaml`, `core/lifespan.py`, `backend/db/` |
| Architecture & ADRs | `E4` | `core/router_loader.py`, `docs/architecture/adr-0001..0006` |
| Contributing & agents | `E5` | `CLAUDE.md`, `AGENTS.md` |
| Quality & verification | `E6` | `.github/workflows/orb-scenario-quality-gate.yml`, `scripts/`, `assistant/evals/` |
| AI safety & boundaries | `A1` | `assistant/ai_boundaries.py`, `assistant/citation_enforcer.py`, `docs/ai-safety.md` |
| Model/provider/prompt/memory/routing + **NR-1** | `A2` | `assistant/llm_provider.py`, `services/ai_gateway_service.py`, `services/ai_external_call_governance.py` |
| Product standards | `P1` | `CLAUDE.md`, `assistant/prompts.py` |
| ORB Residential spec | `S1` | `assistant_orb` router group, `routers/orb_*.py` |

---

## 3. Status of the 463 existing documents (founder decision Q2)

**VERIFIED (founder decision, 2026-06-26).**
- **Promoted** to subordinate standards referenced by the relevant constitutional documents:
  the ADRs (`docs/architecture/adr-*`), the trust pack (`docs/trust/`), and security docs
  (`docs/security/`).
- **Indexed** through this document: the remaining `docs/` content (existing source-of-truth
  maps such as `docs/architecture/single-source-of-truth-map.md` and
  `docs/indicare-intelligence-domain-map.md` are referenced here as inputs, not authorities).
- **Deprecated:** none — no existing document is deprecated without a separate per-document
  decision.

---

## 4. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| 463 docs not yet fully reconciled to this index | VERIFIED (E40) | Index is a spine, not a completed reconciliation. |
| Some surfaces' relationships unverified (e.g. two Next.js frontends) | UNVERIFIED (Q8) | Carried in E4. |
| NR-1 visible across A1/A2/E2/E6/P1/S1 | OPEN | High-priority pre-launch (A2). |

---

## 5. Current State vs Future Vision

**Current State (VERIFIED / DERIVED).** A first source-of-truth index now exists, mapping each
domain to its authoritative constitutional document and underlying code/docs. Full
reconciliation of all 463 documents is not complete.

**Future Vision (NOT YET BUILT).** Every `docs/` file classified (promoted/subordinate/indexed/
deprecated) with per-document decisions; the index maintained as documents change; an
independent Documentation Owner (O2).

---

## 6. What this document does not claim
- It does **not** claim the 463 documents are fully reconciled; it provides the spine.
- It does **not** deprecate any existing document without a separate decision.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 4) | Initial draft presented for founder review. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder as a source-of-truth spine (not a claim that all 463 docs are reconciled). Q2 decision confirmed: ADRs/trust/security promoted as subordinate standards; remaining docs indexed; nothing deprecated without a per-document decision. Any change requires an explicitly proposed, versioned, approved amendment. |
