# Known technical debt

## Urgent

- Some optional routers may still fail at startup; router diagnostics must be reviewed after every deploy.
- Duplicate method/path registrations exist in the historic router surface and need endpoint-by-endpoint ownership review before removal.
- Daily notes, incidents and OS chronology need transport-level tests that exercise save, load, chronology projection and assistant retrieval together.
- Frontend list pages for daily logs and incidents still rely partly on demo selectors while detail/workspace flows use OS APIs.
- Inspection readiness and Ofsted readiness have multiple route names and UI sources that should be rationalised without breaking existing links.

## Important

- Services remain mostly flat under `services/`; moving them needs compatibility re-export modules and import tests.
- Assistant systems overlap across legacy assistant routes, `/assistant/query`, OS assistant bridge routes, Orb and standalone intelligence routes.
- Chronology has more than one backend projection (`/api/chronology`, `/os/chronology`, young person chronology routes), which can confuse clients.
- `routers/incident_routes.py` appears unmounted while young person incident routes are active.
- Some OS diagnostics expected endpoints look older than the current route structure and should be refreshed after a live route audit.
- Next.js standalone assistant now uses the backend isolated assistant endpoint, but voice mode remains a UI placeholder unless connected to the Orb voice/session flow.

## Later

- Add a generated route inventory artifact to CI.
- Add frontend route tests for buttons/forms that save operational records.
- Add backend integration tests for report evidence inclusion, stale document flags and Annex A readiness.
- Split service domains gradually into `services/ai`, `services/operational`, `services/compliance`, `services/safeguarding`, `services/retrieval`, `services/reporting`, `services/documents`, `services/chronology`, `services/inspection`, `services/staff` and `services/children`.
- Add a contributor guide and PR template.
- Expand deployment docs with Render-specific environment and migration steps after production settings are confirmed.

## Conservative decisions in this sprint

- Public route prefixes were preserved.
- Service files were not moved because assistant, chronology and OS command imports are broad and risky.
- Compatibility routers remain mounted and documented instead of removed.
- Demo fallback data remains where live APIs are unavailable, but chronology child/detail pages now prefer live OS chronology.
