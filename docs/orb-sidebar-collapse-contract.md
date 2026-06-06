# ORB Sidebar Collapse Contract

## Behaviour

| State | UI |
|-------|-----|
| **expanded** | Logo, ORB Residential text, search, projects/recents (if enabled), full nav labels, account block |
| **collapsed** | Slim icon rail only — icons + accessible labels/tooltips; main workspace reclaims width immediately |

## Persistence

- Key: `orb-sidebar-collapsed` (`localStorage`)
- Read on residential mount; written on every toggle

## Data markers

| Marker | Element | Values |
|--------|---------|--------|
| `data-orb-sidebar-state` | Shell / aside | `expanded` \| `collapsed` |
| `data-orb-sidebar-collapse-toggle` | Collapse/expand button | — |
| `data-orb-sidebar-icon-rail` | Collapsed rail container | — |
| `data-orb-sidebar-collapsed` | Shell when collapsed | `true` |

## Collapsed rail stations

Chat, Dictate, Voice, ORB Write, Templates, Documents & Guidance, Saved Outputs, Settings, Account.

## CSS

Desktop grid: `.orb-chat-layout--residential .orb-chat-shell[data-orb-sidebar-collapsed='true']` → `--orb-sidebar-width-collapsed` (4.25rem).
