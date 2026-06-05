# ORB Premium Design System — Audit (Phase 1)

Date: 2026-06-05  
Scope: ORB Residential standalone surfaces in `frontend-next/`

## Best current premium patterns to reuse

| Pattern | Location | Notes |
|---------|----------|-------|
| Glass cards | `orb-doc-glass-card` in `orb-premium-tokens.css` | Used on Dictate, Voice, Templates |
| Workspace layout | `orb-premium-workspace-layout.tsx` | Compact card + collapsed advanced |
| Panel shell | `orb-standalone-panel-shell.tsx` | Modal chrome, titles, footers |
| Recording library cards | `OrbRecordingLibraryCards` | Shared across Templates / Dictate / Write |
| Trust / boundary copy | `ORB_*_BOUNDARY_LINES` libs | Shift Builder, Documents, Saved Outputs |
| Theme tokens | `app/orb/orb-premium-tokens.css` | Light/dark residential variables |

## Inconsistent / duplicated before this pass

- Inline `rounded-xl bg-gradient-to-r from-[#168bff]` on many panels (Review, practice, templates).
- Tab strips built ad hoc (`rounded-lg border` + manual active classes).
- Empty states split between `OrbStationEmptyState` and custom dashed boxes.
- Documents vs Knowledge Centre: two routes (`documents` panel vs `knowledge` library) with overlapping purpose.
- Shift Builder: stacked form fields with all options visible.
- Saved Outputs: flat list styling vs Templates card grid.

## Screens needing polish (addressed in Phases 3–8)

- Documents & Guidance / Knowledge Library
- Templates
- Saved Outputs
- Shift Builder
- Review, Inspection Readiness, Safeguarding Thinking, Record This Properly

## Screens intentionally left alone

- Chat home / composer (already premium)
- Dictate studio (`components/orb/dictate/*`) — visual parity via shared tokens only
- ORB Write (`components/orb-write/*`)
- Voice station
- Billing, login, account, settings, provider AI trust controls
- IndiCare Intelligence Core wiring and backend brain metadata (not shown in UI)

## Design tokens needed (implemented)

- Primary blue gradient `#168bff` → `#0d5fcc`
- Glass surfaces `--orb-surface-elevated`, `--orb-line`
- Radii: `rounded-xl` controls, `rounded-2xl` cards
- Canonical action labels in `components/orb/premium/orb-premium-theme.ts`

## Route preservation

| Route / panel id | Label after pass |
|------------------|------------------|
| `documents` | Documents & Guidance |
| `knowledge` | Knowledge Library (governance; overlaps Documents) |
| `templates` | Templates |
| `saved_outputs` | Saved Outputs |
| `shift_builder` | Shift Builder |
| `review` | Review |
| `inspection_readiness` | Inspection Readiness |
| `safeguarding_thinking` | Safeguarding Thinking |
| `record_properly` | Record This Properly |
| `orb_write` | ORB Write (unchanged) |
| `orb_dictate` | Dictate (unchanged) |
| `orb_voice` | Voice (unchanged) |

## What must remain unchanged

- Core feature logic (analyse, generate, save, template APIs).
- No child profile storage/selector in standalone ORB.
- No removal of safety/privacy copy or tests without replacement.
- Advanced / brain metadata not shown to end users on practice stations.
