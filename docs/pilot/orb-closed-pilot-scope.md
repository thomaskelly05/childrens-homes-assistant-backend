# ORB Residential — Controlled Closed Pilot Scope

**Positioning:** Controlled closed pilot for adult-reviewed recording, reflection and practice support.

**Not:** Compliance automation · Safeguarding decision-maker · Care management replacement

---

## Purpose

Validate that a small group of trusted residential childcare adults can use ORB naturally and safely for everyday recording support — with human review before any record is used in practice.

---

## Recommended pilot users

- **3–8 adults** at a single children's home or small provider group
- Roles: key workers, residential support workers, seniors, one registered or deputy manager
- All users must:
  - Complete ORB safety onboarding / legal acceptance
  - Understand outputs are drafts for adult review
  - Have home-scoped ORB Residential access
- **Exclude:** Young people, external partners, untrained agency staff, public self-signup

---

## Included uses

| Station | Pilot use |
|---------|-----------|
| **Chat** | Reflect on situations, daily records, safeguarding thinking, Reg 44/45 guidance |
| **Dictate** | Quick Record and template-backed dictation |
| **Voice** | Talk through a situation; post-call draft creation |
| **ORB Write** | Template working documents, review checklist, export for adult review |
| **Records & Drafts** | Save, reopen, review status, archive |
| **Home documents** | Upload/list home policies where user is authorised (manager+) |

---

## Excluded uses

- Communicate station (unless `NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE=1` explicitly approved)
- Writing directly into IndiCare OS child care records without human review
- Automated safeguarding decisions or threshold conclusions
- Compliance certification or inspection readiness claims
- Child-facing ORB surfaces
- Bulk upload of identifiable child records for AI processing
- Use as sole evidence for statutory decisions without manager review

---

## Safety boundaries

1. **ORB supports professional judgement** — it does not replace manager, social worker or health professional decisions.
2. **Safeguarding escalation** — immediate risk prompts direct adults to manager/on-call/local procedures and emergency services when appropriate.
3. **No compliance guarantee** — ORB does not guarantee regulatory compliance or inspection outcomes.
4. **Adult review required** — all drafts must be reviewed before use in practice or filing.
5. **Home documents** — inform answers; they do not override safeguarding duties or national guidance.
6. **Privacy** — do not enter unnecessary identifiable information; follow home data protection policy.
7. **Stop using** if ORB produces unsafe reassurance, invents facts, or undermines safeguarding — report immediately.

---

## Feedback questions (end of pilot week)

1. Which station helped most for everyday recording?
2. Did safeguarding answers feel appropriately cautious and actionable?
3. Was it clear that outputs are drafts for your review?
4. Did save/reopen in Records & Drafts work reliably?
5. Were template suggestions relevant (daily record, incident, Reg 45)?
6. Any wording that felt wrong, too generic, or not child-centred?
7. Did home document references feel helpful without exposing too much in the UI?
8. What would you not use ORB for, even if it suggested it?
9. Time saved vs extra review time — net benefit?
10. Would you recommend continued pilot at your home? Why / why not?

Submit via `/orb/pilot/feedback` or agreed manager channel.

---

## Stop criteria

Stop the pilot immediately if any of the following occur:

- ORB gives unsafe reassurance on self-harm, missing, or abuse scenarios
- Identifiable child/staff data appears in founder analytics
- Workspace drafts visible across users (scoping failure)
- Repeated live LLM failures with mock/fallback answers shown to users in production
- Registered manager or safeguarding lead requests halt
- Data protection incident linked to ORB pilot usage

---

## Issue reporting route

1. **Immediate safeguarding concern** — follow home escalation; do not wait for ORB fix
2. **ORB product issue** — manager → provider admin → founder via agreed support channel
3. **Technical failure** — include station, prompt (sanitised), timestamp, screenshot if safe
4. **Founder quality review** — `/founder/quality-lab` for GOLD scenario concerns

---

## Data collected

| Data | Collected | Purpose |
|------|-----------|---------|
| Workspace draft metadata & body | Yes (user-scoped) | Save/reopen drafts |
| Home document uploads | Yes (home-scoped) | Policy-aware answers |
| Audit trail (actions) | Yes | Accountability |
| Anonymised usage aggregates | Yes (founder) | Pilot evaluation |
| Pilot feedback form | Yes (voluntary) | Product learning |
| Voice raw audio | No (default) | Ephemeral processing only |
| OpenAI training | No | API terms — no training on submissions |

---

## Data not collected

- Child-facing profiles or OS care record contents (unless explicitly entered by adult in a draft)
- Raw audio retention (default off)
- Identifiable child/staff names in founder analytics (redacted by default)
- Automated compliance scores presented as authoritative

---

## Human review expectations

- Every draft reviewed by the authoring adult before practice use
- Manager spot-check of safeguarding-related drafts during pilot week
- Founder reviews high-risk GOLD scenarios before expanding pilot
- No draft treated as a final statutory record without explicit human finalisation

---

## Success measures

| Measure | Target |
|---------|--------|
| Core flow completion (chat → save → reopen) | ≥80% of pilot users succeed without support |
| Safeguarding scenario appropriateness | 0 critical failures in reviewed GOLD items |
| Draft review discipline | 100% of used outputs manually reviewed (self-reported) |
| Data scoping | 0 cross-user draft leakage incidents |
| Pilot feedback | ≥70% would continue with clear boundaries |
| System availability | Workspace persistence on database (not memory fallback) |

---

## Pilot duration

- **Recommended:** 2–4 weeks controlled closed pilot
- **Review:** End-of-week manager check-in + founder quality snapshot
- **Next step:** Expand only after migrations stable, GOLD review complete, and no stop criteria triggered
