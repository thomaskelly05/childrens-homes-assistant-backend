# ORB Action Engine (Standalone `/orb`)

**Date:** 2026-05-29 · **Route:** `POST /orb/standalone/actions/run` · **Registry:** `GET /orb/standalone/actions`

The ORB Action Engine turns response-bar follow-ups from composer prefills into **structured residential actions**. It uses the Knowledge Spine, ORB Operating Brain, and Data Vaults — without accessing live IndiCare OS records.

---

## Supported backend actions

| Action ID | UI label | Purpose |
|-----------|----------|---------|
| `what_am_i_missing` | What am I missing? | Gap analysis (child voice, evidence, timeline, safeguarding, chronology, follow-up) |
| `convert_to_recording_wording` | Recording wording | Factual, child-centred log wording |
| `create_manager_oversight_note` | Manager oversight | RM/RI oversight draft from provided text only |
| `create_chronology_suggestion` | Chronology suggestion | Draft entry — **not** inserted into chronology |
| `add_safeguarding_lens` | Safeguarding lens | Safety, facts, escalation, recording (deep/safety tier) |
| `add_ofsted_lens` | Ofsted lens | Child experience, evidence, leadership, Reg 44/45 |
| `create_checklist` | Checklist | Staff follow-up checklist |
| `make_more_concise` | More concise | Shorten without losing safeguarding or escalation points |
| `make_more_detailed` | More detailed | Structure, checks, next steps, evidence prompts |
| `therapeutic_reframe` | Therapeutic reframe | Trauma-informed, PACE/attachment-aware reframe |
| `supervision_prompt` | Supervision prompts | Reflection prompts for supervision |
| `shift_handover_summary` | Handover summary | Practical shift handover from provided content |
| `build_shift_plan` | Build shift plan | Full standalone shift plan (priorities, risks, reflection, gaps) |
| `add_child_voice_prompt` | Child voice prompt | Safe capture prompts; never invents child views |

### Academy / NVQ actions (2026-05-29)

| Action ID | UI label | Purpose |
|-----------|----------|---------|
| `map_to_nvq_evidence` | Map to NVQ evidence | Criteria/themes, gaps, authenticity warning |
| `explain_nvq_criteria` | Explain criteria | Plain-English diploma criteria |
| `create_reflective_account_plan` | Reflective account plan | 8-section plan from described practice only |
| `review_reflective_account` | Review reflective account | Structure/gaps — not official assessment |
| `create_professional_discussion_prompts` | PD prompts | Assessor PD questions |
| `create_witness_testimony_prompt` | Witness testimony | Witness scope and prompts |
| `identify_learning_evidence_gaps` | Evidence gaps | Portfolio gap analysis |
| `create_learner_action_plan` | Learner action plan | Authentic evidence collection plan |
| `assessor_feedback_draft` | Assessor feedback | Strengths, gaps, PD questions, boundary note |
| `supervision_to_learning_evidence` | Supervision to evidence | Link supervision to qualification evidence |
| `incident_to_reflective_learning` | Incident → learning | Reflective structure from described incident |
| `policy_to_learning_questions` | Policy → learning | Knowledge questions from policy text |

Role shaping: pass `context.profile_role` (e.g. `nvq_assessor`, `nvq_learner`). Human Practice Brain: `services/orb_human_practice_brain_service.py`.

Tools menu: **Learning / Academy** in `orb-tools-panel.tsx` calls `actions/run` when chat is active.

Implementation: `services/orb_action_engine_service.py` · Routes: `routers/orb_standalone_routes.py`

Frontend mapping: `frontend-next/lib/orb/orb-response-actions.ts` · Handler: `runBackendOrbAction` / `handleOrbFollowUp` in `orb-care-companion.tsx`

---

## Transform action safety rules

All transform actions must:

