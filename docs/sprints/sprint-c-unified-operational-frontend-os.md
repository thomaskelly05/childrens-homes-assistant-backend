# Sprint C - Unified Operational Frontend OS

## Frontend architecture audit

- Strategic frontend: `frontend-next/` Next.js app with `AppShell`, authenticated providers, OS API adapters and ORB runtime.
- Compatibility frontend: `frontend/` legacy FastAPI-served HTML/JS remains available for old URLs only.
- Duplicate shells found: Next `AppShell`, standalone assistant shells, record workspace shells, unused sidebar/header components, and many legacy HTML shell families.
- Duplicate navigation found: local `AppShell` nav, `MobileNav` nav, child secondary pills, standalone assistant nav, legacy Care Hub nav and per-page legacy sidebars.
- Duplicate dashboards found: governance command centre, workforce command centre, staff dashboard, shift/handover command data, management review queues, Ofsted readiness, safeguarding dashboard and legacy OS command centre.
- Fragmented ORB entry points found: `/assistant`, `/assistant/orb`, `/assistant/voice`, `/voice`, floating ORB button, ORB settings and legacy AI Suite assistant surfaces.
- Chronology fragmentation found: `ChronologyFoundation`, `RecordTimeline`, `FullScreenWorkspace`, unused canonical chronology primitives and legacy chronology views.
- State fragmentation found: auth context, active child context, standalone assistant local state, ORB component state, legacy localStorage state and an underused operational event bus.

## Consolidation decisions

- Next.js is the primary operational OS. Legacy surfaces remain compatibility-only until explicit migration/decommission work removes FastAPI routes.
- `/command-centre` is the unified leadership dashboard. `/`, `/home`, `/dashboard` and `/workspace` now route into it instead of creating another child dashboard entry.
- Domain navigation is centralized in `lib/navigation/operational-navigation.ts` with these domains: Command Centre, Children, Workforce, Governance, Inspection, Documents, Reports, ORB and Admin.
- Role-aware UX is centralized around RM, RI, staff, provider and admin operational scopes, mapped from auth roles and permissions.
- ORB is embedded into the operational shell through shared route, role, child, workforce, governance, risk, chronology, action and evidence context.
- Operational state is centralized in `OperationalContextProvider`; frontend components consume context but do not calculate care intelligence.
- Chronology UX remains visual, linked and contextual through shared timeline primitives and route-level chronology pages.
- Accessibility remains device-persisted and now explicitly includes sensory-safe mode, font scaling and voice accessibility labels.

## Feature flags

- `NEXT_PUBLIC_UNIFIED_OPERATIONAL_SHELL`
- `NEXT_PUBLIC_UNIFIED_COMMAND_CENTRE`
- `NEXT_PUBLIC_CONTEXTUAL_ORB_PANEL`
- `NEXT_PUBLIC_UNIFIED_OPERATIONAL_SEARCH`

Each flag defaults on unless set to `0`.

## Hidden unfinished areas

- Legacy HTML navigation and dashboards are not deleted in Sprint C; they are compatibility-only but still present.
- `/assistant/orb` still duplicates `/assistant` and should be collapsed in a later assistant route cleanup.
- Backend endpoints still provide separate governance/workforce/platform command-centre payloads; the frontend unifies presentation without moving intelligence calculations client-side.
- Some dead Next.js components remain unused and should be removed after telemetry or route audit confirms no private imports.
- The operational event bus remains under-adopted and should be connected to live refresh/invalidation work in a later platform pass.
