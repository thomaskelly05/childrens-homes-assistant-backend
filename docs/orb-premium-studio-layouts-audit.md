# ORB Premium Studio Layouts — Audit

**Date:** June 2026  
**Scope:** Standalone ORB Residential (`/orb`) product surfaces

## Summary

ORB Residential already had a consistent OrbPremium design system (v2) and functional station panels. This pass adds **OrbStudio*** layout components and upgrades each product area from flat form stacks into dedicated studio workspaces — without changing backend routes, intelligence wiring, or handoff flows.

## Surfaces audited

| Surface | Status before | Studio upgrade |
|---------|---------------|----------------|
| Chat home | Working; composer + sidebar | Unchanged (already premium shell) |
| Dictate | Functional studio; flat action rail | `OrbStudioShell`, premium action rail, empty glow |
| ORB Write | Toolbar + canvas existed; 2-column layout | **3-column word processor v2** (source \| canvas \| assistant) |
| Documents & Guidance | Tabs + cards; form-like header | `OrbStudioHero` + knowledge library shell |
| Templates | Recording library + cards | `OrbStudioHero`, premium card hierarchy |
| Saved Outputs | Empty state improved; sparse archive | Document archive header + `OrbStudioEmptyState` |
| Voice | Premium realtime studio | Unchanged (already studio-grade) |
| Shift Builder | Form stack | Handover studio grid (input \| preview) |
| Review | Textarea + button | Guided studio with sidebar preview |
| Inspection Readiness | Form stack | `OrbStudioPage` + composer card + sidebar |
| Safeguarding Thinking | Form stack | `OrbStudioPage` + composer card + sidebar |
| Record This Properly | Form stack | `OrbStudioPage` + composer card + sidebar |
| Billing modal | Functional | `orb-studio-modal-section` polish |
| Account modal | Functional | `orb-studio-modal-section` polish |
| Settings | Premium cards | `orb-studio-shell` marker |

## What is working (preserved)

- All `/orb` routes and `?station=` deep links
- `/orb/standalone/*` API paths (conversation, documents, shift-builder, outputs, billing)
- Dictate → ORB Write handoff (`loadOrbWriteHandoff`)
- Template → ORB Write handoff (`loadOrbWriteTemplateHandoff`)
- Governed edit route (`editOrbDictateDocument`) for ORB Write AI actions
- Chat, Voice, Dictate recording/transcript/generate flows
- Documents upload/paste/analyse
- Templates recording framework cards and actions
- Saved Outputs storage and filtering
- Billing, login, account, safety acceptance
- No child profile selector in standalone ORB

## Components / routes that must be preserved

- `data-orb-composer="main"` — chat composer
- `data-orb-dictate-studio-workspace` — dictate studio
- `data-orb-write-toolbar`, `data-orb-write-document-canvas` — word processor
- `data-orb-knowledge-library-tabs` — documents tabs
- `data-orb-recording-library-section` — templates recording framework
- `data-orb-saved-outputs-panel` — saved outputs
- `data-orb-generate-shift-plan` — shift builder
- `data-orb-review-run`, `data-orb-inspection-run`, etc. — practice panels

## What was refactored safely

- New `OrbStudio*` components under `frontend-next/components/orb/premium/` (build on OrbPremium, do not replace)
- ORB Write layout restructured to 3-column studio; logic unchanged
- Station panels wrapped with studio shells/hero headers
- CSS layer `orb-premium-studio-v3.css` for studio tokens and interaction states

## Out of scope (intentionally unchanged)

- Backend routes and intelligence core
- New AI brain or bypass of governance/redaction
- Child profile storage/selection
- Voice realtime architecture
- OS-embedded ORB at `/assistant/orb`
- E2E Playwright specs (contract tests added instead)

## Remaining limitations

- ORB Write rich text uses `contentEditable` + `document.execCommand` (not a full ProseMirror/TipTap stack)
- Table insert is basic HTML table only
- Studio layouts are desktop-first; mobile collapses columns vertically
- Some station shells still show modal title + inline studio hero (dual header by design)
