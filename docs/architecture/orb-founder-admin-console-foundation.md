# ORB Founder/Admin Console — Foundation Architecture

**Status:** Partially live; this pass adds analytics redaction foundation and capability map

## Existing surfaces

### Founder OS (live)

| Component | Path |
|-----------|------|
| Bootstrap API | `/founder-os/bootstrap` |
| Persistence | `/founder-os/persistence/*` |
| Telemetry | `/founder-os/telemetry/*` |
| Frontend | `frontend-next/app/founder/*` (40+ pages) |

### Admin (partial)

| Component | Path | Notes |
|-----------|------|-------|
| Platform admin | `/admin/*` | Legacy HTML for users/homes |
| AI trust settings | `/api/admin/*` | Provider controls |
| ORB admin quality | `/orb/admin/*` | Feedback, quality review |

### Orphaned

- `routers/founder_ai_routes.py` — not mounted
- No unified Next.js admin console for user/home management

## Founder visibility (capability map)

| Area | Status | Notes |
|------|--------|-------|
| Users | Live | Admin routes + founder bootstrap |
| Organisations / homes | Live | Anonymised in founder adapters |
| Uploads | Partial | OS routes; ORB standalone separate |
| Document processing status | Planned | Home docs foundation |
| Template usage | **This pass** | `orb_founder_analytics_foundation_service` |
| Category usage | Partial | Telemetry events |
| Questions asked | Live | Redacted telemetry |
| Answer quality flags | Live | Quality lab, ORB evaluation |
| Safety flags | Live | Guardrail events in telemetry |
| Guardrail events | Live | Founder telemetry |
| Feedback | Live | ORB admin feedback |
| Exports | Partial | Founder evidence packs |
| Saved records count | Planned | Workspace foundation |
| Usage trends | Live | Founder dashboard metrics |
| Most used templates | **This pass** | Aggregate without identifiers |
| Failed responses / provider errors / latency | Live | Telemetry + quality lab |
| Pilot feedback | Live | Pilot outcome framework |
| Anonymised market research | Stub | Sector intelligence agent |
| Investor traction reports | Partial | Founder evidence builder |

## Founder actions

| Action | Status |
|--------|--------|
| Add / disable user | Live via `/admin` |
| Reset MFA / invite user | Live |
| Assign role | Live |
| View audit logs | Live — founder persistence audit |
| View aggregated analytics | Live with redaction |
| Generate anonymised report | Partial |
| Export pilot evidence pack | Live |

## Governance boundaries

Implemented in `services/orb_founder_analytics_foundation_service.py`:

1. **Role-based access** — `require_founder` on founder routes
2. **Admin actions audited** — founder persistence audit log
3. **Identifiers redacted by default** — `redact_founder_analytics_payload`
4. **No child-level records without authorisation** — documented boundary
5. **Operational admin separate from product analytics** — split between `/admin` and `/founder-os`

### Redacted fields (default)

`child_name`, `child_id`, `staff_name`, `staff_id`, `email`, `phone`, `address`, `body`, `transcript`, and pattern-matched identifiers.

## Product vs operational admin

| Layer | Audience | Data |
|-------|----------|------|
| Operational admin | Provider managers | Real users, homes, roles |
| Founder/product analytics | IndiCare founders | Anonymised aggregates only |
| ORB admin quality | Product team | Feedback patterns, no record bodies |

## Blockers

- Sector intelligence agent returns stub without live aggregates
- `provider_intelligence_routes` not mounted
- Unified Next.js admin console not built

## Next pass

1. Wire template usage aggregates to founder telemetry pipeline
2. Add home document processing status to founder dashboard
3. Mount or deprecate `founder_ai_routes`
4. Build Next.js admin console for user/home management
