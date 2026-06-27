# E4 — Architecture Canon & ADR Governance

| Field | Value |
|---|---|
| Document ID | E4 |
| Layer | L3 — Engineering Principles |
| Version | 1.0 |
| Status | **Ratified — Version 1** |
| Ratified | 2026-06-26 (founder ratification) |
| Owner | Engineering Owner (Tom Kelly, interim) |
| Fills | The missing `ARCHITECTURE.md` referenced by `CLAUDE.md` (evidence E37) |
| Evidence base | `constitution/phase-1-discovery/` |

This document is the canonical architecture map and the rule that significant decisions are
recorded as ADRs. It **fills the `ARCHITECTURE.md` reference** that `CLAUDE.md` points at but
which does not exist (Phase 1 §14). It claims no guarantees.

---

## 1. Canonical architecture (VERIFIED)

A **monolithic FastAPI backend** assembled in `core/app_factory.py` (titled "IndiCare API"),
serving a legacy frontend and fronted by a Next.js app. **VERIFIED** — `core/app_factory.py`
(E2, E23). Request path: middleware stack (`core/middleware.py:73-101`) → routers
(`core/router_loader.py`, ~279 references in 16 groups) → auth dependency
(`auth/current_user.py`) → policy/tenancy (`core/policy_engine.py`,
`core/provider_context.py`) → services / `assistant/` → AI gateway
(`services/ai_gateway_service.py`) → PostgreSQL. **VERIFIED** (E18, E20–E24, E28, E16).

Router groups carry a **classification** (`canonical` / `mixed` / `primary` /
`legacy_compatibility`) and `required_routers`, so canonical vs legacy surfaces are encoded
in the loader. **VERIFIED** — `core/router_loader.py` (E20).

---

## 2. Monorepo boundary map (DERIVED — the governed boundary)

**DERIVED** (Phase 1 §2, evidence E7–E12). The repository is a **multi-product monorepo**,
not a single backend. The constitution governs these boundaries:

| Component | Role | Status |
|---|---|---|
| FastAPI backend (`core/`, `routers/`, `services/`, `assistant/`, `auth/`, `db/`) | The platform | Canonical |
| `frontend-next/` | Canonical modern UI (deployed) | Canonical |
| `frontend/` | Legacy UI served by backend | Legacy |
| `indicare-frontend-next/`, `indicare-ai/` | Additional UI surfaces | Relationship UNVERIFIED (Q8) |
| `life_echo/`, `apps/lifeecho-web/` | LifeEcho — second in-repo product | Inherits constitution (C1); own spec deferred |

---

## 3. Architecture Decision Records (VERIFIED)

ADRs 0001–0006 exist and are adopted as the decision record. **VERIFIED** — `ls
docs/architecture/` (E38): chronology-as-truth-plane; therapeutic recording & language
governance; provider context & trust boundaries; operational memory & replayability;
document-OS as evidence infrastructure; assistant-as-copilot-not-authority (ADR-0006, E6).

**Rule:** significant architectural or safeguarding-relevant decisions are recorded as new
ADRs, numbered sequentially, and referenced from this canon.

---

## 4. Known architectural risks (carried forward, not hidden)

| Risk | Label | Note |
|---|---|---|
| Import-time startup patches mutate routing/behaviour; one file unimported | VERIFIED / risk (E45, Q5) | `startup_*_patch.py`; fold into reviewed assembly. |
| Dead duplicate root router | VERIFIED (E41) | Remove or justify. |
| Three migration locations | VERIFIED (E42) | Governed by E3. |
| Full API surface not mapped (229 routers; loader + 1 router read) | UNVERIFIED (§6, A6) | Generate an OpenAPI export when runnable. |
| `frontend-next` vs `indicare-frontend-next` relationship | UNVERIFIED (Q8) | Clarify. |
| `CLAUDE.md` references missing `ARCHITECTURE.md` | VERIFIED (E37) | This document fills it. |

---

## 5. Current State vs Future Vision

**Current State (VERIFIED / DERIVED).** The architecture spine is clear and verified; ADRs
exist; the monorepo boundary is now mapped. But the full API surface is unmapped, some
surfaces' relationships are unverified, and import-time patches add hidden behaviour.

**Future Vision (NOT YET BUILT).** A generated, authoritative API/surface map; resolved
import-time patches; clarified frontend relationships; LifeEcho's own product spec; CI checks
that significant changes carry an ADR.

---

## 6. What this document does not claim
- It does **not** present a complete endpoint-level API map; that is UNVERIFIED (filename
  inference for most of the 229 routers).
- It does **not** modify `CLAUDE.md`; it satisfies the `ARCHITECTURE.md` reference as a new
  document.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder. Any change requires an explicitly proposed, versioned, approved amendment. |
