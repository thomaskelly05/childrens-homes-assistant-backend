# ORB Premium Visual System v2 — Audit (Phase 1)

Date: 2026-06-05  
Scope: ORB Residential standalone surfaces in `frontend-next/`

## Executive summary

ORB Residential is functionally complete across Chat, Dictate, ORB Write, Templates, Documents & Guidance, Saved Outputs, Voice, Shift Builder, and Practice panels. A prior premium pass (`orb-premium-tokens.css`, `components/orb/premium/*`) established glass surfaces, residential sidebar structure, and shared station components.

**v2 goal:** elevate visual consistency to a high-end SaaS feel and evolve ORB Write into a document studio — without rewiring routes, intelligence, or product logic.

## Shell / sidebar / header

| Component | Path | Status |
|-----------|------|--------|
| Canonical shell | `components/orb/orb-shell.tsx` | **Preserve** — route entry only |
| Layout chrome | `components/orb/orb-layout.tsx` | **Visual refactor** — spacing, header polish |
| Workspace orchestrator | `components/orb-standalone/orb-care-companion.tsx` | **Preserve logic** — empty state/composer wiring |
| Residential sidebar | `components/orb-residential/orb-residential-sidebar.tsx` | **Visual refactor** — nav states, account card |
| Theme tokens | `app/orb/orb-premium-tokens.css` | **Extend** via `orb-premium-v2.css` |
| v2 tokens | `components/orb/premium/orb-premium-v2.css` | **New** — gradients, glass, motion |

**Nav items (must preserve):** Chat, Dictate, ORB Write, Shift Builder, Voice, Documents & Guidance, Saved Outputs, Review, Ofsted Lens, Safeguarding Thinking, Record This Properly, Templates, Knowledge Library.

**Panel IDs (must preserve):** `orb_dictate`, `orb_write`, `shift_builder`, `orb_voice`, `documents`, `saved`, `templates`, `knowledge`, `review`, `inspection_readiness`, `safeguarding_thinking`, `record_properly`, `settings`, `billing`, `account`.

## Chat home

| Area | Path | v2 action |
|------|------|-----------|
| Empty state hero | `orb-care-companion.tsx` | **Visual** — atmospheric glow, starter card polish |
| Starters copy | `lib/orb/orb-residential-copy.ts` | **Preserve** — already matches concept |
| Composer | `orb-standalone-composer.tsx` | **Visual** — glass dock, chip styling |
| Send/stream | `orb-care-companion.tsx` | **Do not change** |

## Dictate

| Area | Path | v2 action |
|------|------|-----------|
| Studio workspace | `components/orb/dictate/OrbDictateStudioWorkspace.tsx` | **Visual only** |
| Top bar / record | `OrbDictateTopBar.tsx` | **Visual** — gradient record button |
| Transcript | `OrbTranscriptPanel.tsx` | **Visual** — empty state |
| Analysis | `OrbDictateBrainPanel.tsx` | **Visual** — premium chips |
| APIs | `/orb/dictate/analyze`, `generate`, `finalise` | **Do not change** |
| Write handoff | `lib/orb/write/orb-write-handoff.ts` | **Do not change** |

## ORB Write

| Area | Path | v2 action |
|------|------|-----------|
| Standalone panel | `orb-write-standalone-panel.tsx` | **Preserve** workflow |
| Editor | `orb-write-editor.tsx` | **Upgrade** — print canvas, zoom, sanitise |
| Toolbar | `orb-write-toolbar.tsx` | **Upgrade** — full word-processor controls |
| AI panel | `orb-write-ai-panel.tsx` | **Upgrade** — child-centred suggestions |
| Export | `lib/orb/write/orb-write-export.ts` | **Preserve** PDF/print |
| Governed edit | `editOrbDictateDocument` | **Preserve** route |

No rich-text library exists (no Tiptap/Quill). Custom `contentEditable` + `execCommand` is the correct approach.

## Documents & Guidance

