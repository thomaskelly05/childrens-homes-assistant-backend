# ORB Account Menu & Sign Out Contract

## Account menu (ChatGPT-style)

- Opens on account button click; toggles closed on second click
- Closes: outside click, Escape, any menu action (Profile, Settings, Billing, Saved outputs, Voice settings, Data & privacy, Sign out)
- Positions above anchor when anchor is in lower viewport (collapsed sidebar account icon)
- Works from header trigger and collapsed sidebar account icon

## Data markers

| Marker | Purpose |
|--------|---------|
| `data-orb-account-menu` | Popover root |
| `data-orb-account-menu-open` | `true` when visible |
| `data-orb-account-menu-signout` | Sign out control |
| `data-orb-account-menu-trigger` | Header/sidebar trigger |

## Sign out flow

1. User clicks Sign out
2. Close account menu + modals/panels
3. `auth.logout()` — POST `/auth/logout`, `clearStaleOrbSessionState`, reset gate/access caches
4. `window.location.replace('/orb')` — hard remount; login gate only
5. Browser back must not restore usable product without new session

## Tests

- `orb-sign-out-flow.test.ts`
- `orb-account-menu.test.ts`
- `orb-premium-interaction.test.ts`
