# ORB Residential — Incident Response (Provider Trust Document)

**Status:** Operational draft — align with your organisation's incident policy.

## Objectives

1. Contain impact to users and data
2. Preserve evidence (audit logs, safe metadata)
3. Notify affected parties per legal requirements
4. Restore service safely

## Severity guide

| Level | Examples |
|-------|----------|
| Critical | Suspected data breach, secret exposure, widespread auth bypass |
| High | Stripe webhook failure causing access errors, sustained API abuse |
| Medium | Elevated rate limiting, single-account compromise suspicion |
| Low | CSP violations in report-only mode, isolated upload rejection |

## Response steps (planned process)

1. **Detect** — monitoring alerts, user reports, audit log review
2. **Triage** — classify severity; assign owner
3. **Contain** — rotate secrets, revoke sessions, disable compromised accounts, rate limit abusive IPs
4. **Investigate** — review `audit_events`, auth logs, Stripe dashboard, hosting logs (no raw prompt review unless legally required and enabled)
5. **Remediate** — patch, redeploy, verify checklist (`docs/orb-launch-security-checklist.md`)
6. **Communicate** — notify customers/regulators per legal advice
7. **Post-incident** — document lessons; update controls

## Evidence to preserve

- Audit event records (`security.*`, `auth.*`, admin settings audit)
- Rate limit and abuse guard metadata
- Stripe event IDs
- Deployment timestamps and change log

## Do not

- Post secrets or raw user content in public tickets
- Claim breach scope before investigation
- Disable Stripe webhook signature verification as a "fix"

## Contact

Configure a security contact email/alias before production launch.
