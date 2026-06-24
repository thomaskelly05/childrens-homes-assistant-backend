# ORB Residential Closed Pilot Readiness Audit

**Date:** 2026-06-24  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Scope:** Controlled closed pilot hardening pass (builds on PRs #1729–#1739)  
**Positioning:** Controlled closed pilot for adult-reviewed recording, reflection and practice support — not compliance automation, safeguarding decision-maker, or care management replacement.

---

## Executive summary

ORB Residential has the end-to-end architecture in place for a **small controlled closed pilot** with trusted residential childcare adults. Chat, Dictate, Voice, ORB Write, Records & Drafts, template search, working documents, records workspace persistence, and home documents are wired. Safeguarding escalation, adult-review disclaimers, and founder analytics redaction are present.

**Verdict:** Ready for **controlled closed pilot** once deployment migrations are applied, `OPENAI_API_KEY` is configured in staging, and founder live GOLD human review is completed. Not ready for public launch.

---

## Pass / concern / fail table

| Area | Status | Notes |
|------|--------|-------|
| **Chat** | Pass | Streaming, instant safeguarding preludes, daily record draft mode, template action handoff |
| **Dictate** | Pass | Quick Record default, working document engine, save to workspace |
| **Voice** | Pass | Post-call draft/Write handoffs; raw audio not stored by default |
| **ORB Write** | Pass | Template search, working document studio, review checklist, finalise confirmation |
| **Records & Drafts** | Concern | Workspace + legacy saved outputs coexist; status filter chips added this pass |
| **Template search** | Pass | Taxonomy search with synonyms (Reg 45, LADO, missing, physical intervention) |
| **Working document engine** | Pass | Sections/tables/action plans for key lifecycle templates |
| **Records workspace persistence** | Concern | Requires manual migration `210`; memory fallback if table missing |
| **Home documents** | Concern | Requires manual migration `211`; localStorage prototype still coexists |
| **Source chips** | Pass | Metadata-only; home document chips use type labels not raw text |
| **Sidebar / navigation** | Pass | Phase 1A nav; Communicate hidden unless `NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE=1` |
| **Mobile layout** | Pass | Responsive sidebar, mobile filter drawer, safe-area padding |
| **Privacy / safeguarding footer** | Pass | Consistent professional-judgement copy; no compliance guarantee |
| **Feature flags** | Pass | Communicate gated; voice realtime off by default |
| **Database migrations** | Concern | 210/211 not auto-applied at startup |
| **Live OpenAI strict mode** | Concern | `AI_PROVIDER_STRICT` + `ORB_LIVE_SIGN_OFF` enforced when signoff enabled |
| **Provider fallback** | Pass | Mock blocked from user-visible answers in staging/signoff |
| **Audit logging** | Pass | JSONB audit_trail on workspace items and home documents |
| **Founder / admin redaction** | Pass | `orb_founder_analytics_foundation_service` blocks identifiers by default |
| **Quick Record consistency** | Pass | Frontend/backend framework JSON aligned (this pass) |
| **Live GOLD verification** | Fail | Requires staging `OPENAI_API_KEY` + founder human review of 59 high-risk scenarios |
| **Privacy retention sign-off** | Concern | Not required for closed pilot; required for public launch |

---

## Production blockers

1. **Migrations 210 and 211 not applied** — records workspace and home documents fall back to in-memory storage; data lost on restart.
2. **`OPENAI_API_KEY` absent in deployment** — live ORB answers unavailable; GOLD pack cannot complete.
3. **Live GOLD human review incomplete** — 59 high/critical scenarios require founder `reviewed-pass/concern/fail`.
4. **Privacy & retention sign-off** — required before any public launch (not closed pilot).

---

## Pilot blockers

1. Apply `sql/210_orb_records_workspace.sql` and `sql/211_orb_home_documents.sql` to pilot database.
2. Configure `OPENAI_API_KEY`, `DATABASE_URL`, `SESSION_SECRET` in pilot environment.
3. Run `python scripts/check_orb_pilot_readiness.py` and resolve failures.
4. Complete founder live GOLD review for high-risk safeguarding scenarios in staging.
5. Confirm pilot users have ORB Residential premium access and home scoping.

---

## Non-blocking polish

- Dual records persistence (workspace + legacy `orb_saved_outputs`) — convergence ongoing.
- Home documents localStorage library coexists with server API — prefer server path in pilot.
- Eight workspace sections defined in schema; UI shows filters only.
- Platform `audit_event_service` not wired to workspace/home-doc row audit (JSONB sufficient for pilot).
- `routers/feature_flags_routes.py` referenced in loader but absent — core OS only, not ORB pilot.

---

## Recommended pilot scope

See `docs/pilot/orb-closed-pilot-scope.md` for full detail. Summary:

- **Users:** 3–8 trusted residential staff (key workers, seniors, one registered/deputy manager) at one home.
- **Stations:** Chat, Dictate, Voice, ORB Write, Records & Drafts, authorised home documents.
- **Excluded:** Communicate (unless flag enabled), OS care records write-back, child-facing surfaces, compliance automation claims.
- **Success:** Adults can ask ORB, dictate/talk, use templates, save/reopen drafts, review before finalising, with safeguarding escalation intact.

---

## Flow verification (adult journeys)

| # | Flow | Result |
|---|------|--------|
| 1 | Chat daily record (breakfast prompt) | Pass — narrative draft, no placeholders, template action |
| 2 | Chat safeguarding (self-harm) | Pass — immediate prelude, manager/on-call, no generic filler |
| 3 | Chat → ORB Write | Pass — use template opens working document with sections |
| 4 | ORB Write Reg 45 | Pass — search, table/action plan, save/reopen preserves structure |
| 5 | Dictate Quick Record | Pass — transcript → template suggest → Write or save draft |
| 6 | Voice post-call | Pass — create draft, save to My Drafts, no audio storage conflict |
| 7 | Records & Drafts | Pass — list, status, reopen, archive; finalise requires confirmation in Write |
| 8 | Home documents | Pass — upload/list/status; source chip label-only; permission-aware retrieval |

---

## Safeguarding and ethics

| Check | Status |
|-------|--------|
| No compliance guarantee language | Pass |
| No diagnosis language in templates | Pass |
| Does not replace manager/social worker judgement | Pass — disclaimers in safety copy |
| Safeguarding prompts escalate appropriately | Pass — `safeguarding_escalation.py` |
| Local policy caveat where relevant | Pass — `HOME_AWARE_ANSWER_DISCLAIMER` |
| Home documents cannot override safeguarding | Pass — retrieval advisory only |
| High-risk working documents show review reminder | Pass — `WORKING_DOCUMENT_REVIEW_REMINDER` |
| Finalise requires explicit action | Pass — `data-orb-write-finalise-confirm` |

---

## Privacy and audit

| Check | Status |
|-------|--------|
| Records workspace user-scoped by default | Pass |
| Founder analytics redacted by default | Pass |
| Uploads home/organisation scoped | Pass |
| Audit events on save/update/finalise/archive/upload | Pass — JSONB `audit_trail` |
| Extracted document text not in normal APIs | Pass — `OrbHomeDocumentRecord` excludes `extracted_text` |
| Source chips do not expose raw sensitive content | Pass |
| Privacy classification fields populated | Pass — defaults on create |

---

## Readiness tooling

- **Migration checklist:** `docs/deployment/orb-closed-pilot-migration-checklist.md`
- **Readiness script:** `python scripts/check_orb_pilot_readiness.py`
- **Founder endpoint:** `GET /orb/pilot/readiness` (founder only)
- **Tests:** `tests/test_orb_closed_pilot_readiness.py`

---

## Related prior audits

- `docs/audits/orb-closed-pilot-readiness-pass-report.md` — gate run 2026-06-23
- `docs/audits/orb-residential-visual-convergence-audit.md` — PR #1739
- `docs/audits/orb-records-documents-convergence-map.md` — PR #1735/#1736
