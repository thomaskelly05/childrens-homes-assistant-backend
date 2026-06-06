# ORB Secrets Management Checklist

Use before production launch and after any env/config change.

## Server-only secrets (must never appear in frontend bundles)

| Secret | Typical env name | Client exposure |
|--------|------------------|-----------------|
| OpenAI API key | `OPENAI_API_KEY` | **Never** |
| Stripe secret | `STRIPE_SECRET_KEY` | **Never** |
| Stripe webhook secret | `STRIPE_WEBHOOK_SECRET` | **Never** |
| Session signing | `SESSION_SECRET`, `SESSION_SECRET_KEY`, `SECRET_KEY` | **Never** |
| JWT / auth | `JWT_SECRET`, `AUTH_SECRET` | **Never** |
| OAuth client secrets | `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_SECRET`, `APPLE_PRIVATE_KEY` | **Never** |
| ElevenLabs | `ELEVENLABS_API_KEY` | **Never** |
| Database | `DATABASE_URL` | **Never** |

## Safe frontend patterns (current)

- API calls proxied via `/backend/*` and same-origin rewrites — no `NEXT_PUBLIC_*` API keys
- `INTERNAL_API_BASE_URL` used server-side only in `next.config.ts`
- Voice/TTS uses server routes; keys stay on backend
- Config diagnostics return **warnings only**, not secret values

## Automated checks

| Check | Location |
|-------|----------|
| No `sk_live_` in frontend | `orb-production-smoke-contract.test.ts` |
| No `OPENAI_API_KEY=` in client source | `tests/test_orb_secret_exposure.py`, frontend contracts |
| Stripe secrets not in client | `orb-login-billing-readiness.test.ts` |

Run:

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_secret_exposure.py -q
cd frontend-next && npm run typecheck
```

## Logging rules

- Do not log raw prompts, transcripts, or document text by default
- Do not log secret env values in startup or error handlers
- Rate-limit and abuse events log policy codes and counts only

## Production env checklist

- [ ] All secrets set via hosting secret manager (not committed to git)
- [ ] `.env` not deployed to frontend/static hosts
- [ ] `APP_ENV=production`
- [ ] `SESSION_SECRET` / `SESSION_SECRET_KEY` set and rotated on compromise
- [ ] Stripe webhook secret matches Stripe dashboard endpoint
- [ ] OAuth redirect URIs match production domains only
- [ ] No `NEXT_PUBLIC_BACKEND_URL` pointing at internal admin URLs in production
- [ ] E2E test credentials (`NEXT_PUBLIC_E2E_*`) unset in production

## Incident response

If a secret is exposed: rotate immediately, revoke sessions if session secret, re-issue API keys, review audit logs for abuse. See `docs/trust/orb-incident-response.md`.

## Deferred

- Automated pre-deploy secret scanner in CI (partially covered by pytest contracts)
- Hardware security module / external KMS integration
