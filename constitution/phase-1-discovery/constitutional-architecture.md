# Constitutional Architecture — Phase 1 (Specification Only)

This document **specifies proposed future constitutional documents.** It contains **no
document bodies and no drafted content.** Nothing here is a constitution; this is a
blueprint for what Phase 2+ could write, *if* the founder approves.

Each proposed document is described by: purpose, audience, owner, repository evidence,
dependencies, cross-references, version, review schedule, priority, confidence, current
state, and future vision.

Two framing decisions are recorded as **open questions** (see `open-questions.md`) and
must be resolved before any body is written:
- **Q1 — Scope:** does the constitution govern IndiCare OS / ORB Residential only, or the
  whole monorepo including LifeEcho and the auxiliary frontends?
- **Q2 — Authority over existing docs:** the repo already contains 463 docs including
  ADRs, a trust pack, and engineering principles. The constitution must *sit above and
  reference* these, not silently duplicate or contradict them.

The **Constitutional Hierarchy** from the task is the ordering principle for every
document below: child welfare > safeguarding > professional judgement > truthfulness >
privacy > trust > product quality > engineering quality > commercial sustainability >
speed. A lower principle must never compromise a higher one.

Mandatory wording to be reused verbatim wherever the concept appears (do not paraphrase):
**ORB supports reflection, recording and evidence gathering. Adults remain responsible
for judgement, safeguarding escalation and final records.**

---

## Proposed document set

Priority key: **P0** = constitutional foundation; **P1** = core governance; **P2** =
supporting/operational. Confidence = how well repository evidence already supports
writing this document truthfully.

---

### D1 — INDICARE_CONSTITUTION.md
- **Purpose:** The top-level ratified document. States the mission, the constitutional
  hierarchy, what ORB is and is not, and the precedence rule that resolves conflicts
  between all lower documents. The single source the others defer to.
- **Audience:** Founder, all contributors (human + AI agents), future investors/auditors.
- **Owner:** Founder (Tom).
- **Repository evidence:** `CLAUDE.md` (product truth, non-negotiables);
  `ORB_ENGINEERING_PRINCIPLES.md`; `assistant/ai_boundaries.py`; ADR-0006.
- **Dependencies:** Sits above all of D2–D12. Depends on Q1 (scope) and Q2 (authority).
- **Cross-references:** All documents below.
- **Version:** v0 (unwritten). First ratified body would be v1.0.
- **Review schedule:** On every material change to product scope or hierarchy; otherwise
  annual.
- **Priority:** P0.
- **Confidence:** High that the *principles* are evidenced; the document itself does not exist.
- **Current state:** Does not exist. No `constitution/` content existed before this
  discovery (`grep -rli constitution` found none).
- **Future vision:** Becomes the document every PR and every AI agent is checked against.

---

### D2 — MISSION_AND_VALUES.md
- **Purpose:** The "why." The child remains central; ethical intelligence for
  Ofsted-regulated children's homes; the test question "Does this help adults care
  better, record safer, and evidence the child's experience more clearly?"
- **Audience:** Everyone, including non-technical stakeholders and pilot homes.
- **Owner:** Founder.
- **Repository evidence:** `CLAUDE.md` "Product truth"; `ORB_ENGINEERING_PRINCIPLES.md` §1–2.
- **Dependencies:** D1.
- **Cross-references:** D3 (product principles), D5 (safeguarding).
- **Version:** v0.
- **Review schedule:** Annual or on strategy change.
- **Priority:** P0.
- **Confidence:** High (well-evidenced in existing prose).
- **Current state:** Exists only as scattered prose in `CLAUDE.md` / principles; not a
  standalone ratified doc.
- **Future vision:** Quotable north star for product and sales without overclaiming.

---

### D3 — PRODUCT_PRINCIPLES.md
- **Purpose:** What ORB is, the product boundaries (chat as front door; stations route
  through the same brain; standalone vs embedded assistant boundary), and the
  "supports, does not replace" stance in product terms.
- **Audience:** Product, design, engineering, AI agents.
- **Owner:** Founder + product lead.
- **Repository evidence:** `CLAUDE.md` non-negotiables (chat front door, no duplicate
  routes/stations); `docs/ai-safety.md` (standalone vs embedded boundary);
  `core/router_loader.py` classifications (canonical vs legacy).
