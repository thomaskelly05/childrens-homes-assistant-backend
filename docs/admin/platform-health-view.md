# Admin Platform Health View

## Purpose

Give managers, providers and technical administrators a clean view of whether IndiCare is operating from one source of truth.

This view should not feel technical. It should answer four simple questions:

1. Is the platform using the right source of truth?
2. Is the security model converged?
3. Is the database/schema healthy?
4. Are workflows wired into lifecycle, chronology and evidence?

## Recommended route

`/admin/platform-health`

## Data sources

Use the existing mounted audit endpoints:

- `/api/os-command/source-of-truth-audit`
- `/api/os-command/security-convergence`
- `/api/os-command/schema-audit`
- `/api/os-command/workflow-wiring-audit`

## Page sections

### 1. Page header

Title:

`Platform Health`

Description:

`A simple view of whether IndiCare is running from one source of truth, with security, schema and workflow convergence visible in one place.`

### 2. Four health cards

#### Source of truth

Shows:

- canonical domains
- compatibility domains
- partially converged domains
- next enforcement steps

#### Security convergence

Shows:

- identity/auth state
- MFA/passkey state
- session-security state
- ORB scope state
- evidence integrity state

#### Schema health

Shows:

- missing core tables
- missing OS tables
- missing OS views
- missing OS functions
- overall runtime safety

#### Workflow wiring

Shows:

- whether forms are wired
- lifecycle availability
- chronology linkage
- evidence linkage
- review/sign-off linkage

### 3. Plain-English platform state

This should say something like:

`IndiCare has a clear canonical direction. Some compatibility paths remain and should be converged gradually rather than rebuilt.`

### 4. Next enforcement steps

Keep this short:

- Move remaining compatibility auth paths to canonical auth
- Promote chronology projections as primary read model
- Present evidence and documents through one evidence view
- Migrate legacy assistant clients to ORB
- Route older form submissions through lifecycle wrappers

## Design rules

- Keep it calm and simple
- No complex graphs
- No technical jargon unless needed
- Use green/amber/red status badges
- Do not expose sensitive user data
- Do not expose raw database details to non-admin users
- Make it useful for a Provider, RI, Manager or technical admin

## Why this matters

This turns architecture governance into something visible and usable. Instead of hidden duplication, IndiCare can show where the platform is canonical, where it is compatible, and what still needs convergence.
