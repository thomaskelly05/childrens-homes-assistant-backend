# ORB Security Monitoring Events

Structured security events for operations and incident review. **Safe metadata only** — no raw prompts, transcripts, document text, child-identifiable data, or secrets.

## Event catalogue

| Event type | When emitted | Metadata fields |
|------------|--------------|-----------------|
| `security.rate_limit_exceeded` | HTTP rate limit middleware blocks request | `policy`, `method`, `path`, `scope` |
| `security.ai_abuse_limit` | AI input/daily guard blocks request | `code`, `length` or `turns`, `max`, `user_id` |
| `security.csrf_blocked` | CSRF middleware rejects mutation | `path`, `method` |
| `security.csrf_trusted_orb_bootstrap` | Trusted-origin ORB bootstrap POST allowed | `path`, `method`, `origin` |
| `http.request` | Audit middleware on sensitive paths / errors | `status_code`, `duration_ms` |
| `auth.*` | Login/MFA/passkey events via `log_auth_event` | Event type, IP, user agent (no passwords) |
| `document.security` | Upload rejection / security service | Safe document metadata |
| Provider AI settings audit | `write_settings_audit` on PATCH | Changed keys, before/after values (settings only) |
| `ai_audit_logs` | AI gateway usage | Token counts, model, feature — no raw content by default |
| Stripe webhook failures | Billing route exceptions | Event type, duplicate flag — no card data |

## Log format (application)

Rate limit example:

```
security.rate_limit_exceeded policy=orb_chat method=POST path=/orb/standalone/conversation ip=203.0.113.1 user=user:42
```

AI abuse example:

```
security.ai_abuse_limit code=prompt_too_long user_id=42
```

## Recommended alerts (manual / future automation)

| Signal | Suggested action |
|--------|------------------|
| Spike in `security.rate_limit_exceeded` for `auth_login` | Possible credential stuffing — review IP ranges |
| Spike in `orb_chat` rate limits | Possible automation abuse — review accounts |
| `security.ai_abuse_limit` `daily_ai_limit` cluster | Cost guard triggered — support contact |
| Stripe webhook 4xx/5xx | Billing sync risk — check signature secret and idempotency |
| `security.csrf_blocked` burst | Possible CSRF attack or client misconfiguration |
| Admin AI settings audit with `external_ai_enabled` true | Confirm provider acknowledgement recorded |

## What we do not log by default

- Raw user prompts or model responses
- Full transcripts or document bodies
- Child names, addresses, or care record identifiers in standalone ORB
- API keys, session tokens, or webhook secrets

## Configuration

| Variable | Effect |
|----------|--------|
| `HTTP_AUDIT_SAMPLE_RATE` | Sample successful HTTP audit events |
| `HTTP_AUDIT_ERROR_SAMPLE_RATE` | Sample error audit events (default 1.0) |
| `DISABLE_RATE_LIMITING` | Disables rate limit events (dev only) |

## Deferred

- Centralised SIEM export
- PagerDuty/Opsgenie integration
- Real-time anomaly detection on API spikes
