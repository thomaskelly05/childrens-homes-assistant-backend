# ORB Residential — Data Deletion and Export (Provider Trust Document)

**Status:** Draft — confirm routes and SLAs with legal/operations.

## User data in ORB Residential

May include:

- Account profile and authentication identifiers
- Subscription/billing linkage (Stripe customer reference)
- Saved outputs created by the user
- Uploaded documents indexed for the user session (deployment-dependent)
- Usage and audit metadata

## Export

**Currently:** Manual export processes may be required for full data portability depending on deployment.

Planned/support paths:

- Saved outputs — user can export individual items via product UI where implemented
- Account data — contact support for structured export (subject to identity verification)

Automated self-service bulk export for standalone ORB is **not fully implemented** — document gap honestly in customer-facing materials until available.

## Deletion

| Request type | Current approach |
|--------------|------------------|
| Delete saved output | User archive/delete in product where available |
| Close account | Manual support process — verify identity, revoke sessions, delete/disable user record per retention policy |
| Provider offboarding | Operational runbook required — database retention per contract |

## Retention after deletion

Backups and audit logs may retain data for a limited period per hosting backup policy — disclose in privacy notice.

## OS vs standalone

Standalone ORB deletion does not automatically delete IndiCare OS care records (separate products).

## Legal review

Deletion timelines and export formats must be confirmed with legal counsel before customer commitments.
