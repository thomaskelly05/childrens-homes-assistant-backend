# ORB Mobile Access Verification Hotfix — Audit

## Symptom

After PR #1499 (auth loading hotfix), iPhone Safari at `app.indicare.co.uk/orb` progressed past “Checking your session…” to:

- “Verifying your ORB access…”
- “Securing your ORB Residential access”

Then the UI **bounced**, **looped**, or **stayed stuck** instead of resolving to login, billing/upgrade, safety acceptance, product, or a safe retry screen.

## Root cause

Two interacting defects in the access-verification phase:

### 1. Authenticated login bounce loop (primary)

`OrbAuthGate` rendered embedded `OrbLoginScreen` on access timeout while `auth.status` remained `'authenticated'`.

`OrbLoginScreen` contains:

```tsx
useEffect(() => {
  if (status !== 'authenticated') return
  void fetchOrbAccess().then((access) => router.replace(resolvePostLoginRoute(access)))
}, [status, ...])
```

So the sequence was:

1. Auth resolves → `authenticated`
2. Access check hangs → gate shows login after timeout
3. Login screen sees authenticated → fetches access → `router.replace('/orb')`
4. Gate returns to access verification loading
5. Repeat → visible bounce / loop on mobile

**Fix:** Never render `OrbLoginScreen` while authenticated. Access timeout now renders `OrbAccessRetryScreen` (or upgrade/safety per access outcome).

### 2. Remount-reset access timer (secondary)

Access timeout used component state (`accessTimedOut`) that reset when `account.isLoading` flickered or the gate remounted (Suspense, `useSearchParams`, mobile Safari). Unlike auth loading (module-level `orb-auth-loading-deadline.ts`), access verification could stay in “Verifying your ORB access…” indefinitely.

**Fix:** `lib/orb/orb-access-loading-deadline.ts` with `ORB_ACCESS_GATE_FALLBACK_MS` (7s) in `OrbAuthGate`.

### 3. Stale session not invalidated by access (secondary)

`GET /orb/standalone/access` used `get_optional_orb_residential_user`, which swallowed invalid tokens and returned HTTP 200 with a guest payload. The frontend could keep a cached `/auth/me` user while access silently looked “logged out”, preventing a clean login path.

**Fix:** Access route returns **401 JSON** when a session cookie/token is present but invalid. Frontend maps 401 → `accessFailureKind: 'unauthorized'` → `auth.logout()` → login.

## Audit findings

| Area | Finding |
|------|---------|
| “Verifying your ORB access…” | `OrbAuthGate` when `auth.status === 'authenticated' && account.isLoading` |
| Auth loading vs access loading | Auth: “Checking your session…” (5s gate). Access: “Verifying…” (7s gate) |
| `auth.status` during access load | `authenticated` (expected) |
| Access endpoint | `GET /orb/standalone/access` — no premium dependency; not rate-limited in `security_rate_limit_service.py` |
| Invalid session | Was 200 guest payload → now 401 JSON |
| Infinite retry | No hook retry loop; single fetch per auth/user change |
| Product leak | Gate still blocks children until `hasConfirmedAccess` |

## Fix summary

| Layer | Change |
|-------|--------|
| `OrbAuthGate` | Access deadline; retry/upgrade/safety terminals; no login while authenticated |
| `orb-access-loading-deadline.ts` | Module-level access timer |
| `OrbAccessRetryScreen` | Try again / Back to sign in / Manage billing |
| `use-orb-account-state` | `accessFailureKind`; 401/402/403/429/5xx classification |
| `fetchOrbAccess` | `authFetchResponse` — surfaces HTTP status |
| `GET /orb/standalone/access` | 401 for invalid token; 200 guest when no token |
| `auth-context` | Reset access deadline on login/logout |

## Security preserved

- No product shell before `can_use_orb` / confirmed access
- No premium bypass on access route
- 401 clears stale client session
- OAuth, billing, Stripe flows unchanged