- **Dependencies:** D1, D2.
- **Cross-references:** D4 (engineering), D6 (AI safety), D11 (architecture canon).
- **Version:** v0.
- **Review schedule:** Per major product surface change.
- **Priority:** P1.
- **Confidence:** Medium-High.
- **Current state:** Distributed across `CLAUDE.md`, `docs/ai-safety.md`, ADRs.
- **Future vision:** Prevents surface sprawl (the repo already shows ~60 ORB routers and
  multiple frontends).

---

### D4 — ENGINEERING_CONSTITUTION.md (ratified successor to ORB_ENGINEERING_PRINCIPLES.md)
- **Purpose:** Binding engineering rules: read-before-write, smallest safe change,
  keep-the-adult-in-control, cost-aware AI, error handling, verification checklist.
- **Audience:** All contributors and AI coding agents.
- **Owner:** Founder + (future) engineering lead.
- **Repository evidence:** `ORB_ENGINEERING_PRINCIPLES.md` (12 principles); `CLAUDE.md`
  "Engineering rules" and "Verification checklist"; `AGENTS.md`.
- **Dependencies:** D1.
- **Cross-references:** D9 (testing/quality), D11 (architecture), D12 (contributing).
- **Version:** `ORB_ENGINEERING_PRINCIPLES.md` is effectively v1 prose; constitution
  layer would be v0 → v1.
- **Review schedule:** Per major architectural decision.
- **Priority:** P1.
- **Confidence:** High (strong existing source).
- **Current state:** Strong source exists; **must not be edited in Phase 1** (task rule).
- **Future vision:** The doc CI and agents enforce.
- **Note:** Per task, recommendations about `CLAUDE.md`/`ORB_ENGINEERING_PRINCIPLES.md`
  are allowed but **no edits** were made.

---

### D5 — SAFEGUARDING_CHARTER.md
- **Purpose:** Encodes the #2 hierarchy principle: ORB never makes safeguarding
  decisions, never advises bypassing escalation, surfaces urgency. Defines human
  responsibility lines using the mandatory wording verbatim.
- **Audience:** Registered managers, safeguarding leads, inspectors, all staff, AI agents.
- **Owner:** Founder + (named) safeguarding advisor — **gap:** no safeguarding owner is
  evidenced in-repo (open question Q3).
- **Repository evidence:** `assistant/ai_boundaries.py:3-17` (boundaries 2, 6, 7);
  `docs/trust/orb-human-review-and-safeguarding.md`; ADR-0002, ADR-0006;
  `docs/ai-safety.md`.
- **Dependencies:** D1, D2.
- **Cross-references:** D6, D7, D8.
- **Version:** v0.
- **Review schedule:** Per safeguarding-relevant change; minimum semi-annual.
- **Priority:** P0.
- **Confidence:** High that boundaries are coded; Medium that a *charter* (vs scattered
  boundaries) is consolidated.
- **Current state:** Encoded in code and trust docs; not consolidated/ratified.
- **Future vision:** The artifact an Ofsted inspector or LADO could be shown.

---

### D6 — AI_SAFETY_AND_BOUNDARIES.md
- **Purpose:** Consolidates the 14 AI boundaries, the standalone-vs-embedded scope rule,
  fact-vs-interpretation labelling, no-fabrication, no-diagnosis, citation enforcement.
- **Audience:** AI/ML engineers, reviewers, AI agents, due-diligence readers.
- **Owner:** Founder + (future) AI lead.
- **Repository evidence:** `assistant/ai_boundaries.py` (full); `docs/ai-safety.md`;
  `assistant/citation_enforcer.py`; `services/ai_external_call_governance.py`;
  tests `test_orb_adversarial_safety_firewall.py`, `test_orb_agent_full_brain_boundary.py`.
- **Dependencies:** D1, D5.
- **Cross-references:** D7 (privacy), D9 (eval/quality gate).
- **Version:** v0.
- **Review schedule:** Per model/provider change or new AI surface.
- **Priority:** P0.
- **Confidence:** High (strongest-evidenced area).
- **Current state:** Implemented in code; documented partially in `docs/ai-safety.md`.
- **Future vision:** Single canonical AI safety contract; CI quality gate maps to it.

---

### D7 — DATA_PROTECTION_AND_PRIVACY.md
- **Purpose:** #5 hierarchy principle. No-training stance, redaction, data classification,
  retention/deletion/export, subprocessors, child/staff data minimisation in logs.