| Area | Path | v2 action |
|------|------|-----------|
| Primary panel | `orb-document-panel.tsx` | **Visual** — header, tabs, dropzone |
| Official/home sections | `knowledge-library/*` | **Visual** — card polish |
| Analyse behaviour | `standalone-client` document APIs | **Do not change** |

## Templates

| Area | Path | v2 action |
|------|------|-----------|
| Panel | `orb-templates-panel.tsx` | **Visual** — search, pills, cards |
| Recording cards | `OrbRecordingLibraryCards.tsx` | **Preserve** actions |
| Handoffs | template → Write/Dictate/Documents | **Do not change** |

## Saved Outputs

| Area | Path | v2 action |
|------|------|-----------|
| Panel | `orb-saved-outputs-panel.tsx` | **Visual** — toolbar, empty state |
| Storage/filters | `standalone-client`, local store | **Do not change** |

## Shift Builder & Practice

| Area | Path | v2 action |
|------|------|-----------|
| Shift Builder | `shift-builder/orb-shift-builder-panel.tsx` | **Visual** |
| Practice panels | `orb-practice-panels.tsx`, `orb-review-panel.tsx` | **Visual** — trust strips, CTAs |

## Account / billing / settings

| Modal | Path | v2 action |
|-------|------|-----------|
| Account | `orb-account-modal.tsx` | **Polish** — modal shell |
| Billing | `orb-billing-modal.tsx` | **Polish** — scroll, CTAs |
| Settings | `orb-standalone-settings-panel.tsx` | **Polish** |
| Safety | `orb-safety-modal.tsx` | **Preserve** acceptance logic |

## Shared premium components (reuse)

- `OrbPremiumButton`, `OrbPremiumCard`, `OrbPremiumPage`, `OrbPremiumTabs`
- `OrbPremiumToolbar`, `OrbPremiumTrustStrip`, `OrbPremiumEmptyState`
- `OrbPremiumWorkspaceLayout`, `OrbStandalonePanelShell`, `OrbAppModal`
- `GlassOrbMark`, `orb-premium-tokens.css` variables

## CSS / token files

| File | Role |
|------|------|
| `app/orb/orb-premium-tokens.css` | Base premium layer |
| `components/orb/premium/orb-premium-v2.css` | **v2** gradients, glass, sidebar, panels |
| `app/orb/orb-desktop.css` | Layout |
| `app/orb/orb-dictate-studio-polish.css` | Dictate polish |
| `components/orb/premium/orb-premium-theme.ts` | Action labels |

## Icons

Lucide React throughout: `MessageSquare`, `PenLine`, `FileEdit`, `Mic`, `FolderOpen`, `Save`, `Shield`, `ClipboardList`, etc.

## Visual duplication / dated areas (addressed in v2)

- Mixed inline gradient buttons vs `OrbPremiumButton`
- Dictate analysis bullets vs premium chips
- ORB Write AI header said "IndiCare Brain" — replaced with child-centred copy
- Practice panels still feel form-heavy — v2 spacing and card surfaces
- Starter cards lacked atmospheric hero treatment

## Routes / APIs that must not change

| Route / call | Purpose |
|--------------|---------|
| `POST /orb/dictate/analyze` | Dictate analysis |
| `POST /orb/dictate/generate` | Dictate generate |
| `POST /orb/dictate/finalise` | Dictate finalise |
| `POST /orb/dictate/edit` | Governed document edit (Write AI) |
| Document upload/analyse | Documents panel |
| Template fetch/generate | Templates |
| Saved outputs CRUD | Saved Outputs |
| Stripe billing | Billing modal |
| Chat stream endpoints | Chat home |

## Tests (existing + v2)

- 57+ `*orb*.test.*` files in `frontend-next/components/`
- v2 adds: `orb-premium-visual-system-v2.test.ts`, `orb-write-word-processor.test.ts`, `orb-visual-regression-contract.test.ts`

## What must remain unchanged

- IndiCare Intelligence Core wiring
- No child profile storage/selector in standalone ORB
- No internal brain metadata in UI
- No new AI brain
- Privacy/session-only Dictate transcript rules
- MFA, billing gating, safety acceptance
