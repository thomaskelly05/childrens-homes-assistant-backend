# Constitutional Review Board — Phase 1.5

This document attempts to **prove the Discovery Report and Constitutional Architecture
wrong.** It does not defend prior conclusions. Seven adversarial perspectives interrogate
the deliverables. For each finding the disposition is one of:

- **RESOLVED (evidence):** answered with repository evidence; the relevant deliverable is
  correct or has been revised.
- **ALREADY HEDGED:** the deliverables already carry this as a labelled limitation.
- **OPEN (Qn):** cannot be resolved from repository evidence; carried in
  `open-questions.md` at the stated confidence.

The Constitutional Hierarchy governs adjudication: a lower principle (e.g. speed of
delivery) never excuses a breach of a higher one (e.g. safeguarding, truthfulness).

Mandatory wording, used verbatim where the concept arises:
**ORB supports reflection, recording and evidence gathering. Adults remain responsible for
judgement, safeguarding escalation and final records.**

---

## 1. Principal Software Architect

**Challenge — "You read 6 files in `core/` and called it an architecture map for a
407k-line, 2,124-file codebase."**
Fair. The map is high-confidence only on the *spine* (assembly, middleware, auth, policy,
deployment). It is explicitly low-confidence on the 692-file `services/` layer and 229
routers. → **ALREADY HEDGED** (Discovery §16 confidence table; Coverage Manifest).

**Challenge — "You asserted a middleware execution order."**
The report lists *add order*, not verified runtime order, and says so. Starlette reverses
add order at runtime; this was not executed. → **ALREADY HEDGED** (Discovery §4 note).

**Challenge — "You claim all AI traffic is governed, but you never proved the gateway is
the only egress."**
Correct and important. `services/ai_gateway_service.py` and `assistant/llm_provider.py`
both exist and both reference governance helpers, but no full egress audit was done. A
constitution must not claim "all AI calls are governed" without that audit. → **OPEN (Q,
section E of open-questions: "all OpenAI calls route through gateway" = UNVERIFIED).**
Discovery §10/§16 already mark AI internals Medium confidence.

**Challenge — "Import-time monkey-patches are an architecture smell you under-weighted."**
Agreed they are load-bearing and risky; one patch file is present but unimported. →
**RESOLVED (evidence)** as a finding: Discovery A2; Open Q5.

**Challenge — "Dead duplicate router — did you actually confirm it's dead?"**
Yes: the root `routersyoung_people_statutory_documents_routes.py` is unreferenced by any
import; the loader uses the `routers/` version. → **RESOLVED (evidence)** (E41; A3; Q7).

**Net:** Architecture findings stand; no overclaim survives. Biggest residual: gateway
egress completeness (Q).

---

## 2. Registered Manager of a children's home

**Challenge — "Does this actually help my staff on shift, or is it a wall of governance?"**
Phase 1 is discovery, not product. But the discovery *did* verify the product is built
around real shift reality (mobile, interruptions) in `ORB_ENGINEERING_PRINCIPLES.md` §8
and `CLAUDE.md`. The constitution proposals (D3) carry this forward. → **RESOLVED
(evidence)**.

**Challenge — "Will this tool ever make a safeguarding call for my staff and let them
hide behind it?"**
No, and it is enforced, not just promised: ORB supports reflection, recording and evidence
gathering; adults remain responsible for judgement, safeguarding escalation and final
records. Coded in `assistant/ai_boundaries.py:3-17` (boundaries 2, 6, 7) and ADR-0006. →
**RESOLVED (evidence)** (E4, E6).

**Challenge — "Who is accountable when ORB gets something wrong about a child?"**
The repository encodes that the adult remains accountable, but it does **not** name a human
safeguarding owner for the governance layer itself. → **OPEN (Q3).**

**Net:** Product-safety posture is genuinely manager-friendly; the gap is named human
ownership of the governance, not the product behaviour.

---

## 3. Ofsted Inspector

**Challenge — "Show me, with evidence, that AI output cannot fabricate facts about a
child."**
The system *prohibits* fabrication (`ai_boundaries.py` boundary 3: must not invent facts,
incidents, disclosures, dates, citations…) and enforces citation
(`assistant/citation_enforcer.py`) and adversarial tests
(`test_orb_adversarial_safety_firewall.py`). But "prohibited and tested in mock" is not
the same as "proven in production with live models" — and **no test was run during
discovery** (deps absent). → **ALREADY HEDGED** (Discovery §11 honesty note; E49). The
constitution (D6/D9) must state this honestly and not imply guaranteed prevention.

