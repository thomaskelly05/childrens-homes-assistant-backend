# ORB Premium Visual System v2

Date: 2026-06-05

## Overview

v2 layers a calm, high-end SaaS visual treatment across ORB Residential without changing product logic, API routes, or intelligence governance.

## What changed

### App shell

- New CSS layer: `frontend-next/components/orb/premium/orb-premium-v2.css`
- `data-orb-visual-system="v2"` set on `<html>` at bootstrap (`lib/orb/orb-appearance.ts`)
- Refined sidebar: glass surface, softer active nav, account card at bottom
- Off-white / pale-blue workspace gradient

### Chat home

- CSS-only atmospheric glow behind ORB hero (`.orb-v2-atmosphere`)
- Premium frosted starter cards for the four residential prompts
- Composer glass dock and chip styling enhanced via v2 tokens

### Dictate

- Visual polish only: gradient record button, premium check chips, transcript empty state
- All `/orb/dictate/*` routes unchanged

### ORB Write word processor

- Full formatting toolbar: paragraph/heading dropdown, bold, italic, underline, lists, quote, divider, table, align left, clear formatting
- Zoom controls (75%–150%, fit width, 100%) — canvas only
- HTML sanitisation before save/sync (`lib/orb/write/orb-write-sanitize.ts`)
- Child-centred ORB guidance panel with governed edit actions (`lib/orb/write/orb-write-ai-actions.ts`)

### Documents, Templates, Saved Outputs, Practice

- Shared v2 card surfaces, search bars, primary gradient CTAs
- Document upload dropzone marked `data-orb-document-dropzone`

### Modals

- Account, billing, settings: rounded shell, improved footer padding

## Components reused

- `components/orb/premium/*` design system
- `orb-premium-tokens.css` base variables
- `GlassOrbMark`, `OrbPremiumPage`, `OrbPremiumToolbar`, `OrbStandalonePanelShell`

## Tokens (v2)

| Token | Purpose |
|-------|---------|
| `--orb-v2-bg-workspace` | Page background gradient |
| `--orb-v2-glass-surface` | Frosted panels |
| `--orb-v2-glass-elevated` | Cards, sidebar |
| `--orb-v2-primary-gradient` | Primary buttons |
| `--orb-v2-shadow-sm/md/lg` | Elevation |
| `--orb-v2-focus-ring` | Accessible focus |
| `--orb-v2-btn-height` | 2.5rem buttons |
| `--orb-v2-input-height` | 2.75rem inputs |

## Tests

- `orb-premium-visual-system-v2.test.ts`
- `orb-write-word-processor.test.ts`
- `orb-visual-regression-contract.test.ts`

## Known limitations

- Rich text uses native `contentEditable` / `execCommand` (no ProseMirror/Tiptap)
- Dark theme v2 polish is lighter than light theme (inherits v1 dark tokens)
- Zoom uses CSS `transform: scale()` on the page canvas — very small viewports may clip margins slightly
