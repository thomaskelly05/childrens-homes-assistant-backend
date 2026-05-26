# ORB Live Recording Coach + Form-Specific Guidance

## Live coach principles

ORB supports adults to write their best record while they type. The live coach is:

- **Live** — debounced local analysis runs in the browser as the adult writes
- **Contextual** — uses form id, recording type, metadata and structured field completion
- **Form-specific** — guidance and prompts differ by form and category
- **Child-centred & trauma-informed** — suggests factual, reflective, non-judgemental wording
- **Safe** — never auto-submits, never silently rewrites records, never sends full draft bodies to ORB automatically

Adults remain responsible for the final record. Suggestions can be accepted, copied, dismissed or ignored.

## Form-specific guidance model

Guidance lives in `frontend-next/lib/record/recording-form-guidance.ts`.

Each form resolves to either:

1. **Specific guidance** — unique copy for high-risk/P0 forms (daily note, incident, safeguarding, restraint, etc.)
2. **Category fallback** — one of 11 category templates (daily life, safeguarding/incident, health/medication, etc.)

Sections include heading prompts, good-record criteria, avoid lists, child voice/adult response/follow-up/plan impact/review guidance, ORB live coach prompts and grammar style rules.

## Adult control boundaries

- Accept inserts suggestion text at cursor/end — never replaces full body silently
- Copy copies suggestion to clipboard
- Dismiss is session-local only
- Ask ORB opens `/assistant/orb` with scoped context (form id, flags, optional excerpt) — **not** full draft body
- Standalone `/orb` remains a separate wording helper with no OS data access

## Privacy / ORB boundaries

- Local analysis (`live-recording-analysis.ts`) runs entirely in the browser — no draft body sent for local hints
- Operational ORB receives: scope, child/home id, form id, recording type, high-level flags, user prompt, optional adult-selected excerpt only
- Draft bodies are not placed in ORB URLs
- Safeguarding narratives are not exposed beyond what the adult writes and submits through normal review routes

## Examples

### Daily note
- Tone: warm, balanced, ordinary life
- Heading: “What happened today?”
- Prompts child voice, routines, positives and worries

### Safeguarding concern
- Tone: factual, exact words, escalation-first
- Heading: “What was noticed, said or disclosed?”
- Strong manager/safeguarding review flags

### Physical intervention
- De-escalation first, duration, holds, injury checks, debriefs
- Manager review required

## Limitations

- Local analysis uses pattern/heuristic rules — not a substitute for manager judgement
- Browser spellcheck depends on browser/OS language settings
- ORB live coach backend mode provides general coaching — it does not read unsent draft bodies unless the adult pastes an excerpt
- Quality score is indicative only, not an inspection grade
- Category fallback guidance is generic — high-risk forms should use specific overrides
