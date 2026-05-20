# Sprint M — Security Convergence & Safeguarding Integrity

## Objective

Move IndiCare from:

- multiple partially-connected security paths

To:

- one canonical safeguarding-grade security architecture.

This sprint does not add major new security systems.

It converges and enforces the systems already built.

---

# Canonical Security Objectives

## 1. Canonical identity authority

The platform must have:

- one authoritative auth runtime
- one authoritative MFA state
- one authoritative passkey state
- one authoritative session-security state

### Canonical systems

Backend:

- auth_routes
- mfa_routes
- passkey_routes
- session_security_service

Frontend:

- frontend-next/contexts/auth-context.tsx

Compatibility-only:

- frontend/js/auth.js

---

## 2. Canonical session security

All protected requests must validate:

- signed session
- revocation state
- MFA state
- passkey state
- user scope
- provider/home scope

The frontend must never treat cached identity as authoritative for protected routes.

---

## 3. Canonical ORB security

ORB must operate inside:

- RBAC boundaries
- child scope boundaries
- provider/home scope
- evidence visibility scope
- chronology scope

ORB must never bypass operational permissions.

---

## 4. Canonical audit integrity

Operational records must preserve:

- chronology lineage
- lifecycle lineage
- evidence lineage
- audit lineage
- AI lineage

The platform should eventually support:

- immutable chronology snapshots
- append-only audit trails
- tamper-aware evidence chains

---

# Enforcement Work

## Security convergence audit endpoint

Create:

- `/api/os-command/security-convergence`

The endpoint should verify:

- canonical auth runtime mounted
- passkey routes mounted
- MFA routes mounted
- session security mounted
- scope middleware mounted
- CSRF enabled
- protected routes using canonical auth
- compatibility-only auth paths identified
- duplicate auth paths identified
- ORB routes scoped correctly

---

## Canonical route classification

Classify routes as:

- canonical
- compatibility-only
- deprecated
- bypass risk

High-risk examples:

- routes using old auth.js only
- routes bypassing auth-context
- routes missing RBAC
- routes reading child data directly
- routes bypassing chronology/evidence linkage

---

## Security drift detection

The platform should detect:

- routes mounted without auth
- routes bypassing scope middleware
- duplicate auth runtimes
- legacy assistant auth bypasses
- direct chronology access
- direct evidence access

---

## Child-scope enforcement

Operational routes should gradually enforce:

- child scope
- provider scope
- home scope
- workforce scope
- safeguarding sensitivity level

---

## Safeguarding-grade protection roadmap

Future roadmap:

- immutable evidence hashing
- append-only chronology
- safeguarding intelligence boundary
- behavioural threat analytics
- trusted device enforcement
- biometric-required sensitive actions
- AI safeguarding validation
- export anomaly detection

---

# Success Criteria

IndiCare should behave as:

- one operating system
- one auth authority
- one security authority
- one evidence authority
- one chronology authority
- one operational governance model

—not parallel partially-connected systems.
