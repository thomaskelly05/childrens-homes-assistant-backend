# Orb production realtime architecture

Orb remains a minimal WebRTC-first voice surface. The production hardening layer adds shared state, scoped realtime delivery, websocket lifecycle management, provider failover, and privacy-safe observability.

## Runtime architecture

- `frontend-next`: Orb UI, microphone permission, WebRTC negotiation, audio recovery, mobile reconnect/offline handling.
- API backend: `/orb/*` HTTP routes, session lifecycle, care-context routing, RBAC/home checks, audit.
- Orb realtime gateway: `/orb/realtime/ws` for scoped event multiplexing, heartbeat, duplicate socket cleanup, reconnect orchestration.
- Redis: preferred shared session store, realtime state store, socket binding registry, pub/sub event bus.
- Postgres: fallback shared Orb session/realtime state when Redis is unavailable.
- OpenAI Realtime: ephemeral session provider. Browser receives only short-lived client secrets.
- Observability service: privacy-safe metrics for reconnects, latency, stuck states, websocket disconnects, and provider health.

## Required environment variables

- `DATABASE_URL`: Postgres connection string.
- `OPENAI_API_KEY`: server-only OpenAI key. Never expose to `frontend-next`.
- `ORB_REALTIME_ENABLED`: `true` to issue OpenAI Realtime ephemeral sessions.
- `ORB_VOICE_PROVIDER`: `openai`, `openai_realtime`, or `mock`.
- `ORB_REALTIME_MODEL` or `INDICARE_REALTIME_MODEL`: realtime model name.
- `ORB_DEFAULT_VOICE` or `INDICARE_REALTIME_VOICE`: allowed voice, for example `shimmer`.
- `REDIS_URL` or `ORB_REDIS_URL`: Redis URL for shared state and pub/sub.
- `ORB_SESSION_STORE_BACKEND`: optional override: `redis`, `postgres`, or `memory`.
- `ORB_SESSION_TTL_SECONDS`: session expiry TTL, minimum 300.
- `ORB_WEBSOCKET_HEARTBEAT_SECONDS`: heartbeat cadence.
- `ORB_WEBSOCKET_BINDING_TTL_SECONDS`: socket binding TTL.
- `ORB_RECONNECT_GRACE_SECONDS`: reconnect grace window.
- `ORB_WEBSOCKET_RATE_LIMIT`: websocket request throttle.
- `ORB_EVENT_DEDUPE_SECONDS`: realtime bus dedupe window.
- `ORB_EVENT_THROTTLE_WINDOW_SECONDS` and `ORB_EVENT_THROTTLE_LIMIT`: safe event throttling.
- `ORB_PROVIDER_FAILURE_THRESHOLD`: failures before provider circuit breaker opens.
- `ORB_PROVIDER_CIRCUIT_SECONDS`: provider circuit breaker cool-down.
- `ORB_RECONNECT_STORM_THRESHOLD`: reconnect attempts counted as a storm.
- `ORB_WORKER_ID`: optional stable worker label for metrics.

## Load balancer and websocket requirements

- HTTPS is required for microphone capture, secure cookies, and websocket upgrade security.
- Preserve `Upgrade` and `Connection` headers for `/orb/realtime/ws`.
- Idle websocket timeout should exceed `ORB_WEBSOCKET_HEARTBEAT_SECONDS` by at least 2x.
- Sticky sessions are recommended for lower latency, but Redis/Postgres shared state prevents correctness from depending on stickiness.
- Do not terminate or inspect raw audio in the backend; WebRTC media goes browser-to-provider with ephemeral credentials.

## Security guarantees

- Session access is bound to authenticated assistant permission.
- Session owner, home scope, and selected child scope are validated on websocket bind and subscription.
- Redis/pub-sub channels are home-scoped; no global Orb event channel is used.
- Reconnect uses fresh ephemeral provider sessions and cannot reuse stale server sessions after expiry.
- Metrics redact prompts, transcripts, raw audio, and identifiable child data.

## Health and metrics endpoints

- `GET /orb/health`: session store, provider, reconnect, stuck-state health.
- `GET /orb/realtime/metrics`: privacy-safe counters and latency summaries.
- `GET /orb/provider/status`: OpenAI realtime availability, fallback state, retry backoff.

All endpoints require assistant access.

## Remaining placeholders

- Redis pub/sub fan-out is ready for websocket workers, but background Redis subscription workers should be added to each production websocket worker process.
- Browser matrix validation still needs real devices for iPhone Safari, Android Chrome, AirPods, Bluetooth headset switching, weak Wi-Fi, and cellular/Wi-Fi handoff.
- Production dashboards should consume `/orb/realtime/metrics`; the app intentionally does not add a noisy user-facing dashboard.
- Long-term transcript retention remains governed by existing Orb preferences and downstream record/audit storage policy.
