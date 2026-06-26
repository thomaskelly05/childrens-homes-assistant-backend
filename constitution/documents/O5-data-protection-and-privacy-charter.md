# O5 — Data Protection & Privacy Charter (Binding)

| Field | Value |
|---|---|
| Document ID | O5 |
| Layer | L2 — Operating Principles · **Binding charter** (value-rank #5; binds every layer) |
| Version | 0.1 — Phase 2 Batch 2 draft |
| Status | **Drafted — awaiting founder review. Not yet ratified.** |
| Owner | **Data Protection Officer — TBC (current governance gap).** Held interim by the Founder. |
| Reads with | `00` (§2c), `C1` (Article 4), `docs/security/`, `docs/trust/` |
| Evidence base | `constitution/phase-1-discovery/` |

This is a **binding charter**. Its value-authority (privacy, value-rank #5) overrides
Product, Engineering, AI/Model, and Commercial concerns wherever they conflict (00 §2c). It
makes **no claim of guaranteed compliance** with UK GDPR or any framework; it sets the
standard and names the gaps.

---

## 1. Principles

- Personal data of children, staff, and providers is handled with data minimisation, purpose
  limitation, and least privilege.
- Identifiable child, staff, provider, or safeguarding information must not appear in logs,
  test data, public output, or screenshots. **VERIFIED** as an existing non-negotiable
  (`CLAUDE.md`); supported by a no-raw-logging governance test
  (`tests/test_orb_ai_governance_no_raw_logging.py`).
- Privacy is binding: a lower-ranked value (product, engineering, commercial, speed) may
  never override it (00 §2b).

---

## 2. Data classification (VERIFIED — implemented)

The system has a typed data-classification scheme used by the AI governance path.
**VERIFIED** — `schemas/data_protection.py:9-18` defines `DataClassification` with values
including `PUBLIC_SYSTEM`, `CONFIDENTIAL_STAFF`, `CONFIDENTIAL_CHILD`,
`SAFEGUARDING_SENSITIVE`, `HEALTH_SENSITIVE`, `EDUCATION_SENSITIVE`, and `HIGHLY_SENSITIVE`.
This classification is referenced by the LLM provider and AI gateway (evidence E16).

---

## 3. AI privacy controls (VERIFIED — implemented in-repo)

- **Redaction before external AI calls.** **VERIFIED** — `services/ai_redaction_service.py`;
  the AI gateway runs a privacy decision and redaction before egress
  (`services/ai_gateway_service.py`, evidence E16).
- **Privacy decisioning.** **VERIFIED** — `services/ai_privacy_decision_service.py`;
  `services/ai_privacy_guard_service.py` with `tests/test_ai_privacy_guard_service.py`.
- **No-training stance.** **VERIFIED (documented)** — `docs/security/ai-privacy-and-no-training.md`.
  **UNVERIFIED / OUT OF SCOPE** — the actual provider-side (OpenAI) training configuration
  lives outside the repository and cannot be verified here. The in-repo controls support the
  stance; they do not prove the provider's settings.
- **Standalone vs embedded scope.** **VERIFIED** — the standalone assistant must not access
  live OS child records (`docs/ai-safety.md`, evidence E32).

---

## 4. Retention, deletion, export, subprocessors (VERIFIED existence)

- **Retention & privacy:** `docs/trust/orb-privacy-and-retention.md`.
- **Deletion & export:** `docs/trust/orb-data-deletion-and-export.md`; privacy-request
  storage `db/orb_privacy_requests_db.py`.
- **Subprocessor register:** `docs/trust/orb-subprocessors.md` — lists hosting (e.g. Render),
  PostgreSQL, Stripe, AI provider (e.g. OpenAI), email provider, and OAuth providers
  (Google/Microsoft/Apple), with external AI use gated on `external_ai_enabled`.
  **Honest note:** that document is itself marked **"Draft"** and instructs each deployment
  to maintain an accurate list — so the register is a maintained artifact, not a settled
  fact.

---

## 5. Secrets and access (cross-reference E2 Security)

- **VERIFIED** — production secrets (`DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY`) are
  `sync: false` and set outside the repository (`render.yaml`, evidence E35).
- **VERIFIED / risk** — a default first-admin password ships in examples (`.env.example`,
  evidence E43). Rotation is required (carried in E3 R7 and the Security Standard E2).

---

## 6. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| **DPO unfilled** | UNVERIFIED ownership (Q3) | This charter's own owner seat is empty; held interim by the Founder. |
| Provider-side no-training configuration | OUT OF SCOPE / UNVERIFIED | Cannot be verified from the repository; requires provider contract/assurance. |
| Subprocessor register is a draft | VERIFIED | `docs/trust/orb-subprocessors.md` status "Draft"; must be kept accurate per deployment. |
| No Record of Processing / DPIA evidenced in-repo | UNVERIFIED | Not found in discovery; Future Vision. |
| Default admin credential shipped | VERIFIED | E43; rotation required (E2, E3 R7). |

---

## 7. Current State vs Future Vision

**Current State (VERIFIED).** In-repo privacy engineering is real and specific: typed data
classification, redaction and privacy-decision services in the AI path, documented
no-training stance, retention/deletion/export docs, a subprocessor register, and a
no-raw-logging test. But there is **no appointed DPO**, the subprocessor register is a draft,
provider-side training settings are out of scope, and no RoPA/DPIA was found.

**Future Vision (NOT YET BUILT).** An appointed DPO; a maintained Record of Processing and
DPIA; verified provider-side no-training assurances in contract; a finalised subprocessor
register per deployment; and enforced credential rotation.

---

## 8. What this charter does not claim
- It does **not** claim compliance with UK GDPR or any framework is achieved.
- It does **not** claim the AI provider does not train on data; only that in-repo controls
  support that stance and the provider's configuration is out of scope here.
- It does **not** fill the DPO role; that gap is recorded.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 2) | Initial draft presented for founder review. Owner seat (DPO) recorded as unfilled. |