**Challenge — "Does the standalone assistant ever see a real child's record?"**
Design says no: standalone must not access live OS records; only the embedded OS assistant
uses scoped context, guarded by `OrbResidentialGuardMiddleware` and boundary tests. →
**RESOLVED (evidence)** (E32; `docs/ai-safety.md`). Whether enforcement is complete across
all surfaces is part of Q4.

**Challenge — "Records may be read by the child one day — is that designed for?"**
Yes, explicitly: `ORB_ENGINEERING_PRINCIPLES.md` §2 ("Records are part of a child's
story"). → **RESOLVED (evidence)**.

**Net:** Inspection-facing posture is strong on paper and in code; the honest limit is the
absence of executed/live verification in this discovery.

---

## 4. Safeguarding Lead

**Challenge — "Escalation: does the system push urgency or quietly absorb it?"**
Boundary 7 requires ORB to "prioritise immediate safety and escalation where the situation
suggests urgent or heightened safeguarding risk," and `assistant/escalation_monitoring.py`
exists. → **RESOLVED (evidence)** (E4). Depth of behaviour not fully read — Medium
confidence.

**Challenge — "Cross-home safeguarding trends — could that leak one home's data into
another?"**
`assistant/cross_home_safeguarding_trends.py` and `test_cross_home_safeguarding_trends.py`
exist, and tenancy scoping (`provider_context.py`) bounds access. But whether trend
aggregation respects tenancy was **not** verified at code level. → **OPEN (Q4 / tenancy
enforcement completeness).**

**Challenge — "The mandatory human-responsibility wording — is it actually used or just
quoted in your report?"**
The *concept* is coded; the exact mandated sentence is a constitutional wording, now used
verbatim in all Phase 1 deliverables where the concept appears. → **RESOLVED**.

**Net:** Safeguarding direction is sound; residual risk is enforcement completeness of
tenancy on aggregated/trend features (Q4).

---

## 5. Data Protection Officer

**Challenge — "Prove 'no training on customer data' rather than assert it."**
There is a dedicated doc (`docs/security/ai-privacy-and-no-training.md`), a redaction
service (`services/ai_redaction_service.py`), a privacy decision service
(`services/ai_privacy_decision_service.py`), data classifications
(`schemas/data_protection.py`), and privacy-request storage
(`db/orb_privacy_requests_db.py`). That is strong supporting evidence. It is **not** proof
of OpenAI-side training settings, which live outside the repo. → **RESOLVED (evidence) for
in-repo controls; OPEN for provider-side configuration** (OUT OF SCOPE, open-questions §D).

**Challenge — "Default admin password shipped in the repo."**
`ChangeMe123456` is in `.env.example`/AGENTS.md. Acceptable only with enforced rotation;
no enforcement evidenced. → **RESOLVED (evidence) as a finding** (E43; A5; Q10).

**Challenge — "Secrets in `render.yaml`?"**
No — `DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY` are `sync: false` (dashboard-set). →
**RESOLVED (evidence)** (Discovery §12).

**Challenge — "Did discovery itself leak anything identifiable?"**
No identifiable child/staff/provider data was read or reproduced; only config, code, and
governance docs. → **RESOLVED**.

**Net:** In-repo privacy engineering is real and evidenced; the honest boundary is
provider-side configuration (out of scope) and credential-rotation enforcement (open).

---

## 6. AI Safety Researcher

**Challenge — "14 boundaries in a prompt are jailbreak-fragile. Are they enforced beyond
the system prompt?"**
The boundary block is appended and declared to override style
(`ai_boundaries.py:18-60`), and there is an adversarial firewall test
(`test_orb_adversarial_safety_firewall.py`) and a full-brain boundary test. That is more
than prompt-only. But robustness against live jailbreaks was **not** executed here. →
**ALREADY HEDGED** (Discovery §11/§16); constitution D6 must avoid claiming
unbreakability.

**Challenge — "Single-provider lock-in to OpenAI — is that a safety claim or a
constraint?"**
`APPROVED_LLM_PROVIDERS = {"openai"}` with a comment reserving future adapters
(`llm_provider.py:22`). It is a deliberate constraint, accurately reported, not dressed up
as more. → **RESOLVED (evidence)** (E15).

**Challenge — "Cost governance can be gamed if not every call goes through the gateway."**
Same gap as the Architect's: gateway-as-sole-egress is unproven. → **OPEN (Q,
open-questions §E).**

