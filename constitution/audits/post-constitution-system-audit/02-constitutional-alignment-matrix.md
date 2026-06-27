# 02 — Constitutional Alignment Matrix

System state assessed against each constitutional document. Status vocabulary:
**Aligned** / **Partially aligned** / **Not yet aligned** / **Unverifiable (here)**.
"Unverifiable" reflects this environment's limits (no app deps, no DB, app/full-suite not run;
frontends not read), not necessarily a defect.

| Doc | Status | Aligned areas (evidence) | Gaps / partial / requires remediation | Priority |
|---|---|---|---|---|
| **C1 Constitution** | Partially aligned | Mission/boundaries encoded (`assistant/ai_boundaries.py`, ADR-0006); honesty discipline applied in this audit | NR-1 open; ownership concentration; enforcement is manual | P1 |
| **O1 Mission & Values** | Aligned | Values coded (`assistant/prompts.py` CARE_VALUES; Quality Standards) | Outcome measurement is FUTURE VISION | P3 |
| **O2 Roles** | Partially aligned | 7 roles named; interim holders recorded | Safeguarding Lead unfilled; no independent DPO; bus-factor | P1 |
| **O3 Commercial** | Partially aligned | Cost soft-limits, low-cost model, usage report (`ai_gateway_service.py:25-29`) | Full cost-metering depends on NR-1; pricing model FUTURE VISION | P2 |
| **O4 Safeguarding (binding)** | Partially aligned | No-decision boundaries coded (`prompts.py:350,358,492-494`; `ai_boundaries.py`) | UI human-review unverified; cross-home trend tenancy (Q4); no Safeguarding Lead; live tests not run | **P0/P1** |
| **O5 Privacy (binding)** | Partially aligned | Classification, redaction, privacy decisioning, retention surfaces | NR-1 egress coverage; log-PII coverage; full erasure; RoPA/DPIA; no independent DPO | **P0/P1** |
| **E1 Engineering** | Partially aligned | Principles documented (`ORB_ENGINEERING_PRINCIPLES.md`, `CLAUDE.md`) | Not tooling-enforced; duplicate/patch housekeeping | P2 |
| **E2 Security & Access** | Partially aligned | Auth, MFA, passkeys, RBAC, policy engine, tenancy model, CSRF/headers/audit | Per-router enforcement (40 routers no `Depends(`); RLS correctness; tenancy breadth; credential rotation | **P0/P1** |
| **E3 Release Governance** | Not yet aligned | Health endpoints, Sentry, secrets `sync:false` | No pre-merge gate before auto-deploy/schema mutation; 3 migration dirs; rollback unverified; startup patches | **P0** |
| **E4 Architecture Canon** | Aligned (doc) | ADRs 0001-0006; canon written; monorepo mapped | Full API surface unmapped; two-frontend relationship (Q8) | P2 |
| **E5 Contributing & Agent Gov** | Partially aligned | `CLAUDE.md`/`AGENTS.md`; constitution references | Missing `CONTRIBUTING.md` superseded by E5; no CI contribution gate | P2 |
| **E6 Quality & Verification** | Not yet aligned | ORB scenario gate; 737 tests; NR-1 guard added | No full-suite/type/lint CI gate; suite not run here; egress guard not CI-wired | **P0/P1** |
| **A1 AI Safety** | Partially aligned | 14 boundaries, injection defence, citation enforcement | Live jailbreak/hallucination tests not run; NR-1 | P1 |
| **A2 Model/Provider/Prompt/Memory/Routing** | Partially aligned | Provider lock, governed primary path, routing, prompt governance | **NR-1 (adapter chokepoint + TTS gating)**; memory tenancy/retention | **P0/P1** |
| **P1 Product Standards** | Partially aligned (backend) | Chat front door, recording-quality brain, cost-aware | UI-level enforcement unverified (frontend OOS) | P1 |
| **S1 ORB Residential Spec** | Partially aligned | Broad surfaces exist (VERIFIED existence) | Feature behaviour/quality unverified; NR-1 caveat (esp. Voice TTS) | P1 |
| **X1 Glossary & Source-of-Truth** | Aligned | Index + Q2 mapping | 463-doc full reconciliation incomplete (FUTURE VISION) | P3 |

**Overall:** no constitutional document is fully realised end-to-end; the *intelligence/safety
brain* is strongly aligned, while *release governance, verified enforcement breadth (security/
tenancy), NR-1 egress, and UI-level human-review* are the areas needing the most work. Nothing
here asserts compliance, safety, or completeness beyond the cited evidence.
