# E2 — Security & Access Control Standard

| Field | Value |
|---|---|
| Document ID | E2 |
| Layer | L3 — Engineering Principles |
| Version | 1.0 |
| Status | **Ratified — Version 1 (Named Risk NR-1 remains OPEN)** |
| Ratified | 2026-06-26 (founder ratification; NR-1 remains an open high-priority pre-launch remediation item) |
| Owner | Engineering Owner (Tom Kelly, interim) |
| Reads with | `O5` (Privacy Charter, binding), `E3` (Release Governance), `00`/`C1` |
| Evidence base | `constitution/phase-1-discovery/` |

This standard governs authentication, authorisation, tenancy isolation, and platform
security. It supports the Privacy Charter (O5, binding) and **makes no claim of guaranteed
security** (C1 Article 7).

---

## 1. Authentication (VERIFIED — implemented)

- Session-token authentication via JWT, accepted as a session cookie or HTTP Bearer.
  **VERIFIED** — `auth/current_user.py:5,12,58,87-89,181-275` (evidence E24).
- MFA (TOTP) and passkeys (WebAuthn) are first-class and initialised at startup.
  **VERIFIED** — `db/mfa_db.py`, `db/passkeys_db.py`, `core/lifespan.py`; `requirements.txt`
  `pyotp`, `webauthn`, `qrcode` (E25). AGENTS.md: MFA enforced for admin/manager roles.
- Session secret is **required in production** and the app refuses to start without it.
  **VERIFIED** — `core/middleware.py:57-65` (E19).

---

## 2. Authorisation (VERIFIED — implemented)

- **RBAC:** five canonical roles (`admin`, `manager`, `deputy_manager`, `support_worker`,
  `viewer`) with an alias map and per-role permission sets. **VERIFIED** — `auth/rbac.py`
  (`StaffRole`, `ROLE_ALIASES`, `PERMISSIONS_BY_ROLE`; evidence E26).
- **Policy engine:** structured `PolicyDecision` with explicit deny reasons
  (`permission_not_registered`, `permission_not_granted`, `home_scope_denied`,
  `provider_scope_denied`). **VERIFIED** — `core/policy_engine.py` (E28).
- **Tenancy isolation:** `ProviderContext` with `tenancy_scope` of
  `none | home | provider | platform`; platform scope limited to
  `super_admin/founder/owner` and provider-less `admin`. **VERIFIED** —
  `core/provider_context.py:33-36,117-135` (E27).
- **Row-level security** present at the database layer. **VERIFIED (existence)** —
  `sql/008_os_command_permissions_rls.sql` (E50); contents not read in Phase 1.

---

## 3. Platform security controls (VERIFIED — implemented)

The middleware stack includes CSRF protection, security headers, audit logging, and rate
limiting. **VERIFIED** — `core/middleware.py:73-101` and `middleware/security_middleware.py`
(`CsrfProtectionMiddleware:159`, `SecurityHeadersMiddleware:240`,
`AuditLoggingMiddleware:282`; evidence E18). CORS origins are pinned to production hosts.

Secrets are not stored in the repository: `DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY` are
`sync: false`. **VERIFIED** — `render.yaml` (E35).

---

## 4. Required controls and their status

| # | Required control | Status | Note |
|---|---|---|---|
| S1 | Default credentials rotated on every deployment; no shipped default reaches production | **Partial / risk** | Default `ChangeMe123456` ships in `.env.example` (E43). Rotation required. |
| S2 | Every router enforces the policy engine / an auth dependency | **UNVERIFIED** | Only the loader and one router (`assistant_routes.py`, `require_assistant_access`) were read in Phase 1 (E51); full coverage unverified (Q4/A6). |
| S3 | RLS coverage and correctness verified | **UNVERIFIED** | `sql/008_...rls.sql` exists; not read. |
| S4 | Sensitive data never in logs | **Partial** | Non-negotiable (`CLAUDE.md`) + no-raw-logging test; full coverage not verified (cross-ref O5). |
| S5 | Audit logging covers security-relevant actions | **Partial** | `AuditLoggingMiddleware` exists; scope not audited. |
| S6 | MFA enforced for privileged roles | **Partial (documented)** | AGENTS.md states enforcement for admin/manager; not executed in discovery. |
| S7 | Provider/AI egress is governed consistently through enforced controls | **OPEN — see §4a** | Cross-references **Named Risk NR-1 (A2)**. |

---

## 4a. Provider egress as a security/access-control concern (Named Risk NR-1)

**Cross-reference — A2 Named Risk NR-1.** Provider (AI) egress is a security and
access-control concern, not only an AI concern: data leaving the platform to an external model
must be governed **consistently**, especially where **sensitive children's social care data**
(`DataClassification.CONFIDENTIAL_CHILD`, `SAFEGUARDING_SENSITIVE`, `HEALTH_SENSITIVE`) could be
involved. Phase 3 verification found AI egress is **not** enforced through a single governed
chokepoint: the primary chat path and named gateway are governed, but the provider-adapter path
(`services/ai_providers/openai_provider.py` via `ai_model_router_service`) and the ORB Voice TTS
path (`services/orb_voice_tts_service.py`) do not yet demonstrate mandatory
redaction/evaluation before egress. From a security standpoint this is an **inconsistent
egress-control surface** and is a **high-priority pre-launch remediation item**, especially
before any live provider use involving real child, staff, home, or safeguarding data. Full
detail and remediation options: A2 Named Risk NR-1.

---

## 5. Carried-forward gaps (not hidden)

| Gap | Label | Owner action |
|---|---|---|
| Default admin password shipped | VERIFIED (E43) | Enforce rotation (S1; E3 R7). |
| Per-router policy enforcement unverified | UNVERIFIED (Q4/A6) | Audit all 229 routers (S2). |
| RLS correctness unverified | UNVERIFIED (E50) | Review `sql/008` (S3). |
| **AI/provider egress not consistently governed (Named Risk NR-1)** | OPEN — high-priority pre-launch risk | Govern adapter + TTS egress; see A2 NR-1 and E6 verification control. |

---

## 6. Current State vs Future Vision

**Current State (VERIFIED).** A mature access-control design exists: JWT sessions, MFA,
passkeys, five-role RBAC, a structured policy engine, four-level tenancy scoping, CSRF,
security headers, audit logging, rate limiting, RLS at the DB, and secrets kept out of the
repo. Several enforcement-completeness questions are unverified, and a default credential
ships in examples.

**Future Vision (NOT YET BUILT).** Verified per-router enforcement; reviewed RLS; enforced
credential rotation; audited logging scope; a security owner distinct from founder/product
(O2).

---

## 7. What this standard does not claim
- It does **not** claim the platform is secure or penetration-tested; it describes controls
  and names unverified areas.
- It does **not** assert per-router or RLS enforcement completeness; those are UNVERIFIED.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 3) | Initial draft presented for founder review. |
| 0.2 | 2026-06-26 | Drafted (Batch 3 amendment) | Added §4a and control S7 cross-referencing **Named Risk NR-1 (A2)**: provider/AI egress must be governed consistently, especially for sensitive children's social care data. Still awaiting founder review; not ratified. |
| 1.0 | 2026-06-26 | **Ratified — Version 1 (NR-1 OPEN)** | Ratified by the Founder. NR-1 remains an OPEN high-priority pre-launch remediation item; ratification does not resolve it. Any change requires an explicitly proposed, versioned, approved amendment. |
