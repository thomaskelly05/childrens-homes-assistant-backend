# ORB Navigation Feature Convergence Audit

## Summary

ORB Residential primary navigation was simplified from 12+ sidebar destinations to seven visible rooms. Overlapping practice tools remain available as Chat starters, Templates, ORB Write assistant actions, Documents lenses and Dictate outputs.

## Duplicated sidebar items (before)

| Sidebar item | Overlapped with |
|---|---|
| Shift Builder | Chat, Templates (Handover), Dictate outputs, ORB Write |
| Review | ORB Write assistant, Chat |
| Inspection Readiness | Documents & Guidance (Ofsted lens), Templates, Chat |
| Safeguarding Thinking | Chat, Templates, Documents lenses, ORB Write |
| Record This Properly | Dictate, ORB Write, Templates |
| Knowledge Library | Documents & Guidance |

## Visible navigation (after)

**MAIN:** Chat, Dictate, Voice, ORB Write

**LIBRARY:** Templates, Documents & Guidance, Saved Outputs

**ACCOUNT:** Profile, Settings, Billing

## Capability destination map

| Deprecated surface | New home |
|---|---|
| `shift_builder` | Templates → Handover / Shift Plan; Chat starter |
| `review` | ORB Write → Review this record; Chat starter |
| `inspection_readiness` | Documents → Inspection readiness / Ofsted lens; Chat starter |
| `safeguarding_thinking` | Chat starter; Templates → Safeguarding Concern |
| `record_properly` | Dictate; ORB Write → Record this properly; Templates |
| `knowledge` | Documents & Guidance (merged) |

## Preserved internally (not deleted)

- Panel ids: `shift_builder`, `review`, `inspection_readiness`, `safeguarding_thinking`, `record_properly`, `knowledge`, `skills`
- Components: `orb-shift-builder-panel.tsx`, `orb-review-panel.tsx`, `orb-practice-panels.tsx`, `orb-knowledge-library.tsx`
- Backend action engine ids and `/orb/standalone/actions/run`
- Deep-link routes: `/orb/review`, `/orb/learn`, `/orb-residential/shift-builder`

## Compatibility strategy

- URL `?station=` values for deprecated panels show a redirect card, then auto-navigate to the converged destination.
- Internal imports (saved outputs rerun, shift focus handoff) may still open legacy panels directly.
- Redirect card copy explains where the capability moved.

## Intentionally not changed

- Login, billing, safety acceptance, account, settings
- AI governance, redaction, audit, provider settings
- No new AI brain; no exposed brain metadata
- No child profile storage/selector added

## Key files

- `frontend-next/components/orb-residential/orb-residential-sidebar.tsx`
- `frontend-next/lib/orb/orb-navigation-convergence.ts`
- `frontend-next/components/orb-standalone/orb-care-companion.tsx`
- `frontend-next/lib/orb/orb-residential-copy.ts`
- `frontend-next/lib/orb/write/orb-write-ai-actions.ts`
- `frontend-next/lib/orb/document-intelligence.ts`
