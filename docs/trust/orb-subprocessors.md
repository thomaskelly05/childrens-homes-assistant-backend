# ORB Residential — Subprocessors (Provider Trust Document)

**Status:** Draft — maintain accurate list for your deployment and contracts.

Subprocessors may process data on behalf of the service depending on configuration:

| Subprocessor | Purpose | Data potentially processed |
|--------------|---------|---------------------------|
| Hosting provider (e.g. Render, cloud VM) | Application hosting | All application data at rest/in transit |
| PostgreSQL database | Data storage | Account, billing, saved outputs, audit logs |
| Stripe | Payments and subscriptions | Billing identifiers, payment metadata (not full card numbers in app DB) |
| AI provider (e.g. OpenAI) | AI inference when enabled | Redacted prompts/content per governance settings |
| Email provider | Transactional email | Email address, notification content |
| OAuth providers (Google, Microsoft, Apple) | Authentication | Identity tokens per OAuth flow |

**Not used by default for standalone ORB:** OS care record storage, child profile databases.

## Provider configuration dependent

- External AI subprocessor use only when `external_ai_enabled` is true
- Premium TTS may use additional voice providers when enabled
- OAuth availability depends on enabled providers

## Updates

Review this list before launch and when adding integrations. Subject to legal review and DPA schedules.
