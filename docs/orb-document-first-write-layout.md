# ORB Write Document-First Layout

## Intent

ORB Write should feel like a calm document editor: **document canvas is the visual priority**; source and guidance panels collapse cleanly.

## Defaults

- Source panel: **closed** on desktop open
- Guidance panel: **closed** on desktop open
- Viewports ≤820px height: both panels closed (`data-orb-write-compact-height="true"`)

## Data markers

| Marker | When |
|--------|------|
| `data-orb-write-document-first` | Both side panels closed |
| `data-orb-write-source-collapsed` | Source panel closed |
| `data-orb-write-guidance-collapsed` | Guidance panel closed |
| `data-orb-write-layout` | Grid root |
| `data-orb-write-document-canvas` | Editor canvas |

## Preserved

Formatting toolbar, save, export, approve, template picker, analyse/generate, all handoffs.

## CSS

`.orb-write-studio-grid` — single-column when panels closed; side columns when toggled open. Slimmer `[data-orb-write-studio-header]` on residential.
