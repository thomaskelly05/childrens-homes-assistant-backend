# ORB Care Companion vs IndiCare OS Assistant

This document defines the product boundary between the two assistant surfaces.

## 1. IndiCare OS Assistant

Route: `/assistant`

Purpose: operational assistant inside IndiCare OS.

Allowed context:

- OS workflows
- care records where the user has permission
- chronology
- dashboards
- governance tools
- compliance tooling
- staff and young person context where authorised

Behaviour:

- Supports operational decision-making.
- Can reason across permitted IndiCare OS data.
- Can support record, workflow, report and governance tasks.
- Must respect role, home and permission boundaries.

Do not use `/assistant` as the public standalone ORB product.

## 2. ORB Care Companion

Route: `/orb`

Purpose: standalone ChatGPT-style assistant for residential children's homes guidance, reflection and voice-first support.

API routes:

- `/orb/standalone/config`
- `/orb/standalone/conversation`
- `/orb/standalone/health`

Allowed context:

- public/general residential care knowledge
- safeguarding principles
- Ofsted/SCCIF style guidance
- reflective practice
- therapeutic practice ideas
- recording-quality prompts
- training and supervision style support

Disallowed context:

- IndiCare OS records
- young person records
- staff records
- chronology
- operational dashboards
- provider live data
- direct writes into the OS

Behaviour:

- Gives guidance, not statutory decisions.
- Encourages professional judgement.
- Reminds users to follow safeguarding procedures where risk is immediate.
- Must not imply it has checked records or live OS data.

## Product rule

`/assistant` is the OS assistant.

`/orb` is the standalone ORB Care Companion.

Do not route the `/orb` frontend to `/orb/conversation` or `/orb/config` because those are OS-linked ORB routes. The standalone frontend must call `/orb/standalone/*` only.
