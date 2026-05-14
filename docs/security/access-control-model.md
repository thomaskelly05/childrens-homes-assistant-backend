# Access control model

## Roles

- `admin`: platform/provider administration, settings, staff access and audit oversight.
- `manager`: registered manager workflows, reports, quality assurance and staff oversight.
- `deputy_manager`: delegated management, recording review, actions and reports.
- `senior_residential_support_worker`: shift leadership, recording, handover and assigned actions.
- `support_worker`: child recording, handover and assigned records.
- `RI`: responsible individual oversight, reports, audit and quality review.
- `viewer`: read-only access where explicitly scoped.

## Scope

- Provider and home scope must be enforced for child records, actions, documents, reports, exports, assistant context and Orb context.
- Cross-home or cross-provider records should deny cleanly or resolve to a non-disclosing not-found state.
- Archived/deleted/unavailable records should explain that the record cannot be opened and provide safe recovery links.

## MFA/passkeys

- Admin, manager, deputy manager and RI access should require MFA.
- Passkey status should be visible where the backend exposes it.
- Staff invite, role change, deactivation and MFA enforcement controls should not pretend to write if the admin endpoint is unavailable.

## Audit and review

- Role changes, deactivations, invite sends, MFA enforcement, failed authorization and export actions should be logged.
- Reports remain draft/review-required until approved by an authorized role.
- Orb and assistant do not bypass RBAC or home/provider isolation.