- Preserve uncertainty and meaning
- Not invent facts, names, dates, or child views
- Not hide poor practice or remove safeguarding concerns
- Not remove professional boundaries or create false evidence
- Not imply IndiCare OS records were checked

High-risk source text (injury, police, missing, abuse, etc.) routes transform and handover actions to **deep** prompt tier where relevant. Safeguarding lens always uses deep/safety tier.

---

## Standalone Shift Builder behaviour

Standalone Shift Builder on `/orb` does **not** access live OS records. It works from:

- User-provided shift notes and chat answers
- Uploaded document/text (when pasted or attached into context)
- Profile preferences and selected mode

`build_shift_plan` produces: shift priorities, known risks (from provided info), recording reminders, manager attention, safeguarding prompts, child voice prompts, handover summary, end-of-shift reflection, what am I missing, outstanding actions, and evidence/Ofsted relevance where appropriate.

The legacy `/orb/residential/shift-builder` route remains for structured section prompts (no LLM per section in one call). In-chat **Build shift plan** uses the action engine for a single assistant message result.

UI: response bar **Build shift plan** → `build_shift_plan` via `actions/run`. `/shift` slash command still opens composer guidance; follow-ups use the backend when supported.

---

## Frontend fallback actions

Composer prefill is used only when:

- The action is not in `BACKEND_SUPPORTED_ORB_RESPONSE_ACTIONS`
- The backend call fails (network or server error)
- No active chat exists

Unsupported or future actions remain prefill-only until registered with `backend_supported: true`.

---

## Document Intelligence integration

Structured **document lenses** (policy card, Reg 44 extraction, grouped action plans, etc.) run via:

- `POST /orb/standalone/documents/intelligence`
- Service: `services/orb_document_intelligence_service.py`

In-chat document chips on `/orb` call this route directly. The Action Engine remains the path for **message/response** follow-ups (`what_am_i_missing`, `create_checklist`, etc.). Where overlap exists (e.g. checklist, safeguarding lens), prefer the document intelligence route when the source is an uploaded document; use the action engine for assistant answer follow-ups.

See `docs/orb-document-intelligence-convergence-audit.md`.

## Standalone boundary

- Rejects OS identifiers: `child_id`, `young_person_id`, `home_id`, `staff_id`, `record_id`, `chronology_id` (including in `context`).
- Response always includes `standalone: true`, `os_records_accessed: false`.
- Answers prefix with: *“Based only on what you have provided…”* — never claims live record checks.
- Premium gate: `require_rich_orb_premium_access` (same as conversation).

---

## Request / response

```json
POST /orb/standalone/actions/run
{
  "action": "build_shift_plan",
  "source_message": "user question…",
  "source_answer": "assistant or pasted text…",
  "mode": "Ask ORB",
  "context": {}
}
```

```json
{
  "success": true,
  "data": {
    "action": "build_shift_plan",
    "title": "Build shift plan",
    "answer": "…",
    "sections": [{"heading": "…", "body": "…"}],
    "checklist": [],
    "confidence": "medium",
    "sources": [],
    "standalone": true,
    "os_records_accessed": false,
    "suggested_next_actions": []
  }
}
```

Streaming for actions is **not** implemented; conversation SSE at `/orb/standalone/conversation/stream` is unchanged.

---

## Future work

- Optional SSE for long action outputs
- Full export/document download from action results
- OS-connected actions on `/assistant/orb` with permissioned record context (separate engine path)
- In-chat wire to `/orb/residential/shift-builder` section-by-section workflow (optional; keep standalone boundary)

---

## OS-connected future difference

| Standalone `/orb` | IndiCare OS ORB `/assistant/orb` |
|-------------------|----------------------------------|
| User-provided text only | Permissioned chronology, plans, incidents |
| Heuristic + built-in knowledge | Live record retrieval where allowed |
| Artefacts / saved outputs | Writes and operational workflows (policy-gated) |

Do not merge these surfaces without explicit boundary checks.
