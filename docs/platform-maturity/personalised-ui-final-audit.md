# Personalised UI final audit

Status: implementation audit slice  
Date: 2026-05-17

## Doctrine applied

- Chronology remains the operational truth plane; this work does not create a second timeline or generated operational truth.
- Provider and home scope remain backend-owned through existing account, OS context and young person routes.
- Critical safeguarding, child wellbeing and open action widgets are non-hideable.
- Empty states remain honest when account, child, staff or document data is not returned.

## Live surface audit summary

| Surface | Current data source | Schema-backed | Provider-scoped | Findings |
| --- | --- | --- | --- | --- |
| `/dashboard` | `/api/os/context`, `/os/chronology`, `/api/safeguarding`, `/os/actions`, `/os/documents`, `/os/evidence`, `/account/me` | Yes where backend returns data | Yes | Now shows signed-in adult identity and stored dashboard preferences. |
| `/staff/me` | `/account/me`, `/api/os/context`, command centre aggregations | Yes | Yes | Removed hard-coded `staff-abi`; workspace derives from signed-in account and live OS records. |
| `/staff/me/recording` | `/account/me`, `/api/os/context`, command centre aggregations | Yes | Yes | Removed hard-coded demo staff id and keeps rapid recording separate from fake queues. |
| `/young-people/[id]` | `/os/young-people/{id}`, `/young-people/{id}`, workspace/doc/evidence APIs | Yes | Yes | Person-first overview now uses profile image, identity, communication, sensory and child voice fields where present. |
| Child plan/document/risk shells | `getYoungPersonOverview` | Yes | Yes | Replaced demo selector dependency so real IDs no longer fail because they are missing from demo data. |
| `/assistant/profile` | `/account/me` via provider settings | Yes | Yes | Removed static assistant profile assumptions. |

## Removed or rewired fake/demo surfaces

- Rewired `/staff/me` and `/staff/me/recording` away from the hard-coded `staff-abi` demo staff id.
- Rewired child plan/document/risk routes away from `getYoungPersonSummary` and `indicareData`.
- Replaced static assistant profile cards with live account and assistant preference fields.
- Kept remaining demo-backed modules documented for later migration: `shift-data.ts`, risk intelligence builders, report dropdown demo data and mock record answerer.

## Adult identity and dashboard preferences

- Extended `user_profile_preferences` with optional role title, operational focus, widget order, pinned widgets, hidden optional widgets, favourite children, favourite templates, quick actions and recent activity.
- Added `/account/dashboard-preferences` plus `/api/profile/dashboard-preferences` compatibility routes.
- Added `/api/profile/avatar` replacement/removal routes using image data URLs without exposing raw upload paths.
- Dashboard personalisation uses accessible buttons for pin, hide optional, move up/down, reset and save.

## Child identity and avatar support

- Existing young person profile sections already support communication style, sensory profile, what helps, what to avoid, routines, interests, strengths and what matters to me.
- Added `/api/young-people/{id}/avatar` replacement/removal routes using existing `photo_url` storage, provider/home access checks and edit-role checks.
- Child overview prioritises photo, preferred name, what matters, what helps, communication style and sensory support before operational tables.

## Workflow proof status

- Chronology, safeguarding, documents, evidence and actions remain read from live OS adapters.
- This slice does not add new chronology projections; it avoids creating disconnected chronology or AI-generated summaries.
- Full browser proof still requires local database seed/login and workflow-specific setup.

## Remaining risks

- Risk intelligence routes still rely on demo-backed selector data and need migration to chronology/evidence projections.
- `shift-data.ts` remains demo-backed for legacy shift/handover helpers not touched by this slice.
- Profile images currently use safe data URL storage rather than provider object storage; storage abstraction can replace this without changing the route contract.
- Assignment/favourite child semantics need backend allocation data before they can fully distinguish "my children" from "visible children".

## Safe demo flows

- Login, open `/dashboard`, save/reset dashboard preferences, and verify critical widgets cannot be hidden.
- Open `/staff/me` and confirm the page reflects the signed-in account instead of demo staff.
- Open a real `/young-people/{id}` record and verify person-first identity fields appear when returned, with honest gaps otherwise.
- Open `/assistant/profile` and verify account-backed assistant preferences.
