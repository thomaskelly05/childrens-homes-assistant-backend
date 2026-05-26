# Unified operational ORB experience

## One ORB rule

**One ORB presence per operational page** — a single right-hand rail, or (only on `/record` and child recording routes) the ORB live recording coach. No combination of floating bubble + shell rail + inline “Ask ORB” card on the same page.

- Operational OS links use **`/assistant/orb` only** (scope, mode, IDs — never draft bodies or narratives in URLs).
- **Standalone `/orb`** remains a separate product surface and is not embedded in the operational shell.

## Component map

| Component | Role | Where used |
|-----------|------|------------|
| `OperationalOrbRail` | Shared right rail (“ORB on shift”) | Child/home workspace pages, app-shell contextual panel |
| `OrbLiveRecordingCoach` | Live recording coach (only ORB on record editor) | `RecordingWorkspace` |
| `ContextualOrbPanel` | Shell wrapper; renders rail when `shouldShowShellContextualOrbPanel` | App shell 2xl aside |
| `OrbButton` | Floating voice launcher | Pages **without** an ORB rail |
| `ScopeOrbLauncher` | Legacy compact card (deprecated for workspace rails) | Quick links / compact CTAs only |
| `OrbCompanionPanel` | Superseded by `OperationalOrbRail` | Retained for reference; shell uses rail |
| `OrbCareCompanion` | Standalone ORB | `/orb` only |

## Standalone vs operational boundary

| Surface | Route | Notes |
|---------|-------|--------|
| Operational ORB | `/assistant/orb` | Scope-first (`scope`, `young_person_id`, `home_id`, `mode`) |
| Standalone ORB | `/orb` | No OS record context; local/standalone APIs |
| Floating `OrbButton` | Global shell | Hidden when any operational rail is active |

## Page decisions

| Page | Rail | Floating ORB | Inline ORB card |
|------|------|--------------|-----------------|
| Child workspace | Page `OperationalOrbRail` | Hidden | Hidden |
| Home workspace | Page `OperationalOrbRail` | Hidden | Hidden |
| Record editor (`/record`) | Live coach only | Hidden | Hidden |
| Archive, chronology, LifeEcho, plan impacts | Shell rail | Hidden | Hidden |
| Handover, inspection, Reg45, SCCIF | Shell rail | Hidden | Hidden (inline support components return null) |
| Review/alerts (`/record/reviews`, `/record/alerts`) | Shell rail | Hidden | Hidden |
| Generic operational pages | None | Shown (opens voice ORB) | Allowed |

Rules live in `frontend-next/lib/orb/orb-presence-rules.ts`.

## Remaining limitations

- On viewports below `2xl`, the shell contextual rail is hidden by layout; child/home workspace rails remain in the page grid column.
- Floating `OrbButton` still opens the legacy voice runtime rather than sliding open the HTML rail (future: deep-link to `/assistant/orb` or docked panel).
- Care Hub (`/command-centre`) uses inline `OrbInlineHint` strips by design — not converted to the dark rail in this pass.
