# Data protection overview

IndiCare OS handles confidential children’s home records. Production deployments must keep data minimised, access-controlled, auditable and recoverable.

## Data minimisation

- Collect only information needed for care recording, safeguarding, management oversight, regulatory evidence and operational reporting.
- Demo data is synthetic and clearly marked; it must not be mixed with production records.
- Forms should encourage factual observations, child voice, staff response and required follow-up rather than unnecessary narrative.

## Isolation and access

- Provider/home scope and RBAC must apply to child records, actions, documents, reports, exports, assistant retrieval and Orb context.
- Unauthorized users should see clear denial or not-found recovery without revealing protected record details.
- Manager/admin roles require MFA/passkey foundations before serious pilot use.

## Audit logs

- Authentication, role changes, record writes, document actions, exports and assistant access should be audit logged.
- Assistant and Orb must not silently write records; staff confirmation is required before persistence.
- Audit logs should remain append-only from normal application workflows.

## Documents and exports

- Reports and exports must carry confidentiality and draft/review labels until signed off.
- Export actions should not show success unless a file/share/save actually completed.
- Document storage backups and metadata restores must be tested together.

## Retention/archive foundations

- Providers should define retention and archive periods before pilot deployment.
- Archived/deleted/unavailable records must resolve to a helpful state.
- Restore and deletion operations must preserve auditability where legally required.