- **Audience:** DPO, providers' DPOs, inspectors, investors.
- **Owner:** Founder + (gap) named DPO — none evidenced (Q3).
- **Repository evidence:** `docs/security/ai-privacy-and-no-training.md`,
  `docs/security/data-protection-overview.md`; `docs/trust/orb-privacy-and-retention.md`,
  `orb-data-deletion-and-export.md`, `orb-subprocessors.md`; `schemas/data_protection.py`
  (`DataClassification`); `services/ai_redaction_service.py`,
  `services/ai_privacy_decision_service.py`; `db/orb_privacy_requests_db.py`.
- **Dependencies:** D1, D6.
- **Cross-references:** D5, D8.
- **Version:** v0.
- **Review schedule:** Annual + on any subprocessor/model change.
- **Priority:** P0.
- **Confidence:** Medium-High (strong doc + code base; named DPO ownership missing).
- **Current state:** Substantial existing trust/security docs; not consolidated under a
  ratified constitution.
- **Future vision:** The privacy contract providers sign against.

---

### D8 — SECURITY_AND_ACCESS_CONTROL.md
- **Purpose:** RBAC + tenancy/policy model, MFA/passkeys, session/CSRF, audit logging,
  rate limiting, secrets handling.
- **Audience:** Security reviewers, engineers, providers' IT, investors.
- **Owner:** Founder + (future) security lead.
- **Repository evidence:** `auth/rbac.py`, `core/policy_engine.py`,
  `core/provider_context.py`; `core/middleware.py` (CSRF, security headers, audit, rate
  limit); `docs/security/access-control-model.md`; `docs/platform-maturity/RBAC-governance.md`;
  `sql/008_os_command_permissions_rls.sql`.
- **Dependencies:** D1, D7.
- **Cross-references:** D7, D11.
- **Version:** v0.
- **Review schedule:** Per access-model change.
- **Priority:** P1.
- **Confidence:** High.
- **Current state:** Implemented + partially documented.
- **Future vision:** Single access-control canon; resolves A5 (default admin password)
  and A6 (router-level enforcement audit).

---

### D9 — QUALITY_AND_VERIFICATION_STANDARD.md
- **Purpose:** What "tested" means: the ORB scenario quality gate, the verification
  checklist, "do not say complete unless verified," eval sets, definition of done.
- **Audience:** Engineers, reviewers, AI agents, investors.
- **Owner:** Founder + (future) QA lead.
- **Repository evidence:** `.github/workflows/orb-scenario-quality-gate.yml`;
  `scripts/run_orb_scenario_quality_gate.py`, `scripts/run_orb_launch_quality_report.py`;
  `quality/`; `assistant/evals/`; `CLAUDE.md` "Verification checklist."
- **Dependencies:** D1, D4.
- **Cross-references:** D6 (safety eval), D11.
- **Version:** v0.
- **Review schedule:** Per CI change.
- **Priority:** P1.
- **Confidence:** Medium-High. **Caveat:** CI gates only ORB scenarios, not the full test
  suite or type/lint (Discovery §12, A1). The standard must state the gap honestly, not
  imply full coverage.
- **Current state:** Quality gate exists; broader CI does not.
- **Future vision:** Enforced full-suite + migration-review gate before `main`/prod.

---

### D10 — OPERATIONAL_AND_DEPLOYMENT_GOVERNANCE.md
- **Purpose:** Deployment posture (Render, auto-deploy from `main`), startup
  schema-doctor/migration behaviour, environment/secret governance, incident response,
  release control.
- **Audience:** Operators, on-call, investors, providers.
- **Owner:** Founder + (future) ops lead.
- **Repository evidence:** `render.yaml`; `core/lifespan.py`;
  `backend/db/migration_runner.py`, `backend/db/schema_doctor.py`;
  `docs/trust/orb-incident-response.md`; `deploy/`.
- **Dependencies:** D1, D8, D9.
- **Cross-references:** D9.
- **Version:** v0.
- **Review schedule:** Per infra change.
- **Priority:** P1.
- **Confidence:** Medium-High. Must name risk A1 (no gate between merge and prod schema
  change) and A4 (three migration locations).
- **Current state:** Behaviour exists; not governed by a ratified doc.
- **Future vision:** Controlled, reviewable path to production.

---

### D11 — ARCHITECTURE_CANON.md (and ADR governance)
- **Purpose:** Canonical architecture map + the rule that significant decisions are
  recorded as ADRs. Defines "canonical vs legacy compatibility" surfaces and the
  monorepo boundary map (the four frontends + LifeEcho).
- **Audience:** Engineers, AI agents, investors, auditors.
- **Owner:** Founder + (future) architect.
- **Repository evidence:** `docs/architecture/adr-0001..0006`;
  `core/router_loader.py` (group classifications); `core/app_factory.py`;
  `life_echo/__init__.py`; `render.yaml`. **Fills the gap:** `CLAUDE.md` references a
  missing `ARCHITECTURE.md` (Discovery §14) — this document would satisfy that reference.
