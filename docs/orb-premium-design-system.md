# ORB Premium Design System

Calm, spacious, glassy ORB Residential UI — soft blue primary actions, white/glass panels, subtle borders, `rounded-xl` / `rounded-2xl` cards, progressive disclosure for advanced options.

## Principles

1. **One screen hierarchy** — header (shell) → optional trust strip → main panel → primary CTA → secondary actions → advanced (collapsed).
2. **Reuse components** — do not copy gradient button classes into new panels.
3. **Consistent labels** — use `ORB_PREMIUM_ACTION_LABELS` from `frontend-next/components/orb/premium/orb-premium-theme.ts`.
4. **No feature rewrites** — premium pass is presentation-only unless explicitly scoped.

## Components (`frontend-next/components/orb/premium/`)

| Component | Purpose |
|-----------|---------|
| `OrbPremiumPage` | Standard inner layout for station panels |
| `OrbPremiumHeader` | Inline title/subtitle when not using shell header |
| `OrbPremiumCard` | Glass card container |
| `OrbPremiumPanel` | Scrollable working area |
| `OrbPremiumTabs` | Segmented tab control |
| `OrbPremiumToolbar` | Search + filter row |
| `OrbPremiumPill` | Category / chip filters |
| `OrbPremiumButton` | primary / secondary / ghost / destructive |
| `OrbPremiumInput` / `OrbPremiumTextarea` | Form controls |
| `OrbPremiumEmptyState` | Shared empty pattern |
| `OrbPremiumTrustStrip` | Safety / boundary copy |
| `OrbPremiumActionBar` | Horizontal action row |
| `OrbPremiumSection` | Titled block; optional collapsible |
| `OrbPremiumAdvanced` | Collapsed advanced options |
| `OrbPremiumDocumentCard` | Knowledge / document library cards |

Import from `@/components/orb/premium`.

## Page structure

```tsx
<OrbStandalonePanelShell title="…" subtitle="…" …>
  <OrbPremiumPage
    panelId="example"
    trustStrip={<>…</>}
    toolbar={<OrbPremiumToolbar … />}
    tabs={<OrbPremiumTabs … />}
    primaryAction={<OrbPremiumButton>…</OrbPremiumButton>}
    advanced={<>…</>}
  >
    {/* main content */}
  </OrbPremiumPage>
</OrbStandalonePanelShell>
```

Practice-style flows may use `OrbPremiumWorkspaceLayout` inside the shell (same advanced collapse semantics).

## Button variants

- **Primary** — blue gradient, main CTA (`Analyse with ORB`, `Generate draft`, etc.).
- **Secondary** — white/glass + border.
- **Ghost** — low emphasis links/actions.
- **Destructive** — rare delete/remove actions.

## Empty states

Use `OrbPremiumEmptyState` with title, body, optional icon, and `OrbPremiumActionBar` for CTAs (e.g. Saved Outputs → ORB Write / Dictate).

## Advanced options

- Default: **closed** (`<details>` via `OrbPremiumAdvanced` or `OrbPremiumWorkspaceLayout` `advanced` slot).
- Place at footer of panel, not in main hierarchy.

## Tests

- `components/orb/premium/orb-premium-design-system.test.ts`
- `components/orb-standalone/orb-theme-consistency.test.ts`

Run: `cd frontend-next && npm run test:orb` (includes new files once listed in `package.json`).
