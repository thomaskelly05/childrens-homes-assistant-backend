# ORB failure states

ORB failure copy is calm and safe. It never exposes raw 403, 404, 500, provider stack traces, OpenAI errors, demo fallback wording or backend details.

Handled states include internet offline, websocket failure, microphone denied, realtime provider unavailable, AI unavailable, retrieval blocked, child context missing, safeguarding retrieval denied, stale session and permission expired.

Safe copy lives in `services/orb_failure_state_service.py` and `frontend-next/lib/orb/errors/failure-copy.ts`.

