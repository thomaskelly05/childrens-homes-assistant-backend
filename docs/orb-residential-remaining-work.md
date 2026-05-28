# ORB Residential — Remaining Build & Convergence Work

## Current state

The repo now contains:

- shared intelligence spine direction
- standalone hard-boundary policy
- ORB Residential premium product definition
- converged intelligence runtime services
- Shift Builder service
- subscription architecture
- onboarding architecture
- premium database layer
- access control services
- runtime productisation roadmap

The platform is now architecturally aligned.

The remaining work is primarily:

# runtime wiring
# frontend convergence
# subscription enforcement
# UX refinement

---

# Remaining implementation work

## PRIORITY 1 — Runtime wiring

Status:

PARTIALLY COMPLETE.

### Goal

Make all standalone ORB workflows use the shared Intelligence Spine.

### Remaining tasks

- wire orb_converged_general_assistant_service into standalone conversation routes
- add feature-flagged migration support
- route Shift Builder through live frontend panels
- inject answer-quality processing into all standalone outputs
- inject response contracts into all rendering workflows
- add shared telemetry hooks

### Result

All ORB Residential workflows use:

- assistant modes
- knowledge loader
- answer quality
- safeguarding reasoning
- therapeutic reasoning
- response contracts

through one runtime.

---

## PRIORITY 2 — Frontend convergence

Status:

NOT STARTED.

### Goal

Create a premium ORB Residential experience.

### Required UI work

- ORB Residential landing screen
- premium onboarding flow
- role/environment selector
- personalised ORB greeting
- Shift Builder workspace
- saved outputs workspace
- projects workspace
- calm response renderer
- premium loading states
- reflective workflow cards
- document upload workspace
- voice workspace
- mobile-responsive layout

### Important rule

Do NOT expose:

- operational menus
- provider dashboards
- chronology references
- governance tooling
- OS language

---

## PRIORITY 3 — Subscription enforcement

Status:

FOUNDATIONS COMPLETE.

### Remaining tasks

- add runtime middleware for premium enforcement
- enforce subscription state on all ORB routes
- add trial activation flow
- add Stripe customer portal
- add upgrade modal
- add cancellation flow
- add trial-expired handling
- add usage limits
- add abuse protection

### Important rule

ORB Residential = premium product.

No unlimited free runtime.

---

## PRIORITY 4 — Saved continuity

Status:

DATABASE READY.

### Remaining tasks

- save outputs from ORB UI
- save projects from workflows
- recent conversations panel
- workflow history
- favourites/pinned outputs
- export/download support

### Strategic value

This creates:

- habit loops
- continuity
- emotional attachment
- workflow stickiness

---

## PRIORITY 5 — ORB identity refinement

Status:

EARLY FOUNDATIONS COMPLETE.

### Remaining tasks

- emotional tone refinement
- therapeutic response shaping
- role-aware prompting
- home-type-aware prompting
- support-style-aware prompting
- calmer response pacing
- premium visual language

### Goal

Users should feel:

# “ORB understands residential care.”

NOT:

# “I am using generic AI.”

---

## PRIORITY 6 — Knowledge convergence

Status:

PARTIALLY COMPLETE.

### Remaining tasks

- fully unify assistant/knowledge and ORB source packs
- ingest additional official guidance
- add knowledge review/versioning
- add citation confidence
- add source freshness handling
- add guidance expiry handling

### Important rule

The same safeguarding and recording intelligence must power:

- ORB Residential
- IndiCare OS

---

## PRIORITY 7 — Mobile-first refinement

Status:

NOT STARTED.

### Goal

Make ORB usable during real residential shifts.

### Requirements

- fast startup
- one-handed usage
- quick voice capture
- quick note capture
- calm layout
- low cognitive overload
- dark-mode optimisation
- large touch targets

### Strategic importance

Most users will use ORB:

- during shifts
- during incidents
- after incidents
- while emotionally tired

---

# What should NOT be built

Do NOT:

- fork the intelligence spine
- create separate safeguarding logic
- duplicate response contracts
- duplicate knowledge systems
- expose OS routes inside ORB Residential
- blur standalone/operational boundaries

---

# Final target architecture

## ORB Residential

Standalone premium intelligence application.

### Powered by:

# IndiCare Intelligence Spine

Uses:

- StandaloneContextAdapter only
- user supplied context only
- premium workflows
- saved continuity
- therapeutic intelligence

---

## IndiCare OS

Separate enterprise operational platform.

Uses:

- OperationalContextAdapter only
- live operational evidence
- chronology
- provider governance
- safeguarding intelligence
- oversight tooling

---

# Success definition

ORB Residential succeeds when:

- staff open it every shift
- staff trust the outputs
- staff feel emotionally supported
- staff improve recording quality
- staff rely on ORB during uncertainty
- ORB becomes part of daily residential practice
