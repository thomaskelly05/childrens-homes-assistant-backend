# 04 — Data Protection & Privacy Audit (against O5, A2, E2)

No claim of compliance with UK GDPR or any framework is made. Labels as in the Constitution.

## Findings

**1. Typed data classification — aligned (VERIFIED).**
`schemas/data_protection.py:9-18` — `DataClassification` incl. `CONFIDENTIAL_CHILD`,
`SAFEGUARDING_SENSITIVE`, `HEALTH_SENSITIVE`, `EDUCATION_SENSITIVE`, `HIGHLY_SENSITIVE`. Used by
the AI governance path.

**2. Redaction + privacy decision before external AI — partially aligned (VERIFIED / OPEN).**
- Governed paths redact pre-egress: `services/ai_external_call_governance.py` (`redact_chat_messages`,
  `redact_plain_text`, `governed_embeddings_create`, `governed_transcribe_audio_file`);
  `services/ai_redaction_service.py`, `services/ai_privacy_decision_service.py`,
  `services/ai_privacy_guard_service.py`.
- **OPEN (NR-1):** redaction only protects data on governed routes. The provider-adapter path
  is caller-dependent and (until this branch) TTS was a raw egress. Privacy coverage across
  **all** AI calls is therefore **not yet assured** (see report 01). Post-NR-1-Phase-A: TTS is
  on the sanitised client but not yet privacy-gated.

**3. No-training stance — aligned in-repo; provider side OUT OF SCOPE (VERIFIED / OOS).**
- `docs/security/ai-privacy-and-no-training.md`. The actual OpenAI account training
  configuration is **OUT OF SCOPE** of the repo and **UNVERIFIED**; requires provider contract.

**4. No identifiable data in logs — partially aligned (VERIFIED control + UNVERIFIED coverage).**
- Non-negotiable in `CLAUDE.md`; `tests/test_orb_ai_governance_no_raw_logging.py` exists.
- `services/ai_privacy_audit_service.py` present. **UNVERIFIED:** that *all* logging across 692
  service files avoids child/staff identifiers (not exhaustively reviewed; app not run).

**5. Retention / deletion / export — present, depth unverified (VERIFIED existence).**
- `services/ai_retention_policy_service.py`, `db/orb_privacy_requests_db.py`,
  `docs/trust/orb-privacy-and-retention.md`, `docs/trust/orb-data-deletion-and-export.md`.
  Behaviour and completeness (e.g. full erasure across all stores) **not** verified.

**6. Subprocessors — draft register (VERIFIED).**
- `docs/trust/orb-subprocessors.md` (status "Draft"): Render, PostgreSQL, Stripe, OpenAI, email,
  OAuth. Must be finalised per deployment. No RoPA/DPIA found in-repo (UNVERIFIED).

**7. Secrets — aligned (VERIFIED).**
- `render.yaml`: `DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY` are `sync:false` (not in repo).
- **Requires remediation:** default admin password `ChangeMe123456` shipped in `.env.example`
  (rotation required; E2/E3 R7).

**8. ICO registration / DP ownership — founder-attested (not repo-verified).**
- IndiCare Intelligence ICO registered; Tom Kelly ICO-named DP contact / interim DP Owner; **not**
  an independent DPO (O5). Independent/external DPO is a future scaling priority.

## Verdict
**Partially aligned.** In-repo privacy engineering is real and specific (classification,
redaction, privacy decisioning, retention surfaces). Requires remediation/verification:
NR-1 egress coverage, log-PII coverage across the codebase, full erasure behaviour, RoPA/DPIA,
finalised subprocessor register, credential rotation, and an independent DPO as the company
scales. Provider-side no-training is OUT OF SCOPE here and needs contractual assurance.
