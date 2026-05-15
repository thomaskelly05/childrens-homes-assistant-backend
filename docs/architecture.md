# IndiCare OS architecture

IndiCare OS is a monolithic FastAPI platform with two frontend surfaces:

- `frontend/` legacy HTML, JavaScript and CSS served by FastAPI.
- `frontend-next/` modern Next.js shell that proxies authenticated API calls to FastAPI.

The backend remains one deployable application. Domain grouping is now expressed through router registries rather than URL rewrites or microservices, so existing public paths are preserved.

## Runtime shape

1. `app.py` calls `core.app_factory.create_app()`.
2. `core.app_factory` adds middleware, loads routers, mounts static assets, registers health routes and registers legacy frontend routes.
3. `core.router_loader` loads grouped domain registries and records startup diagnostics.
4. Domain services and repositories perform DB access, evidence retrieval, chronology projection and assistant context construction.

## Router domains

Router groups are defined in `core/router_loader.py`:

- `auth`: auth, MFA, sessions, health and security routers.
- `operational`: shell compatibility, homes, staff, notifications and shifts.
- `provider`: account, admin, billing and provider administration.
- `assistant`: standalone assistant, embedded OS assistant, Orb, AI notes and intelligence routes.
- `children`: child workspace context, child documents, operational memory and health.
- `inspection`: inspection readiness, OS shell APIs, live alerts and OS modules.
- `assistant-compatibility`: partner and chat compatibility routes.
- `documents`: document library, document engine and document helper endpoints.
- `reporting`: handovers, monthly reviews, Ofsted packs and reports.
- `safeguarding`: risk, actions, visibility, supervision and document governance.
- `chronology`: young person records, daily notes, incidents and child chronology routes.
- `compliance`: workflow review, command centre, evidence, QA, exports, rostering and academy.
- `staff`: staff profiles, staff today and workspace review routes.
- `operational-backend`: OS live data, command routers, Connect, Reg 44 ingestion and compatibility adapters.

Required routers are limited to critical auth, session, security, health and frontend compatibility routes. Optional/legacy routers still log import failures and surface them through diagnostics.

## Compatibility routes

Compatibility routes remain mounted where modules expose them, including `compat_router` and `ui_router` attributes. This preserves existing clients while making compatibility surfaces visible in startup diagnostics.

Known compatibility areas:

- Chat and assistant compatibility routes.
- Home inspection compatibility routes.
- OS enterprise and runtime compatibility routers.
- Legacy FastAPI-served assistant HTML routes.

## Services

Services remain in `services/` for this hardening pass to avoid risky import churn. The effective domains are:

- AI: assistant response, retrieval, context, prompt policy, standalone assistant, Orb services.
- Operational: OS chronology, workspace, actions, operational memory and health services.
- Compliance and safeguarding: inspection, risk, evidence and visibility services.
- Documents and reports: document extraction/security, document intelligence and report services.
- Children and staff: young person, daily notes, incidents, child documents and staff workflow services.

Future moves should use compatibility re-export modules and focused import tests before relocating files.

## External-review notes

- Public API paths were not intentionally changed by the router grouping.
- Startup now records failed routers and duplicate method/path registrations.
- Assistant boundaries are enforced server-side, not only by frontend UI state.
- Operational retrieval flows through scoped repositories and chronology/evidence/report/document services.
