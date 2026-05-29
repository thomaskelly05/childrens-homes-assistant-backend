# ORB Academy / NVQ Convergence Audit

**Date:** 2026-05-29  
**Scope:** Converge existing IndiCare Academy / qualification / workforce learning assets into standalone `/orb` without a second ORB UI or live OS record access.

---

## 1. Existing Academy backend services

| File | Role | Standalone-safe? |
|------|------|------------------|
| `services/academy_service.py` | Modules, qualifications, dashboards, compliance aggregates | No — requires auth + home/provider scope |
| `services/academy_workbook_service.py` | Workbook submissions, assessor review, evidence linking | No — learner/OS-linked |
| `services/academy_intelligence_service.py` | Rule-based recommendations from Academy + optional OS signals | No — OS-linked intelligence |
| `db/academy_db.py` | SQL layer for `academy_*` tables | No — live DB |
| `schemas/academy.py` | Pydantic models for Academy domain | Schema only — safe as types, not data |

**Note:** No `*nvq*` filenames; NVQ-style pathways are modelled as qualifications, units, workbooks, observations, professional discussions, competency signoffs, and evidence portfolio.

---

## 2. Existing Academy routes

**`routers/academy_routes.py`** — prefix `/academy` (all `get_current_user`; manager/assessor gates on write paths):

- Dashboard/profile: `/dashboard/me`, `/profile/me`, `/profile/{user_id}`
- Compliance: `/compliance/home/{home_id}`, `/compliance/provider/{provider_id}`, quality-standards, sccif-domains
- Modules: list, detail, assign, `/my/modules`
- Workbooks: list, detail, submissions, answers, submit, review, manager-confirm, resubmit
- Evidence: `/evidence/my`, create, link, review
- Qualifications: list, detail, `/my/qualifications`, enrol, patch enrolment
- Observations, professional discussions, competency signoffs, certificates

**`routers/academy_intelligence_routes.py`** — prefix `/academy/intelligence`:

- `/me`, `/user/{user_id}`, `/home/{home_id}`, `assign-recommendations`

**Ghost registrations** in `core/router_loader.py` (files missing): `academy_manager_routes`, `academy_manager_compliance_routes`, `training_routes`.

---

## 3. Academy intelligence

- **Service:** `AcademyIntelligenceService` — reads Academy tables + optional incidents/notes/supervision for recommendations.
- **Routes:** `/academy/intelligence/*`
- **Standalone:** Not safe — uses user/home IDs and live data.

---

## 4–8. Workbooks, qualifications, evidence, certificates, compliance

| Capability | Backend | Legacy UI |
|------------|---------|-----------|
| Workbooks | `AcademyWorkbookService` + `/academy/workbooks*` | `frontend/js/academy-workbook-detail.js` |
| Qualifications | `AcademyService` + `/academy/qualifications*` | `academy-qualification-list.js`, `qualification-detail` |
| Evidence portfolio | `/academy/evidence*` | `academy-evidence-portfolio.js` |
| Certificates | `/academy/my/certificates` | `academy-certificates.js` |
| Staff compliance | `/academy/compliance/home/{id}` (stub uses hardcoded home in JS) | `academy-staff-compliance.js` |
| Manager compliance | compliance + review-queue + QS/SCCIF | `academy-manager-compliance.js` |

All **OS-only** for live records.

---

## 9. Training centre

| Implementation | API | Status |
|----------------|-----|--------|
| `frontend/js/features/training-centre.js` | `GET /academy/dashboard/me` | Alternate embed; not in YP shell nav |
| `frontend/js/young-people-shell/features/training-centre.js` | `/homes/{id}/training*` compat | Active in YP shell; fallback seed data |
| `frontend-next/app/staff/training-matrix` | `/api/workforce-os/training-matrix` | Separate workforce matrix — not `academy_*` |

---

## 10. Staff profile training links

