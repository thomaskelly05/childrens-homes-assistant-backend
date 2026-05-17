# Live Connection Gap Audit

Date: 2026-05-17
Purpose: identify remaining areas that may still be disconnected, static, demo-gated, or not yet aligned to real schema-backed experience bundles.

---

# Executive summary

IndiCare OS has made major progress toward real schema-backed operation, but the frontend is not yet 100% converged.

The remaining risk is no longer broad backend absence. The remaining risk is:

- static/demo data still available through legacy adapter paths;
- some components still hardcode operational content;
- experience bundle endpoints are still architectural targets rather than implemented production routes;
- some report/generator surfaces create preview content from local selectors rather than live schema-backed records;
- some legacy frontend surfaces remain outside the new `frontend-next` operational experience direction.

This audit should be used as the immediate fix list before claiming the new UI is fully connected.

---

# Confirmed remaining connection risks

## 1. `frontend-next/lib/indicare/demo-data.ts` still contains full static operational data

The file now safely gates static data behind:

`NEXT_PUBLIC_DEMO_DATA_MODE === '1' && NODE_ENV !== 'production'`

and otherwise exports empty data.

That is safer than before, but it still contains static children, staff, placements, daily logs, incidents, safeguarding events, risk assessments, medication records, keywork sessions, appointments, documents, reports, notifications and audit records.

### Risk

Even if production is empty-safe, imports from this file can still create split-brain architecture and may hide missing live wiring during development.

### Action

Migrate all imports away from `indicareData` for live product routes.

Allowed use:

- isolated tests;
- explicitly gated E2E/demo mode;
- storybook/design fixtures if clearly separated.

---

## 2. Selectors/adapters still import `demo-data.ts`

Search found imports or references from:

- `frontend-next/lib/indicare/search.ts`
- `frontend-next/lib/evidence/selectors.ts`
- `frontend-next/lib/chronology/adapters.ts`
- `frontend-next/lib/chronology/selectors.ts`
- `frontend-next/lib/assistant-workspace/adapters.ts`
- `frontend-next/lib/documents/selectors.ts`
- `frontend-next/lib/indicare/reports.ts`
- `frontend-next/lib/indicare/risk-intelligence.ts`
- `frontend-next/lib/indicare/selectors.ts`
- `frontend-next/lib/indicare/assistant-adapter.ts`

### Risk

These libraries can still return empty or demo-derived operational values instead of live schema-backed data. They also encourage frontend-side operational synthesis instead of the new experience bundle pattern.

### Action

Replace these imports with API-backed calls or experience-bundle derived data.

Priority order:

1. Search
2. Chronology
3. Documents/evidence
4. Reports
5. Assistant workspace
6. Risk intelligence

---

## 3. Experience bundle endpoints are not yet found in live code search

The architecture now calls for:

- `GET /api/me/workspace`
- `GET /api/young-people/{id}/profile-bundle`
- `GET /api/homes/{id}/operational-bundle`

Search did not find these implemented routes yet.

### Risk

The Apple-esque UI cannot fully converge while pages continue to fetch fragmented data or render disconnected cards.

### Action

Implement experience bundle routes and migrate the core UI pages onto them:

- dashboard;
- adult profile;
- staff workspace;
- child profile;
- home overview;
- welcome/handover;
- Connect preview;
- notifications.

---

## 4. `NotificationCentre` still contains hardcoded cards

`frontend-next/components/notification-centre.tsx` hardcodes:

- New chronology review;
- Missing evidence;
- Assistant insight.

### Risk

This violates the no-fake-notifications rule and could imply live operational notifications exist when they do not.

### Action

Replace `NotificationCentre` with schema-backed notification data from `/api/notifications` or the future `/api/me/workspace` bundle.

If no notifications exist, show an honest empty state.

---

## 5. Reporting foundation is still preview-generator based

`frontend-next/components/indicare/reporting-foundation.tsx` generates report previews through local frontend generators/selectors.

It now avoids static child options, which is good, but the main preview still depends on frontend generation and selector-derived evidence/citations.

### Risk

Reporting can appear more connected than it is. Reg 44/45/Annex A style reporting must eventually use real inspection, chronology, evidence, document and action tables.

### Action

Promote reporting to backend-backed report bundles.

Recommended endpoints:

- `GET /api/reports/context`
- `POST /api/reports/preview`
- `POST /api/reports/save-draft`
- `POST /api/reports/{id}/review`
- `POST /api/reports/{id}/sign-off`

---

## 6. Legacy frontend workspace files still exist

Search still shows legacy files under:

- `frontend/js/indicare-workspace/*`

including child understanding, workforce handover and OS adapters.

### Risk

Legacy workspace files may still contain old assumptions, TODOs, or disconnected state if they remain routable or bundled.

### Action

Confirm whether legacy frontend is still served.

If not served:

- mark as deprecated;
- move to archive;
- remove from navigation/build path.

If served:

- migrate to `frontend-next` or wire to live APIs.

---

# Notable improvements confirmed

## Login route no longer displays demo credentials

`frontend-next/app/login/page.tsx` now uses empty email/password fields and states that demo credentials are not shown on live routes.

## `demo-data.ts` is production-safe gated

Static data is only exported when `NEXT_PUBLIC_DEMO_DATA_MODE=1` and not production.

## Connect foundations exist

Search confirms real Connect work exists through:

- `repositories/connect_repository.py`
- `backend/db/migrations/20260517_identity_connect.sql`
- identity/connect audit docs.

This indicates Connect is no longer only a UI idea.

---

# Immediate connection fix list

## Must fix before claiming 100% connected

1. Implement `/api/me/workspace`.
2. Implement `/api/young-people/{id}/profile-bundle`.
3. Implement `/api/homes/{id}/operational-bundle`.
4. Replace hardcoded `NotificationCentre` cards.
5. Remove live-route dependence on `frontend-next/lib/indicare/demo-data.ts` selectors.
6. Migrate search, chronology, evidence, documents and reports away from frontend demo selectors.
7. Verify legacy `frontend/js/indicare-workspace` is not served in the live product or archive it.
8. Promote reporting foundation to backend-backed report context/preview/save/review flows.

---

# Current honest status

## Fully strong

- Backend operational architecture;
- schema richness;
- chronology/replay direction;
- safeguarding/missing foundations;
- Connect foundations;
- profile/preferences foundations;
- design/product doctrine.

## Still incomplete

- experience bundle implementation;
- full live frontend convergence;
- removal of all demo selector dependencies;
- Apple-style modular surface implementation;
- backend-backed reporting lifecycle;
- full browser proof of all linked workflows.

---

# Next build recommendation

The next implementation should be:

## Experience Bundle Implementation + Static Selector Removal

Do this before further visual polish.

Reason:

The UI cannot become truly Apple-like or fully connected until the data layer is aggregated cleanly into experience bundles.

A beautiful UI on top of fragmented selectors would still feel disconnected.

---

# Success criteria

The product can only be called 100% connected when:

- no live route depends on static demo operational data;
- profile/dashboard/child/home pages use bundle endpoints;
- notifications are schema-backed;
- reporting preview is backend-backed;
- legacy workspace files are retired or migrated;
- browser proof confirms save/reopen/search/chronology for core workflows;
- no console errors appear on the live walkthrough.
