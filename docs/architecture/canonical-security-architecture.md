# Canonical IndiCare Security Architecture

## Purpose

IndiCare handles children’s homes data, safeguarding records, health information, workforce records, inspection evidence and AI-assisted operational summaries. Security must therefore be safeguarding-grade, not ordinary SaaS-grade.

This document defines the canonical security architecture so future work does not accidentally bypass the strongest security systems already built.

## Canonical security systems

### 1. Identity and session authority

Canonical backend:

- `routers/auth_routes.py`
- `routers/mfa_routes.py`
- `routers/passkey_routes.py`
- `services/session_security_service.py`
- `auth/tokens.py`
- `auth/rbac.py`
- `auth/mfa_guard.py`

Canonical frontend shell:

- `frontend-next/contexts/auth-context.tsx`

Legacy compatibility runtime:

- `frontend/js/auth.js`

The Next shell must use live `/auth/me` for protected routes. It must not treat cached browser identity as authoritative for protected access.

### 2. MFA and passkeys

Canonical passkey routes:

- `/auth/passkeys/authenticate/options`
- `/auth/passkeys/authenticate/verify`
- `/auth/passkeys/register/options`
- `/auth/passkeys/register/verify`
- `/auth/passkeys/status`

Passkey and biometric flows must remain live and challenge-based. They must not be served from cached identity state.

### 3. Session security

Canonical session controls:

- `user_sessions` table
- session revocation
- session touch throttling
- device fingerprinting
- trusted-device metadata
- MFA verified flag
- passkey authenticated flag

Session security belongs in `services/session_security_service.py`.

### 4. Role and access control

Canonical role model:

- `auth/rbac.py`
- `middleware/access_scope_middleware.py`

All protected operational routes must enforce role, home and provider scope. Frontend hiding is not security.

### 5. Security middleware

Canonical middleware:

- `middleware/security_middleware.py`
- `middleware/access_scope_middleware.py`
- `middleware/os_read_cache_middleware.py`
- Starlette `SessionMiddleware`
- CSRF middleware
- CORS configuration in `core/middleware.py`

Middleware should enforce security posture but must not create repeated database storms.

### 6. Audit and evidence integrity

Canonical audit planes:

- `audit_events`
- `os_audit_events`
- `operational_audit_timeline`
- `record_workflow_events`
- `ai_audit_logs`
- lifecycle events
- evidence links
- chronology events

These should be treated as separate evidence trails, not duplicate noise.

### 7. AI and ORB security

ORB must always operate inside:

- user permission scope
- home/provider scope
- child-context scope
- evidence/chronology source boundaries
- human review guardrails

ORB must not become a shortcut around RBAC, safeguarding restrictions or document permissions.

## Canonical rule

Protected IndiCare access must follow this order:

1. Signed session token / cookie exists.
2. Live `/auth/me` validates user identity.
3. MFA/passkey state is authoritative.
4. Session has not been revoked.
5. Role/home/provider scope is enforced server-side.
6. The route executes inside the authorised scope.
7. Actions write audit/lifecycle/evidence records where applicable.

## Deprecated or compatibility-only behaviours

These are allowed only as compatibility layers:

- browser cached identity as the source of truth
- legacy `frontend/js/auth.js` without Next shell synchronisation
- route-only frontend guards without backend enforcement
- old assistant routes bypassing ORB scope
- direct child record reads without access scope
- document/evidence access without lifecycle/audit linkage

## Current security posture

IndiCare already has most of the required systems. The remaining work is convergence and enforcement:

- one live auth authority
- one session-security authority
- one passkey/MFA authority
- one RBAC/scope authority
- one audit/evidence integrity view

The platform should not add more security systems until existing systems are fully enforced everywhere.
