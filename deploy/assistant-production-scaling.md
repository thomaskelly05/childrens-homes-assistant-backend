# IndiCare Assistant Production Scaling Plan

This document defines the operational hardening path for the unified `/assistant` runtime.

## Runtime services

### Backend API
- Run at least 2 API replicas in production.
- Use rolling deploys with health checks enabled.
- Keep database pool sizing below PostgreSQL connection limits.
- Set request timeout defaults for streamed responses and realtime health checks.

Recommended environment:

```env
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_STATEMENT_TIMEOUT_MS=15000
DB_IDLE_TX_TIMEOUT_MS=15000
OPENAI_API_KEY=required
INDICARE_REALTIME_MODEL=gpt-4o-realtime-preview
INDICARE_REALTIME_VOICE=shimmer
```

### Next frontend
- Serve `frontend-next` separately from the FastAPI API where possible.
- Cache static assets aggressively.
- Do not cache assistant stream responses.
- Use `NEXT_PUBLIC_API_BASE_URL` for backend routing.
- Use `NEXT_PUBLIC_OPENAI_REALTIME_WS_URL` only when a secure backend realtime websocket proxy is available.

Recommended environment:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.indicare.example
NEXT_PUBLIC_OPENAI_REALTIME_WS_URL=wss://api.indicare.example/assistant/realtime/ws
```

## Autoscaling policy

Scale backend API on:
- CPU > 65% for 5 minutes
- memory > 75% for 5 minutes
- p95 request latency > 1200ms
- active realtime connections > 70% of safe per-instance capacity

Scale frontend on:
- CPU > 60%
- p95 page response latency > 800ms
- edge cache miss pressure

## Realtime connection capacity

Track:
- active assistant streams
- active realtime voice sessions
- stream duration
- interrupted streams
- reconnect attempts
- websocket disconnects

Suggested safe starting limit:
- 50 active realtime voice sessions per backend instance
- 150 active text streams per backend instance

Tune only after load testing.

## CDN/runtime optimisation

Cache:
- Next static assets
- CSS/JS chunks
- images
- fonts loaded by the app

Never cache:
- `/assistant/general/stream`
- `/assistant/realtime/*`
- `/assistant/conversations*`
- authenticated API responses

## Deployment health checks

Required checks:
- `/health` or equivalent platform health endpoint
- `/assistant/realtime/health`
- `/assistant/realtime/config`
- database connectivity check
- OpenAI configuration presence check

## Rollback criteria

Rollback if:
- assistant stream error rate > 3% for 10 minutes
- websocket disconnect rate doubles baseline
- p95 assistant response latency exceeds 5 seconds
- database connection exhaustion appears
- user login/session errors increase after deploy

## Production readiness gate

Before full launch:
- load test 100 concurrent text users
- load test 25 concurrent voice users
- verify conversation persistence across reloads
- verify rollback path
- verify telemetry visibility
- verify OpenAI key rotation procedure
- verify database backup and restore
