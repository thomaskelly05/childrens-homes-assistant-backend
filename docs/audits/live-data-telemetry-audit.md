# Live Data and Telemetry Audit (Phase 9)

**Principle:** No fake metrics. Report only what code shows is genuinely connected.

---

## Live sources connected

| Source | Endpoint/table | Live when |
|--------|----------------|-----------|
| ORB usage events | `orb_usage_events` | DB + app running |
| ORB billing meter | `services/orb_billing_meter_service.py` | Stripe + usage recording active |
| AI usage audit | `ai_usage_audit` | AI calls made |
| Founder telemetry | `founder_os_telemetry_events` | Events POSTed to `/founder-os/telemetry/event` |
| Founder bootstrap summary | `build_telemetry_summary()` | DB connected |
| ORB analytics events | `POST /orb/standalone/analytics/event` | Client fires events |
| Stripe webhooks | `orb_stripe_events` | Stripe configured |
| ORB subscriptions | `orb_subscriptions` | After checkout |
| Feedback | `orb_feedback` | User submits |
| Quality Lab runs | `founder_os_records` type `quality_run` | Admin runs scenarios |

---

## Live sources missing or unavailable

| Source | Status |
|--------|--------|
| Live revenue (MRR) | **Only live when Stripe webhooks fire** — no revenue without billing |
| Live user count (public) | Not exposed to ORB users; founder bootstrap may show counts from DB |
| Real-time AI cost dashboard in ORB | **Partial** — meter exists; full dashboard in founder only |
| Provider-wide ORB analytics | **Not built** — individual subscription model |
| Chronology live data in standalone | **Correctly absent** — boundary enforced |
| HubSpot/CRM pipeline | **Not connected** in code reviewed |
| App Store analytics | N/A — web PWA only |

---

## Events currently captured

### ORB product (`orb_usage_events`, analytics)

- Conversation requests (metered)
- Token usage via billing meter
- Plan enforcement triggers
- Top-up checkout events

### Founder telemetry (sanitised)

From `founder_telemetry_db.py` schema:
- `event_type`, `category`, `source`, `route`, `user_role`, `session_id`, `metadata` (sanitised)

Bootstrap summary fields (`founder_bootstrap_service.py`):
- `totalEvents`, `eventsToday`, `orbConversations`, `topOrbModes`, `featureUsage`
- `aiRequests`, `estimatedAiCost`, `errors`, `feedbackCount`

### AI governance

- `ai_usage_audit` — per-request audit with metadata
- `indicare_ai_governance_events`
- `ai_privacy_events`

### Dictate/Voice/Report specific

| Event | Captured? |
|-------|-----------|
| Dictate transcribe | Via usage meter / AI audit — **not separate product event type verified** |
| Voice session start | Session store — **not in founder telemetry by default** |
| Report generation | Usage meter — **partial granularity** |
| Export | **Not verified as distinct telemetry event** |
| Template generate | Metered via AI audit |

---

## Events not captured (gaps)

1. **Export completed** — no dedicated event found
2. **Voice session duration** — session store only; not aggregated in founder summary
3. **Dictate → Write handoff success rate** — not instrumented
4. **Safety escalation triggered in UI** — brain-side only
5. **Onboarding funnel drop-off** — partial via auth events only
6. **Mobile vs desktop usage split** — not found
7. **Answer quality gate failures** — logged in service; not in founder telemetry aggregate

---

## Billing data liveness

| Data | Live? |
|------|-------|
| Stripe subscription status | **Yes** when configured |
| Trial status | **Yes** — `orb_trials` |
| Usage cap / spending cap | **Yes** — `orb_usage_preferences` |
| MRR/revenue | **Live from Stripe** — founder revenue page attempts server fetch |
| Forecast revenue | **Manual/forecast** — `/founder/revenue/forecast` — not live billing |

---

## What relies on forecasts/manual inputs

- Founder revenue forecast page
- Founder company scorecard (may mix live + manual — not fully audited)
- Evidence packs (founder-entered content)

---

## Recommended instrumentation gaps

| Priority | Event | Why |
|----------|-------|-----|
| High | `orb_dictate_completed` | Funnel conversion |
| High | `orb_write_exported` | Value proof |
| High | `orb_voice_session_ended` + duration | Feature adoption |
| High | `orb_onboarding_step` | Funnel diagnostics |
| Medium | `orb_quality_gate_blocked` | Safety monitoring |
| Medium | `orb_billing_checkout_started/completed` | Commercial funnel |
| Medium | `orb_safety_acceptance` | Compliance audit |
| Low | `orb_station_opened` | UX analytics |

---

## Verdict

Core **usage metering and AI cost audit are live** when the system runs with DB. **Founder telemetry is honestly structured** with sanitisation — empty summary when no events. **Product analytics granularity is thin** for dictate/voice/export funnels. **No fake metrics detected in code** — empty states return zeros (`EMPTY_TELEMETRY_SUMMARY`).
