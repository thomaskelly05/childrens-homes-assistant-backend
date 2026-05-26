# Child-centred UI simplification map

## 1. Current problem

IndiCare OS accumulated many strong subsystems (recording catalogue, ORB, chronology, LifeEcho, Reg 44/45, plan impacts, handover, ISN). The UI surfaced too many form cards, duplicate ORB entry points, and flat navigation — making child and home workspaces feel like compliance dashboards rather than calm practice tools.

## 2. New child journey model

**HOME → CHILD → UNDERSTAND → RECORD → REVIEW → ARCHIVE → CHRONOLOGY → PLANS → LIFEECHO → OVERSIGHT**

Child workspace sections:

1. Child story header (identity, status, Record + Ask ORB on mobile)
2. Get to know me (what matters, communication, support)
3. Today's picture (recent records, actions, reviews due)
4. Recording (category + type selector — not 80 cards)
5. Story and life (chronology, archive, LifeEcho, voice, documents)
6. Plans and impact
7. Oversight (reviews, alerts, safeguarding)
8. More (all legacy routes preserved)

## 3. New home journey model

1. Home today — children, alerts, reviews, handover, daily brief
2. Safeguarding and oversight — ISN, alerts, actions, notifications
3. Workforce and shift
4. Inspection and quality — SCCIF, inspection readiness, Reg 44/45
5. More — archive lifecycle, reports, settings, ORB

## 4. Recording selector model

- Adult selects **category** (16 practice-facing groups in `recording-category-groups.ts`)
- Then **recording type** (from `RECORDING_FORM_REGISTRY` / workspace types)
- Short guidance from `recording-form-guidance.ts`
- **Start this record** → `/record?child_id={id}&type={workspaceType}`
- **Browse all recording types** → catalogue panel (registry-backed)

## 5. ORB presence rules

| Surface | ORB |
|---------|-----|
| Child workspace (desktop) | One right rail (`ChildWorkspaceOrbRail`) |
| Child workspace (mobile) | Hero "Ask ORB" only — no rail, no floating |
| Home workspace (desktop) | One right rail |
| Home workspace (mobile) | Bottom nav / More — no duplicate hero ORB |
| `/record` editor | `OrbLiveRecordingCoach` only |
| `/orb` | Standalone ChatGPT-style ORB |
| OS workspaces | `/assistant/orb` only — not `/orb` |

## 6. Child menu structure

**Primary:** Overview, Record, Chronology, Plans, Reviews, Alerts, ORB

**More:** Archive, LifeEcho, Plan impacts, Documents, Handover, Child voice, Care planning, Actions, Safeguarding, Daily note, Incident, Health, Education, Family time, Keywork

**Mobile bottom nav:** Overview, Record, Daily note, Reviews, More

## 7. Home menu structure

**Primary:** Home, Handover, Reviews, Alerts

**More:** Children, Daily brief, Safeguarding, Workforce, Inspection, Reg 44/45, Reports, ORB, Settings

**Mobile bottom nav:** Home, Handover, Reviews, Alerts, More

## 8. Reused files / components

- `recording-form-registry.ts`, `recording-form-catalogue-entries.ts`, `recording-form-metadata.ts`, `recording-form-guidance.ts`, `recording-form-sccif-alignment.ts`
- `child-workspace-normaliser.ts`, existing child cards (`child-today-card`, etc.)
- `scope-routes.ts`, `scope-navigation.ts`, `MobileSafeLink`, `NavigationRescue`
- `OperationalOrbRail`, `OrbLiveRecordingCoach`
- `RecordingCataloguePanel` (behind browse-all)

## 9. Hidden behind menus / dropdowns

- Full recording catalogue grid
- Legacy record hub card sections (`RECORD_CARD_SECTIONS`)
- Secondary child/home routes in "More" sidebar group
- Evidence/advanced workflow links in accordion + More card
- ORB prompt panels removed from record hub (live coach in editor only)

## 10. Remaining limitations

- Child workspace still uses multiple cards inside accordions (not a single scroll story page)
- Record hub legacy cards remain behind explicit toggle for backwards compatibility
- Professional network route uses existing journey/documents paths — no new backend
- Desktop sidebar still includes ORB link in addition to workspace rail on some routes
- Full E2E visual regression not automated in this pass
