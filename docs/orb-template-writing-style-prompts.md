# ORB Template Writing Style Prompts

## Templates page

Recording library cards show:

- **Writing style chips** — Child-centred, Therapeutic, Factual, Professional, Safeguarding-aware, Ofsted-ready, Concise
- **"ORB will help you write this in a…"** section
- Spelling/grammar reminder

Source: `lib/orb/recording/orb-template-writing-styles.ts`

## ORB Write side panel

Adults can choose:

- Balanced (default — no auto-edit)
- Therapeutic, Child-centred, Factual, Professional, Safeguarding-aware, Ofsted-ready
- Inspection-ready, Manager summary, Easy-read briefing, Concise

Style buttons with `editMode` route through `editOrbDictateDocument` — suggestions only, adult applies.

Component: `components/orb-write/orb-write-writing-style-panel.tsx`

## Converged actions

Registry IDs: `apply_therapeutic_style`, `apply_child_centred_style`, `apply_concise_professional_style`, `apply_inspection_ready_style`.
