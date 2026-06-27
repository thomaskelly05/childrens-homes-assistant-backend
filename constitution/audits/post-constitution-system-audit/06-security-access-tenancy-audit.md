# 06 — Security, Access Control & Tenancy Audit (against E2, O5)

No claim that the platform is secure or penetration-tested. Labels as in the Constitution.

## Findings

**1. Authentication — aligned (VERIFIED).**
- JWT session via cookie or Bearer (`auth/current_user.py:5,12,58,87-89,181-275`); MFA (TOTP) +
  passkeys (WebAuthn) initialised at startup (`core/lifespan.py`; `db/mfa_db.py`,
  `db/passkeys_db.py`); session secret required in production
  (`core/middleware.py:57-65`). AGENTS.md: MFA enforced for admin/manager.

**2. RBAC + policy engine + tenancy model — aligned in design (VERIFIED).**
- Five roles + aliases + per-role permissions (`auth/rbac.py`); structured `PolicyEngine`
  with explicit deny reasons (`core/policy_engine.py`); four-level tenancy
  (`none|home|provider|platform`) with `can_access_home`/`can_access_provider`
  (`core/provider_context.py:33-36,117-135`).

**3. Per-router enforcement — partially aligned (DERIVED / requires remediation).**
- Of 229 routers, **189 reference an auth dependency** (`get_current_user`/`require_*`/`Depends(`);
  **40 contain no `Depends(`** (grep). Some of the 40 are legitimately public (health, static,
  compat), but this set has **not** been individually reviewed. **UNVERIFIED:** that every
  data-touching route enforces auth + the policy engine (Q4/A6). Requires a per-router audit.

**4. Tenancy enforcement breadth — requires verification (UNVERIFIED).**
- `resolve_provider_context`/`provider_context`/`can_access_home` appear in only ~13
  service/router files (grep). The model is strong but its **application breadth** across 229
  routers and 692 services is unverified; cross-home isolation depends on consistent use plus
  DB RLS.

**5. Row-level security — present, unverified (VERIFIED existence).**
- `sql/008_os_command_permissions_rls.sql` exists; contents and correctness **not** read/verified.

**6. Platform controls — aligned (VERIFIED).**
- CSRF, security headers, audit logging, rate limiting middleware
  (`core/middleware.py:73-101`; `middleware/security_middleware.py:159,240,282`); CORS pinned to
  production hosts; secrets `sync:false` (`render.yaml`).

**7. Audit logging — present, scope unverified (VERIFIED existence).**
- `AuditLoggingMiddleware` + `assistant/audit_logger.py`. Whether it captures all
  security-relevant actions (and excludes PII) is **UNVERIFIED**.

**8. Default credential — requires remediation (VERIFIED).**
- `ChangeMe123456` shipped in `.env.example`; enforce rotation (E2 S1 / E3 R7).

## Verdict
**Partially aligned.** A mature access-control *design* exists (auth, MFA, passkeys, RBAC,
policy engine, four-level tenancy, RLS, CSRF, audit, rate limiting). The gaps are about
**verified enforcement breadth**: per-router auth/policy coverage (40 routers without
`Depends(` unreviewed), tenancy application across the codebase, RLS correctness, audit-log
scope, and credential rotation. These require a focused security pass in a test-capable
environment before broad launch.
