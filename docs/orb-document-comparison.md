# ORB Document Comparison

## Workflow

Documents & Guidance → **Compare Documents** tab:

1. Paste/upload **Document A** (previous/baseline).
2. Paste/upload **Document B** (new/comparison).
3. Select comparison lens.
4. **Compare with ORB** — routes to `POST /orb/standalone/documents/compare` (`policy_comparison`).

## Comparison lenses

| Lens | Output |
|------|--------|
| Recent changes | Change summary |
| Action plan | Manager action plan |
| Easy-read staff briefing | Plain-English briefing |
| Safeguarding implications | Safeguarding lens |
| Inspection readiness | Inspection thinking |
| Recording requirements | Recording lens |
| Quality Standards check | Standards alignment |

## Output sections

- Summary of key changes
- What this means in practice
- New or changed actions
- Risks / gaps to check
- Suggested staff briefing / manager action plan (lens-dependent)

## Actions

- Open in ORB Write (summary, action plan, staff briefing)
- Save to Saved Outputs (`policy_comparison`, `action_plan`, `staff_briefing`)
- Copy / Continue in Chat

## Safety

- Based only on provided text
- Draft — adult review required
- No regulatory judgements
- No auto-update of official guidance

Implementation: `lib/orb/document-comparison.ts`, `components/orb-standalone/orb-document-comparison-section.tsx`.
