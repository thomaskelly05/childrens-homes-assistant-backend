# Standalone ORB send feedback and error flow

## Problem (before fix)

On `/orb`, pressing send could trigger `POST /orb/standalone/conversation` and receive `403 csrf_blocked` while the UI showed no user bubble, no thinking state, and no inline error. The composer looked dead because:

1. **Empty-state gate** — The thread only rendered when `visibleMessages.length > 0`. Errors lived inside that branch, so a failed first send with no persisted messages hid all feedback.
2. **No in-thread placeholders** — `pending` toggled a small “Thinking…” line, but there was no assistant `thinking` message in chat state; failures only set top-level `error` state, easy to miss.
3. **CSRF pre-check** — When `csrfReady` was false, send returned early without optimistic messages.

## Current flow

### Optimistic send (`orb-care-companion.tsx`)

When `finalText` is non-empty (or images attached):

1. Append **user** message immediately (`status: 'sent'`, local id).
2. Append **assistant** placeholder (`status: 'thinking'`, label “ORB is thinking…”).
3. Clear composer (`setMessage('')`, clear attachments).
4. `setPending(true)`, `lastSendStatus: 'sending'`.
5. Call `queryStandaloneOrbConversation` (standalone client, CSRF headers preserved).

### Success

- Replace the thinking placeholder with assistant content (`status: 'complete'`).
- Backend metadata `standalone: true`, `os_records_accessed: false` remains in API response (client normalises in `standalone-client.ts`).
- Empty answer → `STANDALONE_ORB_EMPTY_ANSWER_MESSAGE`.

### Failure

- User message stays in the thread.
- Thinking placeholder becomes an error assistant bubble (`status: 'error'`).
- `error` state + `retryPayload` for composer-level banner when no inline error bubble.
- Mapped copy via `parseStandaloneOrbSendError()`:
  - **403 csrf** → “Your session security check failed. Please refresh and try again.”
  - **401** → session expired copy
  - **Network** → connection copy
  - **Generic** → `STANDALONE_ORB_SEND_RETRY_MESSAGE`

### Retry

- **Retry** resends the same text; does not duplicate the user row.
- Strips trailing `thinking` / `error` placeholders, inserts fresh thinking, calls `refreshSession()` before POST for a fresh CSRF cookie.

## UI markers

| Marker | Purpose |
|--------|---------|
| `data-testid="orb-message-user"` | User bubble |
| `data-testid="orb-message-assistant"` | Completed assistant reply |
| `data-testid="orb-message-thinking"` | Thinking placeholder |
| `data-testid="orb-message-error"` | Inline error bubble |
| `data-testid="orb-message-retry"` | Retry control |
| `data-testid="orb-send-error"` | Fallback error when not inlined |
| `data-pending` / `data-last-send-status` | Composer send state |

## Files

- `frontend-next/components/orb-standalone/orb-care-companion.tsx` — send orchestration and thread rendering
- `frontend-next/components/orb-standalone/orb-standalone-composer.tsx` — composer markers
- `frontend-next/lib/orb/standalone-client.ts` — structured errors, CSRF mapping
- `frontend-next/lib/orb/standalone-local-store.ts` — message status types

## Out of scope

- `/assistant/orb` operational ORB (unchanged)
- CSRF middleware remains enabled; this change only makes failures visible
