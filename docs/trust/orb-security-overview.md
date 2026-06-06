# ORB Residential — Security Overview (Provider Trust Document)

**Status:** Draft for legal/provider review. Subject to your organisation's policies and deployment configuration.

## What ORB Residential is

ORB Residential is a subscription product for residential childcare professionals. It provides AI-assisted tools including chat, dictate, voice, document understanding, templates, and saved outputs.

## Access model

- **Login required** for product features
- Product pages and APIs are **gated** behind authentication
- **Subscription and safety acceptance** checks apply before premium features
- Sign-out clears session cookies and sensitive browser storage (subject to browser behaviour)

## Security controls (designed to support enterprise use)

| Area | Current approach |
|------|------------------|
| Authentication | Email/password, OAuth, passkeys, MFA for sensitive OS roles |
| Session security | HTTP-only cookies, CSRF on mutations, session revocation |
| API access | Per-user scoping; premium dependency on product routes |
| AI governance | Privacy decision service, redaction, external AI off by default for new providers |
| Uploads | Type and size limits; executable files blocked |
| Billing | Stripe with webhook signature verification |
| Logging | Safe metadata by default; raw prompts/transcripts not stored by default |

## What this document does not claim

- SOC 2, ISO 27001, or Cyber Essentials **certification** (unless separately contracted)
- Replacement of your safeguarding policies or statutory duties
- Zero-risk AI — human review remains required

## Subprocessors and hosting

See `docs/trust/orb-subprocessors.md`.

## Contact

Support and security contact paths should be configured for your deployment before launch.
