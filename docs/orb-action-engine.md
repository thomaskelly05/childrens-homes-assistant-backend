# ORB Action Engine (Standalone `/orb`)

**Date:** 2026-05-28 · **Route:** `POST /orb/standalone/actions/run` · **Registry:** `GET /orb/standalone/actions`

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

Implementation: `services/orb_action_engine_service.py` · Routes: `routers/orb_standalone_routes.py`

---

## Frontend fallback actions

These remain **composer prefill** until backend support is enabled:

- `more_concise` / `more_detailed`
- `child_voice`
- `shift_builder` (use dedicated `/orb/residential/shift-builder` in a future pass)
- `therapeutic_reframe`, `supervision_prompt` (registry only)

Mapping: `frontend-next/lib/orb/orb-response-actions.ts` · Handler: `prefillOrbFollowUpComposer` in `orb-care-companion.tsx`

---

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
  "action": "what_am_i_missing",
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
    "action": "what_am_i_missing",
    "title": "What am I missing?",
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

## Future actions

- Wire `shift_handover_summary` to backend (or residential shift-builder API).
- Backend support for `make_more_concise` / `make_more_detailed`.
- Optional SSE for long action outputs.
- OS-connected actions on `/assistant/orb` with permissioned record context (separate engine path).

---

## OS-connected future difference

| Standalone `/orb` | IndiCare OS ORB `/assistant/orb` |
|-------------------|----------------------------------|
| User-provided text only | Permissioned chronology, plans, incidents |
| Heuristic + built-in knowledge | Live record retrieval where allowed |
| Artefacts / saved outputs | Writes and operational workflows (policy-gated) |

Do not merge these surfaces without explicit boundary checks.
