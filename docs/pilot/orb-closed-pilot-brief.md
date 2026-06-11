# ORB Residential — Closed Pilot Brief (V1)

**Version:** 1.0.0-closed-pilot  
**Last updated:** 2026-06-11  
**Audience:** Registered managers, provider leads and supervised pilot staff in 5–10 children’s homes

---

## Purpose of the pilot

This is a **closed, supervised validation pilot** — not a public launch.

The purpose is to learn, safely and honestly, whether ORB Residential:

- returns time to direct care with children
- improves recording quality and clarity
- keeps the **child’s voice, wishes and feelings** central
- supports **therapeutic language** and **behaviour as communication**
- increases staff confidence without replacing professional judgement
- reminds staff about safeguarding escalation and local policy

ORB supports staff. It does **not** replace professional judgement, manager oversight or organisational safeguarding procedures.

---

## Who should participate

- **Registered managers** who can supervise use and review feedback weekly
- **Experienced staff** (support workers, senior staff, team leaders) who write records regularly
- **5–10 supervised homes** invited by IndiCare — not open self-service sign-up

Participants must have completed ORB onboarding and read the closed-pilot privacy notice at `/orb/privacy`.

---

## What ORB should be used for

- Drafting and structuring daily records, handovers and reflections
- Chat, Dictate, Write and Voice support for **anonymised or minimal-detail** practice
- Exploring therapeutic wording and behaviour-as-communication framing
- Saving time on routine recording tasks so staff can spend more time with children
- Submitting **safe pilot feedback** at `/orb/pilot/feedback`

---

## What ORB should not be used for

- Entering **full child records**, chronologies, court documents or police reports
- **Emergencies** or immediate safeguarding escalation (follow local procedures)
- Replacing **manager sign-off**, **Ofsted readiness** judgements or **statutory** decisions
- Sharing identifiable child or staff details in feedback forms
- Public marketing, provider-wide licensing or automated outcome claims

---

## Privacy and data classification

Follow **Green / Amber / Red** guidance on the ORB privacy page:

| Level | Guidance |
|-------|----------|
| **Green** | General practice questions, training scenarios, anonymised examples |
| **Amber** | Initials, minimal context, checked shift-note summaries |
| **Red** | Full records, NHS numbers, addresses, formal reports, detailed safeguarding narratives |

Staff remain responsible for what they enter. ORB usage metadata may be stored; chat content on device is user-controlled in this pilot build.

---

## Safeguarding caveats

- ORB may **remind** staff to consider safeguarding escalation — it does **not** make safeguarding decisions
- **Local policy and professional judgement always take precedence**
- If a child is at risk, follow your organisation’s safeguarding procedures immediately
- Do not paste safeguarding narratives into pilot feedback

---

## Staff responsibility

Each staff member is responsible for:

- accuracy of records before saving or exporting
- deciding what identifying information (if any) is appropriate to enter
- escalating safeguarding concerns through proper channels
- reviewing ORB output critically — behaviour is communication; punitive language is discouraged

---

## Manager oversight

Registered managers should:

- agree which tasks ORB may support in their home
- review a sample of ORB-assisted records weekly
- review pilot feedback themes (founder dashboard) for safety concerns first
- ensure staff know what must **not** be entered into ORB
- stop wider use if critical safety or quality concerns emerge

---

## Outcome measures

The closed pilot tracks seven outcome areas (manual feedback in V1):

1. Time returned to direct care  
2. Recording quality  
3. Child voice  
4. Therapeutic language  
5. Staff confidence  
6. Manager oversight  
7. Safeguarding and Ofsted readiness  

All metrics are **manual staff feedback** unless labelled **live telemetry**. Fewer than five responses are labelled **early signal only — not enough responses for reliable evidence**.

---

## Feedback expectations

- Staff submit brief feedback after using ORB: `/orb/pilot/feedback`
- **No child names, staff names, full records or safeguarding narratives**
- Managers review aggregated themes on the founder pilot dashboard
- Feedback is sanitised; unsafe content is rejected or redacted

---

## Suggested pilot length

**6–8 weeks** of supervised use in each home, with:

- Week 1: onboarding, privacy briefing, first supervised tasks  
- Weeks 2–6: regular use on agreed tasks + weekly feedback  
- Weeks 7–8: manager review, readiness gate check, decision on wider evidence gathering  

---

## Success criteria

The pilot is succeeding if, with honest measurement:

- staff report time saved on agreed tasks (with early-signal caveats until n≥5)
- record quality and child-voice ratings trend positively in manual feedback
- no critical Quality Lab failures remain open
- privacy UX and whistleblowing coverage gates pass
- safety concerns are rare, actionable and resolved
- managers confirm ORB supports — not undermines — professional practice

---

## What would stop wider rollout

- Critical failures in live Quality Lab GOLD verification
- Repeated unsafe feedback or staff entering RED-classification data routinely
- Privacy UX or closed-pilot notice gaps
- Missing whistleblowing scenario coverage
- Unresolved high-risk human review items in Quality Lab
- Evidence of ORB undermining safeguarding, child voice or local policy compliance

---

## What would support wider rollout

- Closed-pilot readiness gate: **closed-pilot-ready**
- Consistent manual feedback across multiple homes (n≥5 per home where possible)
- Manager-reviewed samples showing improved structure and child-centred language
- No open critical failures; high-risk scenarios human-reviewed
- Documented improvements from friction themes
- Approved path to broader pilot evidence gathering (not public launch)

---

## Core principles

- **Behaviour is communication**
- **Child voice remains central**
- **ORB supports staff but does not replace professional judgement**
- **Local policy must be followed**

---

## Verification status (V1 build)

| Check | Status |
|-------|--------|
| Pilot readiness gate module | Implemented |
| Pilot feedback API + sanitisation | Implemented |
| `/orb/pilot/feedback` UX | Implemented |
| `/founder/orb-pilot` dashboard | Implemented |
| Quality Lab + privacy integration | Implemented |
| ORB Founder pilot questions | Implemented |
| Automated record-quality scoring | **Not in V1** — manual feedback only |
| Live telemetry outcome evidence | **Not in V1** — labelled unavailable |
| External evidence approval workflow | **Not in V1** — Evidence Engine hook only |
| Provider-wide licensing | **Out of scope** |
| Public launch features | **Out of scope** |

### Remaining limitations

- Pilot metrics depend on voluntary, sanitised staff feedback — not verified time studies
- Build-passing status is assumed in deployed environments; CI status is not wired live
- Quality Lab live LLM runs require `OPENAI_API_KEY` in the deployment environment
- Fewer than five responses per home remain **early signal only**
- Manager review of anonymised records is a manual process outside this V1 layer

---

*For technical verification commands, see the ORB Closed Pilot Validation V1 implementation in `frontend-next/lib/orb/pilot/` and `tests/test_orb_pilot_routes.py`.*
