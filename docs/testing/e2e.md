# E2E testing

## Framework

The Next.js frontend uses Playwright for browser E2E tests.

Run from `frontend-next/`:

```bash
npm run e2e
```

Playwright starts the app with:

```bash
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run dev
```

## Auth strategy

E2E uses a synthetic manager user only when `NEXT_PUBLIC_E2E_TEST_MODE=1` and `NODE_ENV !== "production"`.

Default credentials:

- Email: `manager.demo@indicare.local`
- Password: `IndiCareDemo123!`

Optional overrides:

- `NEXT_PUBLIC_E2E_USER_EMAIL`
- `NEXT_PUBLIC_E2E_USER_PASSWORD`

This does not weaken production auth because the bypass is disabled in production and is only used by the frontend test runner.

## Test data

The golden workflow uses existing demo data in `frontend-next/lib/indicare/demo-data.ts`. Jamie's demo ID is `yp-jamie`.

Because demo IDs are not numeric backend IDs, recording saves return an explicit local-draft state instead of pretending to persist. The E2E test asserts that the UI says the draft has not been added to the child's live record.

## Covered golden path

`e2e/golden-workflow.spec.ts` covers:

- Login
- Child selector
- Jamie's journey
- Daily Note workflow
- Smart suggestion chip
- Linked safeguarding workflow
- Chronology navigation
- Action and manager review visibility
- Handover, report and evidence links
- Orb presence
- Logout privacy cleanup

## Manual fallback

If browser binaries are unavailable, run the app manually with `NEXT_PUBLIC_E2E_TEST_MODE=1 npm run dev`, open `/login`, and follow `docs/product/golden-workflow.md`.
