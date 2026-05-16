# Realtime Replay Architecture

Canonical service: `services/realtime_replay_service.py`

Durable realtime replay now reads `operational_event_log`. The local realtime bus remains a delivery mechanism, not the enterprise replay source of truth.

## API

- `GET /api/realtime/replay`

## Guarantees

- Replay from cursor.
- Replay from timestamp.
- Provider/home/entity filters.
- Integrity checks inherited from operational memory replay.
- Checkpoint metadata for reconnect.

## Enterprise rule

Reconnect and replay flows must use `operational_event_log`, not process-local buffers. Local buffers may still support immediate delivery, but they are not authoritative.

## Remaining work

All publishers beyond lifecycle writeback must persist replayable operational events before emitting websocket notifications.
