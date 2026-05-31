# ORB Residential UI Reset — UX Report (2026-05-31)

Sprint: **ORB Residential UI Reset — Back to ChatGPT Simplicity**

## 1. What was too complex before

- `/` front door showed seven large capability cards plus OAuth shortcuts — felt like a product dashboard, not a copilot entry.
- Trial CTA sent users to `/orb/setup` before they could ask anything.
- `/orb/setup` used a five-step wizard (role, full home profile, support focus, answer style, safety) — form-heavy onboarding.
- `/orb` was a separate minimal “home” that linked to `/orb/ask` instead of the main chat experience.
- Login OAuth `return_url` pointed at setup, not chat.
- No passkey / Face ID / Touch ID entry on the login screen (only buried in settings).
- Station routes (`/orb/review`, etc.) were standalone scrollable pages outside the chat shell.

## 2. What changed

- **Front door (`/`)**: Single above-the-fold screen (`100dvh`, no scroll), glowing ORB, glass panel, trial + sign-in CTAs, four tiny example links only.
- **Login (`/orb/login`)**: One-screen layout; Microsoft-first OAuth with SVG provider icons; email + passkey; OAuth returns to `/orb`.
- **Main ORB (`/orb`)**: Full `OrbCareCompanion` with `residentialSurface` — ChatGPT layout, dark premium theme, simplified sidebar (stations, recent chats, profile/billing/settings/OS link).
- **Setup (`/orb/setup`)**: Optional name/role + safety only; “Set up later” skips to `/orb`.
- **Safety**: Compact `OrbSafetyModal` on `/orb` when backend reports safety not accepted (not a multi-step flow).
- **Stations**: Review, Templates, Learn, Saved, Locality, Ofsted, Safeguarding open inside ORB (panels / chat prefill); legacy routes redirect to `/orb?station=…`.
- **Viewport**: `100dvh` + `overflow: hidden` on shell; chat thread and sidebar scroll independently; composer textarea max-height with internal scroll.

## 3. New route behaviour

| Route | Behaviour |
|-------|-----------|
| `/` | ORB Residential front door (no OS shell) |
| `/orb/login` | Premium login (no OS shell) |
| `/orb` | Main ChatGPT-style ORB chat |
| `/orb/setup` | Optional lightweight profile + safety |
| `/orb/billing` | Trial/subscription |
| `/orb/review`, `/templates`, `/learn`, `/saved` | Redirect → `/orb?station=…` |
| `/os`, `/homes`, `/young-people/*`, `/assistant/orb` | Unchanged IndiCare OS |

## 4. Login / auth options

| Option | Status |
|--------|--------|
| Microsoft | First button; OAuth `/orb/standalone/auth/oauth/microsoft/start?return_url=/orb` |
| Google | OAuth with multicolour icon |
| Apple | OAuth with Apple icon |
| Email | Expandable email/password form |
| Face ID / Touch ID / Passkey | `beginOrbPasskeyLogin` when `orbPasskeysSupported()` |
| Authenticator app | Fallback link to `/mfa` from email form |

## 5. Passkey / Face ID / Touch ID support status

- **Backend**: Existing WebAuthn routes (`/auth/passkeys/*`) and `lib/orb/orb-passkey-client.ts` unchanged.
- **Login UI**: Passkey button + email field when browser supports WebAuthn; label: “Use Face ID, Touch ID or device passkey”.
- **Settings**: Passkey register/remove still in ORB settings panel (not removed).
- **MFA**: Authenticator app remains available via `/mfa`; not positioned as primary.

## 6. Onboarding simplification

- Post-login no longer requires `onboarding_completed` to reach `/orb` (only billing gate when no trial/subscription).
- `/orb/setup` is optional; home postcode, LA, police force, etc. removed from required path.
- Progressive collection remains via ORB chat and profile drawer.
- Safety acknowledgement: modal on `/orb` or optional setup page checkbox.

## 7. ORB main screen behaviour

- Left sidebar (~300px): New chat, recent chats (searchable), stations, profile, billing, settings, IndiCare OS link.
- Main column: empty state with ORB glow + “How can I help today?” (or personalised heading), message thread, fixed composer.
- Mobile: sidebar drawer overlay (existing pattern preserved).
- Backend intelligence, streaming, saved outputs, document panels unchanged.

## 8. Stations / apps inside ORB

| Station | In-ORB behaviour |
|---------|------------------|
| Review This | Document panel + review prefill in composer |
| Templates | Knowledge library panel |
| Learn | Learning session prefill in chat |
| Saved Outputs | Saved outputs side panel |
| Locality Risk | Chat prefill for locality assessment |
| Ofsted Lens | Mode → Ofsted Lens |
| Safeguarding Lens | Mode → Safeguarding Thinking |

## 9. Scroll / viewport rules

- Page shell: `height: 100dvh`, `overflow: hidden` (`.orb-chat-layout--residential`).
- Chat messages: `overflow-y: auto` on scroll container.
- Sidebar: `overflow-y: auto` on station/chat list region.
- Composer textarea: `max-height: 12rem` with internal scroll.
- Front door + login: `h-[100dvh] overflow-hidden`.

## 10. Tests run

```bash
cd frontend-next && npm run test:orb
cd frontend-next && npm run typecheck
```

`components/orb-residential/orb-routing.test.ts` covers front door, login providers/icons, passkey guard, `/orb` shell, viewport CSS, stations, redirects, and OS preservation.

## 11. Remaining gaps

- **Full `next build`**: Not run in agent VM (optional; run in CI).
- **Backend onboarding flag**: `onboarding_completed` may still be set for analytics; no longer blocks `/orb`.
- **Station-specific APIs**: Review/templates screens that called dedicated UIs now use in-chat panels; edge cases may need UX polish.
- **Signup page**: `/orb/signup` not restyled in this sprint.
- **Light theme on `/orb`**: Residential defaults to dark; appearance toggle still available in settings.

## Target journey (achieved)

```
app.indicare.co.uk
  → / (one-screen front door)
  → /orb/login (Microsoft / Google / Apple / Email / Passkey)
  → /orb (safety modal if needed)
  → ask ORB → get answer
```

Everything else lives in the sidebar and in-chat stations.
