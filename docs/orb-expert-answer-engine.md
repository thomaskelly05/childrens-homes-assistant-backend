# ORB Expert Answer Engine

Scenario families, source registry anchors, role lenses and local self-check now shape **live** standalone `/orb` answers — not only the offline stress-test pack.

## What changed

- New service: `services/orb_expert_answer_engine_service.py`
- Integrated into knowledge retrieval grounding, general/converged assistant answers, standalone routes metadata, action engine prompts, document intelligence lenses, and standalone source citation selection.

## Recognition

Deterministic keyword scoring over:

- `ORB_SCENARIO_FAMILIES` triggers and red flags
- Extra residential phrases (car, vape, restraint, Reg 44, NVQ, etc.)
- Recent user history (last four user turns)
- Optional adult profile role from message (`Role:` line) or action `context.profile_role`

Returns primary + up to five secondary families, risk level, output mode, markers, and source anchor IDs.

**Fast path:** greetings and very short general chat skip the expert engine (`prompt_tier=fast`).

## Expert packet

For recognised situations the engine builds a compact packet:

- Red flags, what to check/record/escalate
- Manager oversight, Reg 44 / Ofsted / NVQ points
- `must_not_say` boundaries (no invented OS access, referrals, body maps)
- Role shaping from `orb_human_practice_brain_service`
- Source anchors via `orb_citation_decision_service` (max six, deduped)

`build_prompt_block()` injects a short markdown section into `grounding_context` — not a full scenario dump.

## Role shaping

Uses human practice brain profiles for support worker, RM, RI, Reg 44, NVQ assessor/learner, etc. Answer shape hints prioritise what that role needs on shift.

## Feedback loop (review-only)

Downvotes with reasons such as `missed_safeguarding`, `incorrect_source`, or `missed_nvq_learning` can produce **improvement candidates** (expected markers, source anchors, role-lens issues) via `orb_feedback_improvement_service.generate_improvement_candidates()`. Candidates always have `review_required: true` — the scenario bank is not auto-edited from a single user's feedback. See `docs/orb-feedback-learning-loop.md`.

## Citations

Registry payloads include `why_cited`, `source_url`, `exact_text_available`, `basis_type`, `source_title`, `source_type`, `confidence`. Frontend popovers consume the same shape as the citation decision engine.

## Self-check (local only)

After the LLM answer (non-streaming blocking only on post-processing):

- Missing key markers
- Unsafe phrases (shared patterns with expert evaluator)
- Overclaim / source gaps / role-fit hints
- Critical gaps may append a short **Before you act, check…** line

Metadata: `context_used.expert_answer_engine` and `context_used.expert_self_check`.

No OpenAI call in the default evaluation path.

## Standalone boundary

- No live IndiCare OS, chronology, or Academy learner records
- Expert families inform **guidance only** from user-supplied text
- Does not replace safeguarding/deep routing or Action Engine / Document Intelligence

## Speed

- Recognition and packet build are in-process (milliseconds)
- Skipped on `fast` tier
- Streaming: self-check runs on final metadata, not before first token

## Future work

- Wire explicit `profile_role` on conversation API payload (today: profile block in message + actions context)
- Optional OpenAI evaluation when `ORB_EXPERT_EVAL_LLM=true` (not implemented)
- Richer multi-turn family persistence across long threads
- Provider policy placeholders when uploads exist in standalone vault

## Related docs

- [orb-residential-expert-stress-test-pack.md](./orb-residential-expert-stress-test-pack.md)
- [orb-source-citation-registry.md](./orb-source-citation-registry.md)
- [orb-action-engine.md](./orb-action-engine.md)
- [orb-document-intelligence-convergence-audit.md](./orb-document-intelligence-convergence-audit.md)
