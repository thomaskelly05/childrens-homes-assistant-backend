# ORB Sign Out Flow

## User path

1. Open account menu (header or sidebar account control).
2. Click **Sign out** (`data-orb-account-menu-item="sign-out"`).
3. Session cleared; user lands on `/orb` login gate.

## Technical flow

1. `handleResidentialSignOut` in `orb-care-companion.tsx` calls `auth.logout()`.
2. `auth-context` POSTs `/auth/logout`, clears sensitive browser state, resets ORB session gate.
3. Redirect: `/orb` (login screen via `OrbAuthGate`) for ORB surfaces.
4. `window.location.href = '/orb'` ensures product shell is torn down.

## Guarantees

- Sign out is visible in account menu (not buried in settings).
- After sign out, `OrbAuthGate` shows login only — no sidebar/chat.
- Back button should not restore product without a new session (gate re-checks `/auth/me`).

## Non-sensitive local state

- Sidebar collapse, appearance, and local drafts may remain in `localStorage`; product remains gated until re-authentication.
