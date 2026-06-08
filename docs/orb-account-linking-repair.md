# ORB account linking and duplicate OAuth repair

## Why duplicate OAuth accounts can happen

ORB Residential stores provider identities in `orb_oauth_accounts` keyed by `(provider, provider_subject)`.

Before verified-email linking and duplicate repair shipped, a user could:

1. Subscribe with Google on `user_id=5`.
2. Later sign in with Microsoft, creating a separate `user_id=11` when Microsoft created a new ORB Residential user first.
3. On subsequent Microsoft sign-ins, OAuth resolved to `user_id=11` because the Microsoft provider row already existed, so `linked_existing_by_email=false` and `access_state=trial_available`.

The paid subscription and Stripe customer remain on the canonical Google-linked user.

## Verified-email linking (runtime)

On every Google or Microsoft OAuth callback:

1. Normalise the provider email.
2. Require verified email where the provider is trusted (Google `email_verified`, Microsoft treated as verified when Graph/id_token supplies the mailbox).
3. Identify the canonical ORB Residential user for that email:
   - active `orb_subscriptions` first
   - active Stripe subscription id next
   - Stripe customer id next
   - earliest ORB Residential user as fallback
4. If the provider account belongs to a duplicate user, re-home it to the canonical user.
5. Otherwise link the provider to the canonical user or create a new ORB Residential user only when no safe match exists.

Safe audit logs include:

- `linked_existing_by_email=true`
- `rehomed_provider_from_duplicate_user=true`
- `canonical_user_id`
- `duplicate_user_id`
- `provider`

No OAuth tokens, refresh tokens, id tokens, or client secrets are logged.

## Duplicate provider repair (management commands)

### Diagnose

```bash
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python scripts/orb_diagnose_duplicate_accounts.py --email user@example.com --dry-run
```

Outputs per user:

- `user_id`, `email`, normalised email
- linked provider accounts
- subscription status
- Stripe customer/subscription presence
- `created_at`

### Repair

Dry-run first:

```bash
python scripts/orb_repair_duplicate_accounts.py --email user@example.com --dry-run
```

Apply when the canonical paid user is correct:

```bash
python scripts/orb_repair_duplicate_accounts.py --email user@example.com --apply
```

Repair moves OAuth provider rows to the canonical user. It does not delete duplicate `users` rows or move Stripe records away from the canonical subscribed user.

## Verify subscription state remains active

After repair or Microsoft re-login:

```bash
python scripts/orb_diagnose_duplicate_accounts.py --email user@example.com --dry-run
```

Confirm:

- `canonical_user_id` owns the active subscription
- Microsoft and Google provider rows point at the same `user_id`
- `stripe_customer_id_present=yes` on the canonical user

Sign in with Microsoft again and confirm backend logs show:

- `linked_existing_by_email=true` or `rehomed_provider_from_duplicate_user=true`
- `access_state=subscription_active` (or `trial_active` when applicable)

## Troubleshooting `access_state=trial_available` after Microsoft login

1. Run the diagnostic command for the mailbox used by Microsoft.
2. If two `user_id` values appear, run repair dry-run and inspect which user owns `orb_subscriptions`.
3. Re-login with Microsoft after repair.
4. If still blocked, use **Switch account** on `/orb/billing` and sign in with the original Google account used at checkout.

## Consumed OAuth handoff / Safari back button

OAuth session completion uses a single-use handoff record.

Desired behaviour:

- First visit to `/backend/orb/standalone/auth/oauth/session/complete?handoff=…` sets cookies and redirects.
- Replaying the same URL shows: “This sign-in link has already been used. Please sign in again.”
- If the browser already has a valid ORB session, replay redirects to `/orb` instead of a security error.

## Verify frontend auth UI deploy

Production should expose:

- `data-orb-auth-build-variant="orb-auth-ux-polish"` on the login screen
- `auth_ui_build_variant: orb-auth-ux-polish` from `GET /orb/auth/providers`
- `GET /orb/auth/launch-health` for config-only launch diagnostics

Footer links must render as **Privacy · Terms · Cookies · Support**, not concatenated text.
