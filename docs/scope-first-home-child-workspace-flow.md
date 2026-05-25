# Scope-first home / child workspace flow

## Old problem: global-first loading

After login, IndiCare OS previously routed users to the global command centre and rendered the full AppShell menu. That path pulled in governance command centre builders, workforce dashboards, global chronology/actions queries, and notification feed collectors before a home or child was selected. Under pool pressure this starved `/auth/me` and could sign users out.

## New flow

1. **Login** — credentials verified; session cookie issued.
2. **Select scope** — `/select-scope` (or restored last home/child from session/local storage).
3. **Home workspace** — `/homes/{home_id}/workspace` loads home-scoped links only.
4. **Child workspace** — `/young-people/{id}/workspace` locks child scope and loads child-scoped records.
5. **Global modules** — command centre, governance OS, workforce OS, global `/os/chronology` and `/os/actions` load only when the user navigates to those routes intentionally.

## Child-scoped recording model

- Record, daily note, incident, safeguarding, and ORB entry points use `child_id` / `young_person_id` query parameters.
- Menu badge counts call `GET /api/os/menu-summary?scope_type=child&child_id=…` (lightweight counts only).
- Standalone `/orb` is unchanged and receives no child payload from the OS shell.

## Home-scoped operating model

- Handover, recording alerts, staff on shift, daily brief, ISN, inspection readiness, and reports are linked from the home menu without building a global command centre on first paint.
- `GET /api/os/scope/options` returns permitted homes and children for the selected home only.

## Menu states

| Scope | Sidebar |
|-------|---------|
| `none` | Choose home, recent children, settings, logout |
| `home` | Home workspace, handover, alerts, safeguarding, shift, brief, notifications, inspection, reports, home ORB |
| `child` | Child overview, record, chronology, actions, documents, child ORB |

## Performance benefits

- No `/api/governance-os/command-centre` or `/api/workforce-os/dashboard` on AppShell mount.
- Menu summary cached 15s; scope options cached 20s; fail-fast when pool is busy.
- Notification bell and recording badges only mount when child scope is active.

## Safety / privacy benefits

- No global child list hydration before scope selection.
- Scoped session keys on the server (`os_scope_type`, `os_selected_home_id`, `os_selected_child_id`).
- 503 on data routes shows retry UI without clearing auth or selected scope.

## Remaining limitations

- Last-known scope from local storage may display until `/api/os/scope/current` confirms session state.
- Home operational bundle still performs a bounded fetch when opening home workspace (by design for that page only).
- Legacy global routes remain reachable by URL for permitted roles; they are no longer the default landing path.
