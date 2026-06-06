# ORB Login Screen — Premium Layout

## Desktop (≥1024px)

- Full viewport two-column grid (`data-orb-login-two-column`).
- **Left** (`data-orb-login-hero-centered`): brand, tagline, headline, trust bullets, hero sphere with soft glow (`orb-login-hero-glow`).
- **Right** (`data-orb-login-panel-centered`): centred premium card (`orb-login-card`) with sign-in form.

Copy:

- ORB Residential / Powered by IndiCare Intelligence
- “AI support for residential children's homes”
- “Record better. Reflect faster. Respond safer.”
- Trust: human review, data protection, provider AI settings, designed for children's homes

## Mobile

- Single column (`data-orb-login-mobile-single-column`).
- Sphere + brand at top; card below; legal links in footer; no horizontal overflow.

## Behaviour

- OAuth (Microsoft/Google/Apple), email/password, passkey, create account unchanged.
- `returnUrl` query param or gate-provided path preserved through OAuth and post-login routing.
- Already-authenticated users redirect to `/orb` or `/orb/billing` per access payload.
- Embedded mode (`embedded` prop from `OrbAuthGate`) hides “Back to home” when shown inside `/orb`.

## CSS

- `app/orb/orb-login-center.css` — column centring, hero glow, mobile card flattening.
- `app/orb/orb-premium-tokens.css` — login colour tokens (light/dark).
