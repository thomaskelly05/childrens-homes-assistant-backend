# ORB Residential — Privacy and Retention (Provider Trust Document)

**Status:** Draft for legal/privacy review.

## Data categories

| Category | Examples | Default retention |
|----------|----------|-------------------|
| Account | Email, name, subscription status | Life of account + legal minimums |
| Usage metadata | Feature usage, token estimates | Per provider `data_retention_days` |
| Saved outputs | User-saved documents user chooses to keep | Until user deletes or account closure |
| Uploaded documents | Files for analysis | Processed for request; long-term storage provider-dependent |
| Audit logs | Security and settings events | Operational retention per deployment |

## Standalone ORB boundary

Standalone ORB is designed **not** to store children's care records or link to OS `home_id` / `child_id` fields. APIs reject OS identifier fields on standalone document routes.

## Raw content storage

- **Prompt storage:** off by default
- **Transcript storage:** off by default
- Enabling either requires explicit administrator acknowledgement

## Cookies and browser storage

- Session cookies for authentication
- CSRF token cookie
- ORB Write may use local draft storage until sign-out (cleared on sign-out via privacy utilities)

## International transfers

If external AI or hosting involves cross-border processing, your Data Processing Agreement and provider subprocessors list apply.

## Your responsibilities

- Provide privacy notices to end users
- Configure retention and AI settings appropriately
- Respond to data subject requests per applicable law

See also: `docs/trust/orb-data-deletion-and-export.md`