- **Dependencies:** D1, D4.
- **Cross-references:** D3, D8, D10.
- **Version:** ADRs are at 0006; canon doc is v0.
- **Review schedule:** Per ADR.
- **Priority:** P1.
- **Confidence:** Medium (architecture spine verified; full surface map not — A6/§6).
- **Current state:** ADRs exist; no single canon or boundary map; the referenced
  `ARCHITECTURE.md` is missing.
- **Future vision:** Authoritative map newcomers and agents trust.

---

### D12 — CONTRIBUTING_AND_AGENT_GOVERNANCE.md
- **Purpose:** How humans and AI agents contribute: branch/PR rules, the read-before-write
  discipline, smallest-safe-change rule, communication-back-to-founder format. Fills the
  missing `CONTRIBUTING.md` reference.
- **Audience:** All contributors, AI agents.
- **Owner:** Founder.
- **Repository evidence:** `CLAUDE.md` ("Working standard," "Communication back to Tom");
  `AGENTS.md`; `ORB_ENGINEERING_PRINCIPLES.md` §6. **Fills gap:** `CLAUDE.md` references a
  missing `CONTRIBUTING.md`.
- **Dependencies:** D1, D4.
- **Cross-references:** D4, D9.
- **Version:** v0.
- **Review schedule:** Per process change.
- **Priority:** P2.
- **Confidence:** High (well-evidenced).
- **Current state:** Distributed in `CLAUDE.md`/`AGENTS.md`; no `CONTRIBUTING.md`.
- **Future vision:** One onboarding contract for humans and agents.

---

### D13 — GLOSSARY_AND_SOURCE_OF_TRUTH.md
- **Purpose:** Defines terms (ORB, IndiCare OS, station, chronology, evidence graph,
  operational memory, standalone vs embedded) and indexes which document/code is the
  source of truth for each — so the 463 existing docs gain a navigable spine.
- **Audience:** Everyone.
- **Owner:** Founder.
- **Repository evidence:** `docs/architecture/single-source-of-truth-map.md`;
  `docs/indicare-intelligence-domain-map.md`; `docs/architecture/canonical-operational-cognition.md`.
- **Dependencies:** D1.
- **Cross-references:** All.
- **Version:** v0.
- **Review schedule:** As terms evolve.
- **Priority:** P2.
- **Confidence:** Medium-High.
- **Current state:** Partial maps exist; no single index of authority.
- **Future vision:** Resolves Discovery §14 "no doc tells you which doc wins."

---

## Document dependency overview

```
D1 INDICARE_CONSTITUTION  (P0, root)
├── D2 MISSION_AND_VALUES        (P0)
├── D3 PRODUCT_PRINCIPLES        (P1)
├── D4 ENGINEERING_CONSTITUTION  (P1)  ← successor to ORB_ENGINEERING_PRINCIPLES.md
├── D5 SAFEGUARDING_CHARTER      (P0)
├── D6 AI_SAFETY_AND_BOUNDARIES  (P0)  ← strongest existing evidence
├── D7 DATA_PROTECTION_AND_PRIVACY (P0)
├── D8 SECURITY_AND_ACCESS_CONTROL (P1)
├── D9 QUALITY_AND_VERIFICATION  (P1)
├── D10 OPERATIONAL_DEPLOYMENT_GOV (P1)
├── D11 ARCHITECTURE_CANON       (P1)  ← fills missing ARCHITECTURE.md
├── D12 CONTRIBUTING_AND_AGENT_GOV (P2) ← fills missing CONTRIBUTING.md
└── D13 GLOSSARY_AND_SOURCE_OF_TRUTH (P2)
```

## Recommended sequencing (for a future Phase 2, if approved)
1. **P0 first:** D1, then D2/D5/D6/D7 (the safety/child/privacy core — best evidenced,
   highest in the hierarchy).
2. **P1 next:** D3, D4, D8, D9, D10, D11.
3. **P2 last:** D12, D13.

Resolve Q1 (scope) and Q2 (authority over existing docs) **before** D1 is written.

## What this specification deliberately does NOT do
- It does not write any document body.
- It does not edit `CLAUDE.md` or `ORB_ENGINEERING_PRINCIPLES.md`.
- It does not assert that any proposed document is approved. All are proposals pending the
  founder's explicit go-ahead.
