# ORB Voice Audit (Phase 5)

**Audit date:** 10 June 2026  
**Canonical API:** `routers/orb_voice_residential_routes.py` (`/orb/voice`)  
**UI:** `components/orb-standalone/orb-voice-station.tsx`

---

## Route inventory

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/orb/voice/session/status` | Session health | Production |
| POST | `/orb/voice/realtime/session` | Create realtime session | Production |
| POST | `/orb/voice/session` | Create session (alias) | Production |
| WS | `/orb/voice/ws/{session_id}` | Realtime WebSocket | Production |
| POST | `/orb/voice/webrtc/offer/{session_id}` | WebRTC SDP offer | **Not implemented** |
| POST | `/orb/voice/webrtc/ice/{session_id}` | ICE candidates | **Not implemented** |
| POST | `/orb/voice/transcribe` | Browser STT fallback | Production |
| POST | `/orb/voice/speak` | TTS response | Production |
| GET | `/orb/voice/provider-status` | Provider availability | Production |

Legacy overlap: `routers/orb_routes.py` at `/orb` still mounts older realtime endpoints.

---

## Session and microphone flow

1. User opens `?station=orb_voice` or mic deep link `?mic=voice`
2. Auth + billing + safety gates must pass
3. `Start voice` unlocks audio context (mobile: tap-to-hear pattern)
4. Session created via `POST /orb/voice/realtime/session`
5. WebSocket connection for turn-taking OR browser transcribe → speak loop
6. Transcript turns accumulated in session store (`services/orb_session_store.py`)
7. Optional save to saved outputs

**Mobile:** `orb-voice-mobile-experience.tsx` — dedicated layout, speech energy visualisation.

---

## Transcript handling

- Turn-based transcript in session store (PostgreSQL-backed)
- `test_orb_voice_transcript_turns.py` — 4 tests
- Save to saved outputs tested (`save voice transcript to saved outputs` — frontend test passes)
- Cross-user/cross-home rejection tests exist (fail without DB in audit env)

---

## Real-time response behaviour

- Brain responses routed through `orb_voice_session_service` → standalone brain
- Context continuity: `test_runtime_presence_continuity_keeps_accessibility_and_unresolved_topics` (DB-dependent)
- Interruption support: `test_orb_interruptions.py`
- Early status streaming markers tested for chat; voice uses turn model

---

## Latency

- Not measured in this audit (no live API keys)
- Architecture: WS primary path; transcribe+speak fallback adds round-trips
- `test_orb_chat_speed_contract.py` exists for text; no equivalent voice SLA test

---

## Voice UI and ORB visual

| Element | Status |
|---------|--------|
| Hero stage | Present — `orb-voice-hero-stage.tsx` |
| Living companion orb | Present — animation via speech energy hook |
| Launch controls | Present — `orb-voice-launch-controls.tsx` |
| Profiles | Present — premium voice profiles |
| Glass orb marks | **Contract test failing** — theme runtime test |
| Post-session UX | **Partial** — test expects cleaner Dictate handoff copy |

---

## Privacy and safeguarding

| Control | Status |
|---------|--------|
| Auth required | Yes — `require_orb_residential_auth` |
| Billing gate | Yes |
| TTS safeguarding block | `test_speak_blocks_safeguarding_critical_auto_speech` — logic present |
| WebSocket auth | `test_orb_websocket_auth_security.py` — 9 tests |
| No raw prompt logging | AI governance tests |
| Privacy notice in UI | Present in safety acceptance flow |
| Safeguarding disclaimer | Operating brain + safety modal |

---

## Fallback behaviour

| Failure | Fallback |
|---------|----------|
| WebRTC unavailable | WS + browser STT/TTS |
| Provider down | `provider-status` endpoint; mock provider in dev |
| Mic denied | Error state in UI |
| Session expired | Re-auth required |
| Network drop | Reconnect tested (`test_orb_realtime_reconnect.py`) |

---

## Errors

- Session status endpoint for health checks
- Cross-user access → 401/403
- Provider status surfaced to UI
- Frontend contract test: `ORB OpenAI realtime voice response flow` — **failing**

---

## Mobile usability

- Dedicated mobile experience component
- Audio unlock on user gesture (required by browsers)
- Passkey mobile E2E exists
- Viewport tests pass
- Voice station unlock test: **failing** ("Tap to hear ORB")

---

## Brain connection

**Is ORB Voice connected to IndiCare Intelligence properly?**

**Yes.** `services/orb_voice_session_service.py` routes through standalone brain without OS retrieval (`test_standalone_orb_answers_general_questions_without_os_retrieval` — intent verified; fails without DB).

Same brain stack as chat/dictate/write:
- `indicare_intelligence_core_service`
- Expert depth selection including `safeguarding_critical`
- Static sector knowledge without OS records

---

## Specialist behaviour

**Does it behave like a residential specialist?**

**Architecturally yes** — same brain, modes, safeguarding terms. **Live conversational quality unverified** without API inference. Voice may produce shorter responses than chat due to TTS constraints.

---

## Demo and launch readiness

| Question | Answer |
|----------|--------|
| Demo-ready? | **Partial** — use text-first demo; voice as secondary; avoid WebRTC |
| Launch-ready? | **Not yet** — WebRTC stub, 21 frontend contract failures include voice, no latency SLA |
| Standout improvements | 1) Reliable mobile audio unlock 2) Post-voice→Dictate handoff 3) Offline transcript queue 4) Voice-specific safeguarding TTS policy UX 5) Latency metrics |

---

## Verdict

ORB Voice is **substantially built** with correct brain routing, security controls, and mobile layouts. **WebRTC is not implemented.** **Frontend polish and realtime flow contract tests are failing.** Recommend **soft launch** as beta feature behind clear "preview" labelling until voice E2E passes consistently.
