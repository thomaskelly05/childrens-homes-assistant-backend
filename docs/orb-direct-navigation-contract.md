# ORB Direct Navigation Contract

## Main nav (`/orb`)

| Sidebar item | `activePanel` / behaviour |
|--------------|---------------------------|
| Chat | `null` — closes workspace, shows thread |
| Dictate | `orb_dictate` |
| Voice | `orb_voice` |
| ORB Write | `orb_write` |

## Library nav

| Item | Panel |
|------|-------|
| Templates | `templates` |
| Documents & Guidance | `documents` |
| Saved Outputs | `saved_outputs` |

## Account nav

| Item | Presentation |
|------|----------------|
| Profile | Drawer modal (`account`) |
| Settings | Drawer modal (`settings`) |
| Billing | Centred modal (`billing`) |

## Deep links

- `?station=dictate` → `orb_dictate`
- `?station=write` → `orb_write`
- `?station=templates` → `templates`
- `?station=saved` → `saved_outputs`
- Deprecated stations → convergence redirect card then routed destination

## Rules

1. Primary destinations mount immediately in the main workspace area.
2. Back arrow on workspace panels returns to Chat only — not required to *reach* the destination.
3. Settings/Profile/Billing never use workspace swap presentation.
4. Mobile drawer closes on nav selection.

## Route preservation

All `/orb/*` page redirects and API routes remain intact. No new intelligence endpoints added.
