# ORB Account Menu — Profile, Settings, Billing

## Account menu (`OrbAccountMenu`)

ChatGPT-style compact popover (`data-orb-account-menu`):

- Trigger: header account button (`data-orb-account-menu-trigger`) or sidebar profile actions.
- Shows: name, email, plan/status chip.
- Items: Profile, Settings, Billing, Data & privacy, Voice settings, Saved outputs, **Sign out**.
- Closes on outside click or Escape; keyboard-focusable menu items.

## Profile

- Menu → **Profile** opens `OrbAccountModal` (drawer/shell).
- Shows plan, subscription chips, safety status, passkey/voice indicators, quick actions.
- Inactive users see subscribe CTA — not “Sign in”.

## Settings

- Menu → **Settings** opens `OrbStandaloneSettingsPanel` drawer.
- Sections: General, Appearance, Personalisation, Chat, Voice, Data & privacy, AI trust (provider), Accessibility.
- Provider AI trust settings unchanged.

## Billing

- Menu → **Billing** opens `OrbBillingModal`.
- ORB Residential £9.99/month, trial/active/inactive states, feature list, Stripe CTAs preserved.

## Data & privacy

- Menu item routes to Settings (privacy section) — same as prior account modal quick action.
