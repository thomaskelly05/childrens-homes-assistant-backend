# ORB Spellcheck and Writing Quality

## Layer 1 — Browser spellcheck

`spellCheck` enabled on:

- ORB Write content editor (`orb-write-editor.tsx`)
- ORB Write rough notes (`orb-write-source-panel.tsx`)
- Documents paste/analyse textareas
- Document comparison Document A/B textareas
- Dictate transcript editor (`orb-dictate-studio.tsx`)

## Layer 2 — ORB governed edit actions

Via `editOrbDictateDocument` / converged registry:

| Action | Edit mode |
|--------|-----------|
| Check spelling and grammar | `spelling_grammar` |
| Improve grammar | `spelling_grammar` |
| Check names, dates and times | `missing_information` |
| Apply therapeutic / child-centred / concise / inspection styles | respective modes |

ORB Write AI panel shows `pendingEdit` with change summary — **adult must accept** before apply.

## Rules

- No silent autocorrection of care records
- Do not alter meaning without adult approval
- Preserve child direct quotes unless clearly proposed as correction
- Templates show: "Before finalising, ORB will help check spelling, grammar, names, times and dates."

Panel groups: **Spelling & grammar**, **Writing style** in `ORB_CONVERGED_WRITE_PANEL_GROUPS`.