**Challenge — "Mock-provider CI proves nothing about the live model."**
True; CI runs mock by default, live only behind a secret
(`orb-scenario-quality-gate.yml`). Reported accurately; D9 must state it. → **ALREADY
HEDGED** (E34; D9 caveat).

**Net:** AI-safety reporting is appropriately non-triumphalist. Residual: egress
completeness and live-model robustness.

---

## 7. Technical Investor (due diligence)

**Challenge — "The repo name says 'backend' but you're telling me it's a monorepo with a
second product. Which is the truth?"**
The monorepo reality is the truth, with evidence: two deployable Render services, four
frontends, and LifeEcho as an in-repo standalone product. → **RESOLVED (evidence)** (E7–E12;
Discovery §2). This is exactly the kind of finding the task calls success.

**Challenge — "What's the bus-factor and ownership?"**
All governance traces to a single founder; no named safeguarding lead, DPO, security lead,
or architect is evidenced. → **OPEN (Q3).** Material for diligence.

**Challenge — "Is there a clean path to production or cowboy deploys?"**
Honest answer: auto-deploy from `main`, narrow CI (ORB scenarios only — not full
suite/type/lint), and startup schema mutation. No enforced full-test/migration gate. →
**RESOLVED (evidence) as a risk** (A1; Q9). This is a real diligence flag, reported rather
than hidden.

**Challenge — "463 docs — is that maturity or noise?"**
Both. Substantial governance content exists (ADRs, trust pack, security), but there is no
single ordered canon and the primary instruction file (`CLAUDE.md`) references three
**missing** documents. → **RESOLVED (evidence)** (E37; Discovery §14).

**Challenge — "Can you stand behind a valuation-relevant claim that 'the platform is
secure and compliant'?"**
No. The discovery supports "strong, evidenced *intent and engineering* toward security and
compliance" but **not** a guarantee of either — consistent with `CLAUDE.md`'s own
non-negotiable ("Do not overclaim that ORB guarantees compliance"). → **RESOLVED
(evidence)**.

**Net:** The investment-relevant truths (monorepo scope, ownership concentration, weak
release gating, doc sprawl with broken refs) are surfaced, not buried.

---

## Consolidated outcome

**Attempts to prove the discovery wrong did not overturn any core finding.** They did the
following:

1. **Confirmed the discovery's own hedges were warranted** — AI internals, full API
   surface, test/runtime health, and `services/` breadth are correctly marked
   low/medium confidence and were not overclaimed.
2. **Surfaced one substantive gap not yet isolated as its own question** — *is the AI
   gateway the sole egress to OpenAI?* This is now explicit in `open-questions.md` §E and
   referenced by the Architect and AI-Safety perspectives. No deliverable claimed
   otherwise, so this is a sharpening, not a correction.
3. **Reinforced three governance risks** as diligence-grade: single-owner governance with
   no named safeguarding/DPO owners (Q3), no enforced gate before production schema change
   (Q9/A1), and a primary instruction file pointing at three missing documents (A3 doc
   side / E37).
4. **Validated the boundary/safety posture** from the manager, inspector, safeguarding,
   and AI-safety lenses — strong, coded, and tested-in-mock, with the honest limit that
   **nothing was executed live during discovery** (E49).

**Revisions made as a result of the board:** none of the four prior deliverables required
factual correction — each challenge either resolved to existing evidence or to an
already-recorded limitation. The only additive change is this board's explicit elevation
of the "gateway sole-egress" question, which `open-questions.md` already carried under §E
and is cross-referenced here.

**Verdict:** The Phase 1 discovery is **truthful within its stated coverage.** It is safe
to use as the evidentiary base for a Phase 2 constitution **only if** Q1 (scope), Q2
(authority over existing docs), and Q3 (named owners) are answered first, and **only if**
no constitutional document is allowed to claim guaranteed security, compliance, or AI
safety — claims the repository's own non-negotiables already forbid.

Per the founder's instruction, **no constitutional or governance document body has been
written.** This board closes Phase 1.5.
