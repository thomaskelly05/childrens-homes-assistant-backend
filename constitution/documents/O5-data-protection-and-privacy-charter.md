# O5 — Data Protection & Privacy Charter (Binding)

| Field | Value |
|---|---|
| Document ID | O5 |
| Layer | L2 — Operating Principles · **Binding charter** (value-rank #5; binds every layer) |
| Version | 1.1 |
| Status | **Ratified — Version 1.1** |
| Ratified | 2026-06-26 (v1.0 founder ratification with ownership decisions; v1.1 versioned consistency amendment, same date) |
| Owner | **Data Protection Owner / ICO-named data protection contact — Tom Kelly (current, interim).** Founder-confirmed: IndiCare Intelligence is ICO registered; Tom Kelly is the ICO-named data protection contact. **Not** an independent DPO arrangement. |
| Reads with | `00` (§2c), `C1` (Article 4), `A2` (Named Risk NR-1), `docs/security/`, `docs/trust/` |
| Evidence base | `constitution/phase-1-discovery/` |

This is a **binding charter**. Its value-authority (privacy, value-rank #5) overrides
Product, Engineering, AI/Model, and Commercial concerns wherever they conflict (00 §2c). It
makes **no claim of guaranteed compliance** with UK GDPR or any framework; it sets the
standard and names the gaps.

**Registration and ownership (founder-confirmed, 2026-06-26 — founder-attested, not
repository-verified).** IndiCare Intelligence is **ICO registered**, and **Tom Kelly is the
ICO-named data protection contact** and current (interim) Data Protection Owner. This is
**not** an independent DPO arrangement. Independent or external data-protection support may
be needed as the company scales, given the sensitivity of children's social care data.

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

**Cross-reference — Named Risk NR-1 (A2) [added in v1.1].** Privacy depends on **consistent
governed egress**: redaction, the privacy decision, and external-provider governance only
protect data on routes that actually pass through the governed gateway / governance module.
Because AI egress is **not yet enforced through a single governed chokepoint** (A2 Named Risk
NR-1 — e.g. the provider-adapter path and the raw-client ORB Voice TTS path), redaction
coverage cannot be assumed for every AI call. **NR-1 remains OPEN until fixed or formally
re-verified**, and is a high-priority pre-launch item before any live provider use involving
real child, staff, home, or safeguarding information.

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
| **No independent DPO** | INFERRED risk (Q3) | Data protection rests with the ICO-named contact, Tom Kelly (current, interim) — not an independent DPO. Independent/external support may be needed as the company scales. |
| ICO registration / named contact | Founder-attested (2026-06-26) | Confirmed by the Founder; not independently verified from the repository. |
| Provider-side no-training configuration | OUT OF SCOPE / UNVERIFIED | Cannot be verified from the repository; requires provider contract/assurance. |
| Subprocessor register is a draft | VERIFIED | `docs/trust/orb-subprocessors.md` status "Draft"; must be kept accurate per deployment. |
| No Record of Processing / DPIA evidenced in-repo | UNVERIFIED | Not found in discovery; Future Vision. |
| Default admin credential shipped | VERIFIED | E43; rotation required (E2, E3 R7). |
| **AI egress not consistently governed — Named Risk NR-1 (A2)** | OPEN — high-priority pre-launch | Redaction/privacy only protect data on governed routes; adapter and TTS paths uneven/direct. Privacy coverage cannot be assumed for every AI call until NR-1 is fixed/re-verified. |

---

## 7. Current State vs Future Vision

**Current State (VERIFIED).** In-repo privacy engineering is real and specific: typed data
classification, redaction and privacy-decision services in the AI path, documented
no-training stance, retention/deletion/export docs, a subprocessor register, and a
no-raw-logging test. IndiCare Intelligence is ICO registered with Tom Kelly as the ICO-named
data protection contact (founder-attested), but there is **no independent DPO**, the
subprocessor register is a draft, provider-side training settings are out of scope, and no
RoPA/DPIA was found in-repo.

**Future Vision (NOT YET BUILT).** An independent or external DPO function; a maintained
Record of Processing and DPIA; verified provider-side no-training assurances in contract; a
finalised subprocessor register per deployment; and enforced credential rotation.

---

## 8. What this charter does not claim
- It does **not** claim compliance with UK GDPR or any framework is achieved.
- It does **not** claim the AI provider does not train on data; only that in-repo controls
  support that stance and the provider's configuration is out of scope here.
- It does **not** present an independent DPO; data protection currently rests with the
  ICO-named contact (Tom Kelly), and the need for independent/external support is recorded.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 2) | Initial draft presented for founder review. Owner seat (DPO) recorded as unfilled. |
| 1.0 | 2026-06-26 | **Ratified — Version 1** | Ratified by the Founder as a binding charter. Founder-confirmed: IndiCare Intelligence is ICO registered with Tom Kelly as the ICO-named data protection contact / current interim Data Protection Owner (not an independent DPO; independent/external support may be needed as the company scales). Any change requires an explicitly proposed, versioned, approved amendment. |
| 1.1 | 2026-06-26 | **Ratified — Version 1.1** | Versioned consistency amendment following whole-constitution review. Added canonical cross-reference to **Named Risk NR-1 (A2)**: privacy, redaction and external-provider governance depend on consistent governed egress; NR-1 remains OPEN until fixed or formally re-verified. No other substance changed. |
