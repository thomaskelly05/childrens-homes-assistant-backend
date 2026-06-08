# ORB Residential Login — Brand Alignment

Login visual contract version: `front-door-v5` (`data-orb-login-version`).

## Brand hierarchy

| Layer | Copy | Placement |
|-------|------|-----------|
| Product | **ORB Residential** | Left hero (desktop) and compact mobile brand strip |
| Engine | **Powered by IndiCare Intelligence** | Directly under product name |
| Visual | ORB hero sphere | Below engine line on desktop only |
| Brand tag (secondary) | **Care. Connect. Empower.** | Left hero under sphere — not in the login card |
| Functional headline | AI support for residential children's homes | Left hero |
| Supporting line | Record better. Reflect faster. Respond safer. | Left hero |
| Trust points | Human review, data protection, provider AI settings, designed for children's homes | Left hero |

The brand tag is intentionally secondary: smaller type, muted colour, and never used as the primary heading above the sign-in form.

## Left hero changes

- Hero column uses `data-orb-login-hero-top-aligned` with `justify-start` instead of vertical centre.
- Desktop padding starts around **12–20%** from the top of the viewport (`clamp(2rem, 14vh, 5rem)`).
- Shell grid aligns columns to `flex-start` so the hero does not sit too low on short desktops (1440×700 / 1440×760).
- ORB sphere remains on the left hero only; mobile no longer shows a decorative sphere block.

## Right card preservation

Conversion order unchanged:

1. Continue with (Apple, Google, Microsoft)
2. New to ORB Residential? → Create account
3. Already have an account? → Email, password, Sign in with email
4. Use passkey
5. Legal/support footer with disclaimer

The login card still scrolls internally on short viewports. Passkey collapses on compact heights but remains reachable.

## Legal links

Login footer uses public URLs via `OrbLegalLinks publicUrls`:

| Link | URL |
|------|-----|
| Privacy | https://www.indicare.co.uk/privacy |
| Terms | https://www.indicare.co.uk/terms |
| Cookies | https://www.indicare.co.uk/cookies |
| Support | https://www.indicare.co.uk/support |

Footer disclaimer:

> ORB supports professional judgement and does not replace safeguarding procedures, managers, emergency services or legal advice.

**Note:** If any of the above pages are not yet published on www.indicare.co.uk, the links are prepared in the app; website publishing is a provider-console task.

In-app surfaces (billing modal, profile drawer, `/privacy`, `/terms`) continue to use internal `/privacy` and `/terms` routes.

## Viewport checks

| Viewport | Checks |
|----------|--------|
| 1440×700 | Hero top-aligned; CTAs reachable; card scrolls |
| 1440×760 | Hero top-aligned; passkey and legal footer reachable |
| 1440×900 | Full brand hierarchy on left; presentation order preserved |
| 768×1024 | Tablet layout; no horizontal overflow |
| 390×667 | Compact mobile; auth actions above fold; no hero sphere |
| 390×844 | Mobile scroll; create account and passkey reachable |
| 430×932 | Large mobile; legal links reachable |

## Tests run

```bash
cd frontend-next
npm run typecheck
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run e2e:orb-auth
```

Unit/layout tests updated:

- `components/orb-residential/orb-login-screen-layout.test.ts` — brand hierarchy, hero top alignment
- `components/orb-residential/orb-mobile-login-layout.test.ts` — mobile compactness, short desktop
- `components/orb-residential/orb-legal-links.test.ts` — public legal URLs
- `e2e/orb-login-scroll-reachability.spec.ts` — brand hierarchy, legal links, viewport matrix

## Out of scope (unchanged)

- Backend auth, OAuth routes, Stripe/billing logic
- Session/cookie security
- Public route map
- ORB Residential / ORB OS product boundaries

## Remaining provider-console tasks

- Google OAuth callback confirmation
- Microsoft Azure app setup
- Apple callback completion
- Publish/verify www.indicare.co.uk legal pages if not live