- `StaffProfileService.get_staff_profile` embeds full `academy` block + `AcademyIntelligenceService.get_user_intelligence`.
- Routes: `/staff/me`, `/staff/{id}`, `/staff/home/{home_id}` cards.
- **Standalone:** No.

---

## 11. Legacy frontend only

- `frontend/academy.html`, `frontend/academy/*.html`, `frontend/js/academy-*.js` — primary Academy shell (API-ready consumer).
- `frontend/js/indicare-workspace/indicare-os-people-academy.js` — hardcoded course cards; no API.
- **No** `frontend-next` Academy pages.
- `core/frontend_routes.py` defines `ACADEMY_DIR` but does not register `/academy` HTML handlers (routing gap).

---

## 12. Backend-ready (reusable patterns)

- Workbook lifecycle patterns (submit → review → resubmit).
- Qualification/unit mapping concepts in schemas.
- Evidence linking and professional discussion models.
- Intelligence **rules** (conceptually) — must be reimplemented standalone without OS signals.

---

## 13. Safe to reuse in standalone ORB

- Generic qualification/diploma **themes** and reflective structure (prompts, not DB rows).
- Evidence mapping **logic** (user-described practice only).
- Staff learning principles, supervision-to-learning framing.
- Built-in knowledge packs: `academy_learning`, `nvq_diploma_support`, `workforce_development`, `qualification_evidence`, `reflective_practice_learning`.
- ORB Action Engine actions (see `docs/orb-action-engine.md`).
- Document intelligence NVQ lenses (supplied text only).

---

## 14. Should stay OS-only

- Live learner enrolments, submissions, certificates, compliance dashboards.
- `AcademyIntelligenceService` assign-recommendations to real users.
- Staff profile `academy` embed and home compliance aggregates.
- Any route requiring `home_id`, `user_id`, `learner_id`, `staff_id` in standalone context.

---

## 15. ORB actions / tools (converged)

See `services/orb_action_engine_service.py` — Academy/NVQ action IDs:

`map_to_nvq_evidence`, `explain_nvq_criteria`, `create_reflective_account_plan`, `review_reflective_account`, `create_professional_discussion_prompts`, `create_witness_testimony_prompt`, `identify_learning_evidence_gaps`, `create_learner_action_plan`, `assessor_feedback_draft`, `supervision_to_learning_evidence`, `incident_to_reflective_learning`, `policy_to_learning_questions`.

Tools menu: **Learning / Academy** in `orb-tools-panel.tsx`.

---

## 16. Further build later

- OS-connected ORB: permissioned pull of learner workbook status (future PR).
- Next.js Academy shell at `/academy` (platform contract gap).
- SQL migrations for `academy_*` in repo.
- Wire `academy_manager_routes` or remove ghost loader entries.
- Action streaming; live criteria packs from published qualification PDFs (governed ingest).

---

## ORB stack touched in this convergence

| Component | Change |
|-----------|--------|
| `services/orb_human_practice_brain_service.py` | **New** — role profiles, voice guide, what-missing hints |
| `services/orb_action_engine_service.py` | +12 Academy/NVQ actions, role-aware what-missing |
| `services/orb_knowledge_source_pack_service.py` | +5 source packs |
| `services/orb_data_vault_registry_service.py` | +5 data vaults |
| `services/orb_knowledge_retrieval_service.py` | Academy/NVQ intent routing |
| `services/orb_document_intelligence_service.py` | +8 NVQ lenses |
| `services/orb_general_assistant_service.py` | Human voice in system prompt |
| `frontend-next/lib/orb/adult-profile-store.ts` | NVQ assessor/learner/diploma roles |
| `frontend-next/components/orb-standalone/orb-tools-panel.tsx` | Learning / Academy section |
| Follow-up chips | NVQ/supervision/incident contextual actions |

**Standalone boundary (unchanged):** No live child/home/staff/chronology/Academy learner records. All outputs from user-supplied text and built-in knowledge only.
