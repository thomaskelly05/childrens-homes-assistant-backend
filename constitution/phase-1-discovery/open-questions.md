# Open Questions — Phase 1 Discovery

Unresolved questions, unknowns, OUT OF SCOPE areas, and UNVERIFIED claims. These must be
resolved (or consciously accepted) before constitutional bodies are written. Each carries
a confidence label and, where useful, a suggested way to resolve it.

---

## A. Scope and authority (must resolve before any body is written)

**Q1 — What does the constitution govern? (UNVERIFIED / founder decision)**
The repo is a multi-product monorepo: IndiCare OS / ORB Residential **plus** LifeEcho
(`life_echo/`, `apps/lifeecho-web/`) **plus** multiple frontends (`frontend/`,
`frontend-next/`, `indicare-frontend-next/`, `indicare-ai/`). Does the constitution cover
only IndiCare OS / ORB, or the whole monorepo? Evidence shows LifeEcho is intended to be
extractable as its own product (`life_echo/__init__.py`). *Resolution: founder decision.*

**Q2 — How does the constitution relate to the 463 existing docs? (founder decision)**
There are already ADRs, a trust pack, security docs, and engineering principles. The
constitution must sit **above and reference** these, not duplicate or silently override
them. Which existing docs are promoted to constitutional status, which become
subordinate, and which are deprecated? *Resolution: founder + a docs reconciliation pass.*

**Q3 — Who owns safeguarding and data protection? (UNVERIFIED)**
The proposed Safeguarding Charter (D5) and Data Protection doc (D7) need named human
owners (e.g. a safeguarding lead, a DPO). No such ownership is evidenced anywhere in the
repository. Currently all governance implicitly traces to the founder. *Resolution:
founder confirms owners or accepts sole ownership explicitly.*

---

## B. Architecture / engineering unknowns

**Q4 — Does every router enforce the policy engine? (UNVERIFIED — A6)**
Only `core/router_loader.py` was read, not the 229 router bodies. Application-layer
authorisation could be inconsistent across surfaces. *Resolution: audit each router for a
policy-engine / auth dependency, or confirm a shared dependency enforces it.*

**Q5 — Are the import-time startup patches safe and intentional? (INFERRED risk — A2)**
`app.py` imports `startup_live_child_scope_patch`, `startup_live_chronology_fallback_patch`,
`startup_life_echo_router_patch` (which monkey-patch behaviour at import). A fourth file,
`startup_live_os_projection_patch.py`, exists but is **not** imported by `app.py`. Is that
intentional (dead) or an omission? *Resolution: confirm intent; consider folding patches
into the normal app-factory flow.*

**Q6 — Which of the three migration locations is authoritative? (INFERRED risk — A4)**
`db/migrations/`, `migrations/`, and `sql/` all hold migrations; AGENTS.md says some are
applied manually while `lifespan.py` runs others automatically. *Resolution: one ordered
ledger + a documented application order.*

**Q7 — Is the root `routersyoung_people_statutory_documents_routes.py` dead code? (VERIFIED unreferenced; intent UNVERIFIED — A3)**
It is unreferenced and differs from the loaded `routers/` version. Likely a stray
duplicate. *Resolution: confirm and delete, or explain why it is kept.*

**Q8 — Relationship between `frontend-next/` and `indicare-frontend-next/`? (UNVERIFIED)**
Two Next.js apps with different package names. Only `frontend-next` is deployed in
`render.yaml`. Is `indicare-frontend-next` legacy, experimental, or active? *Resolution:
founder/eng confirmation.*

---

## C. Operational / governance risks (recorded, not resolved)

**Q9 — No enforced gate between merge to `main` and production schema change. (INFERRED risk — A1)**
Auto-deploy from `main` + startup `schema_doctor`/migrations + a CI workflow that only
runs ORB scenario quality (not the full test suite, not type/lint). A bad merge can reach
production and mutate the live schema with no full-suite gate. *Resolution: add a
full-test + migration-review gate; constitutionalise the release path (D9, D10).*

**Q10 — Default admin credential shipped in examples/docs. (VERIFIED — A5)**
`ChangeMe123456` in `.env.example` and AGENTS.md. Operationally fine only if every
deployment rotates it. *Resolution: enforce rotation; document it in D8.*

**Q11 — Test suite health is unknown at runtime. (VERIFIED not-run — A8)**
No tests were executed (deps absent). AGENTS.md documents fixture fragility (some
`test_*.py` are not pytest tests; a historical CSRF fixture issue — now apparently
stale). *Resolution: run the suite in an equipped environment before relying on "tests
pass" in any constitutional claim.*

---

## D. OUT OF SCOPE (explicitly not assessed in Phase 1)

- **Frontend code quality/behaviour** (`frontend/`, `frontend-next/`,
  `indicare-frontend-next/`, `indicare-ai/`, `apps/lifeecho-web/`) — OUT OF SCOPE for a
  backend-focused discovery; listings only.
- **LifeEcho internal logic** (79 py files) — OUT OF SCOPE beyond confirming it exists and
  is wired in.
- **Live production data, real provider/home/child data, Render dashboard secrets** —
  OUT OF SCOPE and not accessible; nothing identifiable was read.
- **Third-party service configuration** (Stripe, Twilio, Tavily, Sentry, ElevenLabs) —
  presence verified via deps/env; account/config OUT OF SCOPE.
- **Git history beyond the last 10 commits** — OUT OF SCOPE (sampled only).

---

## E. UNVERIFIED claims surfaced during discovery (for transparency)
- Full API surface map (paths/verbs) — UNVERIFIED (inferred from filenames).
- That all OpenAI calls actually route through `ai_gateway_service` (vs some bypassing it) —
  UNVERIFIED; the gateway exists and `llm_provider` also calls governance helpers, but a
  full egress audit was not done.
- RLS coverage and correctness (`sql/008_...rls.sql`) — UNVERIFIED (file not read).
- Exact runtime middleware order — UNVERIFIED (add order read; not executed).
- README's "Python 3.9+" vs pinned 3.11.9 — drift VERIFIED; which is correct intent
  UNVERIFIED.
