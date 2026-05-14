# IndiCare OS manual QA checklist

Use this when Playwright/Cypress is unavailable or before a provider demo.

## Setup

- Start backend with `.env` loaded and, for demo data, `DEMO_MODE=true`.
- Start `frontend-next` on port 3001.
- Use synthetic demo users only.
- Confirm the demo banner is visible when `NEXT_PUBLIC_DEMO_MODE=true`.

## Core happy path

1. Open `/login`, sign in, and confirm redirect to `/home` or expected MFA setup.
2. On `/home`, open each child selector card and confirm `/young-people/[id]/journey` loads.
3. From a child journey, open Daily Note, Incident, Safeguarding, Missing, Keywork, Family Contact and Health workflows.
4. Save a daily note with a numeric live child id; with a demo string child id, confirm the local-draft limitation is explicit.
5. Return to the journey and confirm saved/draft status text is visible.
6. Open `/chronology`, then a chronology item and a source-record link.
7. Open `/actions`, then an action card.
8. Open `/reports`, switch templates, inspect citations/evidence gaps/actions, and click export controls to confirm no false success message appears.
9. Open `/documents` and `/documents/regulatory`.
10. Open `/assistant`, send a general care query, and confirm errors are controlled.
11. Tap Orb, toggle captions, open text fallback, and confirm unavailable/realtime status is clear.
12. Open `/settings`, `/setup`, `/staff`, `/settings/orb` and verify all visible controls navigate or show controlled limitations.

## Security happy path

- Log out and confirm sensitive storage/session state is cleared.
- Visit a protected route while signed out and confirm redirect/denial is clean.
- Sign in as a viewer and confirm manager-only navigation is hidden or blocked with the unauthorized state.
- Attempt a child or home route outside assigned scope if test data supports it; expect a clear denial/not-found state.

## Mobile/tablet QA

- Test viewport widths around 390px, 768px and 1024px.
- Confirm child selector cards stack cleanly and touch targets are at least 44px high.
- Confirm bottom nav and Orb do not overlap save buttons or safe-area edges.
- Complete daily note and incident forms with the on-screen keyboard open.
- Confirm data tables scroll horizontally instead of squeezing columns.
- Confirm chronology cards remain readable without tiny text or clipped actions.

## Performance/load sanity

- Confirm dashboards and chronology do not fetch full-year demo records at once.
- Confirm report pages render previews without embedding all demo data in client bundles.
- Confirm Orb does not reconnect-loop when the realtime provider is unavailable.
- Confirm there is no repeated console error spam during login, journey, reports, assistant or Orb checks.
- Confirm lists remain paginated/capped where backend data is large.

## Compliance/audit checks

- Confirm all report previews include draft/review language.
- Confirm confidentiality labels appear on report/document/export surfaces.
- Confirm actions are clickable from reports and chronology.
- Confirm evidence gaps are visible in readiness/report views.
- Confirm no assistant or Orb interaction silently writes a record.
