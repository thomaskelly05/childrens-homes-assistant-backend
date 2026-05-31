# ORB Residential launch UX report (2026-05-31)

## 1. Routes changed

| Route | Change |
|-------|--------|
| `/` | ORB Residential front door (was IndiCare OS home) |
| `/os` | IndiCare OS home (unchanged behaviour) |
| `/orb` | Minimal ORB home (was full `OrbCareCompanion`) |
| `/orb/setup` | **New** — 5-step onboarding |
| `/orb/billing` | **New** — trial/subscription (upgrade screen) |
| `/orb/review` | **New** — Review This |
| `/orb/templates` | **New** — Template library |
| `/orb/learn` | **New** — ORB Learn |
| `/orb/saved` | **New** — Saved outputs |
| `/orb/onboarding` | Redirect → `/orb/setup` |
| `/orb/access` | Redirect → `/orb/billing` |
| `/orb/ask` | Full chat workspace (preserved) |
| `/homes`, `/young-people/*`, `/assistant/orb` | Unchanged (OS) |

## 2. Screens changed

- Premium navy front door at `/`
- Split-panel login at `/orb/login` (Microsoft first)
- Conversational setup at `/orb/setup`
- Minimal ORB home at `/orb`
- Review, templates, learn, saved capability pages
- Root layout metadata default: ORB Residential

## 3. Components added

`components/orb-residential/ui/`: `OrbShell`, `OrbButton`, `OrbGlassCard`, `OrbCapabilityCard`, `OrbAuthButton`, `OrbStepCard`, `OrbInputPanel`, `OrbResultCard`, `OrbGlowHero`

`components/orb-residential/`: `OrbFrontDoor`, `OrbResidentialChatHome`, `OrbLoginScreen`, `OrbSetupScreen`, `OrbReviewScreen`, `OrbTemplatesScreen`, `OrbLearnScreen`, `OrbSavedScreen`, `OrbBillingPage`

## 4. OS preservation

- `/os` — OS landing with young people list
- `/homes`, `/young-people/*` — workspaces
- `/assistant/orb` — OS-linked ORB
- Front door + ORB shell link: “IndiCare OS” → `/os`

## 5. Auth links

- Microsoft / Google / Apple: `/orb/standalone/auth/oauth/{provider}/start?return_url=/orb/setup`
- Email: existing `/auth/login` via `useAuth().login`
- Post-login: setup → billing (if no access) → `/orb`

## 6. Billing / trial entry

- Front door CTA → `/orb/login?returnUrl=/orb/setup`
- `/orb/billing` — 7-day trial + £9.99/month subscribe
- Stripe success/cancel under `/orb/billing/success` and `/orb/billing/cancel`

## 7. Remaining frontend gaps

- `/orb/ask` still uses full `OrbCareCompanion` (sidebar) for power users
- Template/export APIs may 404 until backend routes are live — UI degrades gracefully
- Signup page still light-theme (not restyled)
- Deep OAuth provider detection from `/orb/auth/providers` not wired (env flags used)

## 8. Tests / build

- `npm run test:orb` — includes `components/orb-residential/orb-routing.test.ts`
- Full `next build` not run in agent environment (document if skipped)

## 9. User journey

```
app.indicare.co.uk
  → / (ORB front door)
  → /orb/login (Microsoft / Google / Apple / Email)
  → /orb/setup (role, home profile, support, style, safety)
  → /orb/billing (trial or subscribe if needed)
  → /orb (minimal home — Ask ORB)
  → /orb/review | /orb/templates | /orb/learn | /orb/saved
```

OS users: **IndiCare OS** link → `/os` → existing homes / young people workflows.
