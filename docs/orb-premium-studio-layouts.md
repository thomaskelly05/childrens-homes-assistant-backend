# ORB Premium Studio Layouts

## Overview

ORB Premium Studio Layouts v3 introduce reusable **studio workspace** components that sit on top of the existing OrbPremium design system. Each ORB product area should feel like a dedicated studio — not a form.

## Studio components

Located in `frontend-next/components/orb/premium/`:

| Component | Purpose |
|-----------|---------|
| `OrbStudioShell` | Root studio container with optional state (`loading`, `error`, `success`, `working`) |
| `OrbStudioPage` | Full station page: hero, trust strip, action rail, body, sidebar, primary action |
| `OrbStudioHeader` | Inline page header with title, subtitle, badge, actions |
| `OrbStudioHero` | Premium intro band with icon and gradient |
| `OrbStudioGrid` | Responsive card grid (1–4 columns) |
| `OrbStudioPanel` | Frosted glass panel with optional title |
| `OrbStudioSidebarPanel` | Left/right guidance or source panel |
| `OrbStudioActionRail` | Top action row with helper text |
| `OrbStudioPrimaryAction` | Gradient primary CTA |
| `OrbStudioEmptyState` | Illustration-style empty state with actions |
| `OrbStudioDocumentSurface` | A4 paper surface token |
| `OrbStudioComposerCard` | Large input area card |
| `OrbStudioMetricCard` | Small stat/metric chip card |
| `OrbStudioSourceCard` | Knowledge library / source list card |

## Design language

- Soft off-white / pale blue workspace background (inherits `--orb-v2-*` tokens)
- Subtle radial gradients and ORB glow on empty states
- Glass/frosted panels with `backdrop-blur`
- Rounded 2xl cards, soft shadows
- Gradient primary actions
- Progressive disclosure via `OrbPremiumAdvanced`
- No heavy grey form rows or full-width textarea-only layouts

## CSS

Import order in `app/orb/layout.tsx`:

1. `orb-premium-tokens.css`
2. `orb-premium-v2.css`
3. **`orb-premium-studio-v3.css`** (studio layouts + interaction states)

## Studio mapping

| Product area | Studio metaphor | Key components |
|--------------|-----------------|----------------|
| Dictate | Recording studio | `OrbStudioShell`, action rail |
| ORB Write | Document studio | 3-column: source, canvas, assistant |
| Documents & Guidance | Knowledge library | `OrbStudioHero`, source cards |
| Templates | Recording library | `OrbStudioHero`, `OrbStudioSourceCard` |
| Saved Outputs | Document archive | `OrbStudioHeader`, `OrbStudioEmptyState` |
| Shift Builder | Handover studio | `OrbStudioPage`, `OrbStudioGrid` |
| Practice panels | Guided workspaces | `OrbStudioPage`, `OrbStudioComposerCard`, sidebar |

## Interaction states

CSS classes on `OrbStudioShell` or children:

- `orb-studio-state-loading` — pulse animation
- `orb-studio-state-error` — red border/background tint
- `orb-studio-state-success` — green border/background tint
- `orb-studio-state-working` — reduced opacity, no pointer events

## Tests

- `frontend-next/components/orb/premium/orb-premium-studio-layouts.test.ts`
- `frontend-next/components/orb-standalone/orb-studio-surface-contract.test.ts`
