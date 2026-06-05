# ORB Settings & Profile Modals

## Settings

- Launched from sidebar **Settings**
- **Presentation**: right-side overlay drawer (`orbOverlayDrawerShellProps`)
- **Sections**: General, Personalisation, Voice, Chat, Skills, Data controls, Security, Billing, About
- Escape and backdrop close
- Does not replace main workspace — no back arrow required

## Account / Profile

- Launched from sidebar **Profile**
- Premium drawer with:
  - Name, email, plan, subscription status
  - Safety acceptance chip
  - Voice and passkey status
  - Saved outputs / projects counts
  - Local/offline mode notice when applicable
  - Inactive subscription CTA (trial/subscribe) — no confusing sign-in when already signed in
- Quick actions: Billing, Settings, Voice, Saved outputs, Data & privacy, Sign out

## Billing

- Centred modal overlay (unchanged entry: `activePanel === 'billing'`)
- Full feature list including ORB Write
- Sticky footer: trial, subscribe, refresh, manage subscription
