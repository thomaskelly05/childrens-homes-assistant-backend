# 07 — Product, UX & Recording-Quality Audit (against P1, S1, O1)

Scope caveat: the frontends (`frontend-next/` 2,483 files; `frontend/` 527 files) were **NOT
read** — they are **OUT OF SCOPE** for this backend-focused audit and the app was not run. UX
claims are therefore mostly INFERRED/UNVERIFIED at the UI level; backend support is VERIFIED
where cited.

## Findings

**1. Chat as front door — aligned at backend (VERIFIED).**
- Standalone ORB chat surfaces exist (`routers/orb_standalone_routes.py`, assistant_orb group);
  `CLAUDE.md` non-negotiable. UI behaviour UNVERIFIED.

**2. Recording quality (factual, person-centred, observation vs interpretation) — aligned in the
brain (VERIFIED), UI-level UNVERIFIED.**
- Encoded in `assistant/prompts.py` (recording-excellence + safeguarding blocks; care values;
  banned determinations at `:492-494`) and `CLAUDE.md` "ORB tone and behaviour". Whether the
  Write/Dictate/Chat UIs present this and prompt for the child's voice / what-helped / follow-up
  is **UNVERIFIED** (frontend not read).

**3. Keep-the-adult-in-control (review/edit before save) — requires verification (UNVERIFIED).**
- Constitutional/prompt requirement is present (O4 §4; `CLAUDE.md`). **Not verified** that each
  ORB output surface enforces an explicit human review/edit step before save/send. This is a
  P1/launch-relevant verification.

**4. Voice / Dictate / Write — partially aligned (VERIFIED existence; NR-1 caveat).**
- Surfaces exist (`routers/orb_voice_*`, `orb_dictate_routes`, `orb_communicate_routes`, Write
  docs). **Dictate** transcription is governed (`ai_external_call_governance.py:384`). **Voice
  TTS** now uses the sanitised client (NR-1 Phase A) but full privacy-decision gating is
  remaining; TTS is opt-in (`ORB_TTS_ENABLED=false`). Per S1, AI/Voice/Dictate product claims
  must keep NR-1 visible.

**5. No surface duplication — partially aligned (VERIFIED tooling).**
- Router loader encodes canonical vs legacy (`core/router_loader.py`); Phase-1 found a dead
  duplicate root router (since the constitution work, repo housekeeping not part of this branch).

**6. Cost-aware UX — aligned at backend (VERIFIED).**
- Gateway soft limits; low-cost default model (O3).

## Verdict
**Partially aligned (backend support strong; UI unverified).** The intelligence layer encodes
child-centred, defensible recording and the "adult stays responsible" stance. The material
unknowns are at the **UI level** (not audited): human review/edit enforcement, presentation of
recording prompts, and that Voice/Dictate/Write surfaces respect NR-1. A UI/product audit (app
running) is required before broad launch.
