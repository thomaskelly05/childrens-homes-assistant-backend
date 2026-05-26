# React hydration global button failure audit

## Console error observed

- **React minified error #418** — hydration failed because server-rendered HTML did not match the client.
- Symptom: pages render visually but buttons, links, top bar controls, shortcuts, and ORB send do not attach event handlers reliably (desktop and mobile).

## Affected pages

- Child workspace: `/young-people/[id]/workspace`
- Home workspace: `/homes/[id]/workspace`
- Scoped OS routes with query-based child context (`/actions?young_person_id=…`, etc.)
- Standalone ORB: `/orb`
- Operational ORB: `/assistant/orb`
- Any route using `AppShell` (operational top bar, mobile menu, bottom nav)

## Suspected mismatch causes

| Area | Risk | Mechanism |
|------|------|-----------|
| App shell top bar date | High | `new Date()` + `Intl.DateTimeFormat` during render → different text server vs client (timezone/locale). |
| Workspace hydration gate | High | `window.location.search` during render → different `requiresWorkspaceHydration` / loading shell vs main shell. |
| Active child `readyState` | High | Same search-param branching in `useMemo` during SSR. |
| Standalone ORB workspace | High | `readStandaloneWorkspace()` in `useState` initializer → server default vs client `localStorage`. |
| Standalone ORB a11y / query | Medium | `loadStandaloneOrbAccessibility()` and `useSearchParams()` on first paint. |
| Standalone ORB `conversationId` | Medium | `Date.now()` in render path when no active chat. |
| ORB voice snapshot `data-orb-mobile` | Low | `isMobile` updated after mount (guarded for first paint). |
| Child hero avatar | Secondary | Missing image 404 (`/assets/uploads/young_people/young_person_1.png`) — noisy console, not hydration. |

## Files inspected

- `frontend-next/app/layout.tsx`, `frontend-next/components/indicare/scope/os-app-providers.tsx`
- `frontend-next/components/indicare/app-shell.tsx`
- `frontend-next/lib/context/active-child-context.tsx`
- `frontend-next/lib/context/child-workspace-hydration.ts`
- `frontend-next/components/indicare/mobile/*`, `frontend-next/components/connect/notification-bell.tsx`
- `frontend-next/components/young-people/workspace/child-profile-hero.tsx`
- `frontend-next/components/orb-standalone/orb-care-companion.tsx`
- `frontend-next/components/orb-operational/orb-conversation-experience.tsx`
- `frontend-next/components/orb-standalone/orb-standalone-experience.tsx`

## Fixes applied

1. **`OperationalTopBarDate`** + **`ClientOnly`** — date shown only after mount; stable placeholder during SSR/first paint.
2. **`useStableSearchParams`** — returns `null` until mounted; used in `AppShell` and `ActiveChildProvider`.
3. **`ChildWorkspaceAvatar`** — `<img onError>` → initials fallback (`data-testid="child-avatar-fallback"`).
4. **`OrbCareCompanion`** — default workspace/a11y on first paint; load `localStorage` in `useEffect`; stable `conversationId`; query params gated with `useMounted`.
5. **`OrbStandaloneExperience`** — accessibility prefs loaded after mount; `data-orb-mobile` only when mounted.
6. **`OrbConversationExperience`** — stable `conversationId` constant for session API.
7. **`HydrationDiagnostic`** — dev/test mount marker only (`data-testid="hydration-diagnostic-mounted"`).

## Image 404 handling

- Broken `profilePhotoPath` values no longer leave a dead `background-image` request without fallback.
- Failed loads switch to initials avatar once; avoids repeated layout churn.

## Remaining limitations

- After mount, scope/query-dependent UI may still update (intentional) — e.g. child context from URL query appears one frame later.
- Standalone ORB may briefly show empty workspace before `localStorage` hydrates (stable default, no mismatch).
- Notification bell counts still populate after fetch (unchanged; count not rendered on SSR).

## Manual QA steps

### Desktop Safari / Chrome

1. Open `/young-people/1/workspace` with devtools console.
2. Confirm **no React #418**.
3. Click: Record something, Daily note, Ask ORB, menu, search, Switch scope.
4. Confirm navigation and handlers fire.

### Mobile Safari — `/orb`

1. Open `/orb`, type `hello`, tap send.
2. Confirm send or visible retry error; no composer bounce; no #418.

### Mobile Safari — child workspace

1. Open `/young-people/1/workspace`.
2. Tap Record, Daily note, ORB, Reviews — confirm navigation.

### Avatar

1. Child with bad `profilePhotoPath` shows initials (`child-avatar-fallback`).
2. No repeated 404 spam after first failed load.
