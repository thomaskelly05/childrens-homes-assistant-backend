# 09 — Risk Register

Priority: **P0** launch blocker · **P1** pre-launch · **P2** early pilot · **P3** future.
Labels as in the Constitution. "Requires remediation" / "requires verification" used instead of
"non-compliant".

| # | Risk | Priority | Label | Evidence | Action |
|---|---|---|---|---|---|
| R1 | **AI egress not enforced at a single chokepoint (NR-1)** — adapter path caller-dependent; TTS not yet privacy-gated | **P0** | OPEN (partially remediated) | report 01; `openai_provider.py`, `orb_voice_tts_service.py` | Enforce governance at adapter/router; gate TTS; CI-wire guard |
| R2 | **No pre-merge gate before auto-deploy that mutates prod schema** | **P0** | INFERRED risk | `render.yaml`, `core/lifespan.py:37-110`, `.github/workflows/` | Add full-suite+type+lint+egress gate; protect `main` |
| R3 | **Test suite health unknown** (not runnable here; CI doesn't run it) | **P0/P1** | VERIFIED not-run | `import fastapi` fails; AGENTS.md | Run suite in equipped env; wire to CI |
| R4 | **Per-router auth/policy enforcement unverified** (40/229 routers no `Depends(`) | **P0/P1** | UNVERIFIED | grep | Per-router audit; enforce policy engine |
| R5 | **Memory tenancy/retention unverified** (cross-home leak risk) | **P1** | UNVERIFIED | `assistant/memory.py`, memory routes | Verify tenancy isolation + retention |
| R6 | **Cross-home safeguarding trend tenancy unverified** | **P1** | OPEN (Q4) | `assistant/cross_home_safeguarding_trends.py` | Verify/enforce tenancy on aggregation |
| R7 | **UI-level human-review-before-save unverified** for ORB outputs | **P1** | UNVERIFIED | O4 §4; frontend OOS | Product/UI audit with app running |
| R8 | **RLS correctness unverified** | **P1** | UNVERIFIED | `sql/008_…rls.sql` | Review + test RLS |
| R9 | **No independent Safeguarding Lead / DPO; roles concentrated in one person** | **P1** | governance gap | O2, O4, O5 | Appoint independent owners as scaling allows |
| R10 | **Default admin credential shipped** in examples | **P1** | VERIFIED | `.env.example` | Enforce rotation; remove default from prod path |
| R11 | **Provider-side no-training assurance** absent (contract) | **P1** | OUT OF SCOPE | `docs/security/ai-privacy-and-no-training.md` | Obtain provider contractual assurance |
| R12 | **Three migration locations, partly manual; no ordered ledger** | **P2** | VERIFIED | `db/migrations/`,`migrations/`,`sql/` | Consolidate; document order |
| R13 | **Import-time startup patches** mutate behaviour; one unimported | **P2** | VERIFIED | `app.py:1-6` | Fold into reviewed assembly |
| R14 | **Live jailbreak/hallucination robustness unverified** | **P2** | UNVERIFIED | adversarial tests not run | Run adversarial evals vs live model |
| R15 | **Log-PII coverage across 692 services unverified** | **P2** | UNVERIFIED | no-raw-logging test exists | Sampled log audit |
| R16 | **Subprocessor register is a draft; no RoPA/DPIA** | **P2** | VERIFIED/UNVERIFIED | `docs/trust/orb-subprocessors.md` | Finalise register; produce RoPA/DPIA |
| R17 | **Full API surface unmapped** (229 routers) | **P3** | UNVERIFIED | loader only | Generate OpenAPI export |
| R18 | **Two Next.js frontends relationship unclear** | **P3** | UNVERIFIED (Q8) | package.json names | Clarify/retire |

**Top concentration:** R1 (NR-1), R2/R3 (release+test gating), R4 (router enforcement) are the
cluster that most affects readiness for handling real child/staff/home data.
