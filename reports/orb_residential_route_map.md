# ORB Residential Route Map

Route integrity audit for ORB Residential record-generation and conversation surfaces.

**Canonical finalizer:** `services/orb_residential_finalization_service.py::finalize_orb_residential_answer`

## Risk summary

- Green: 10
- Amber: 3
- Red: 1

## Routes

### `POST /orb/standalone/conversation` — **green**
- Frontend: frontend-next/lib/orb/standalone-client.ts (sendStandaloneOrbMessage)
- Handler: routers/orb_standalone_routes.py::standalone_orb_conversation
- Service: orb_converged_general_assistant_service → finalize_orb_residential_answer
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired

### `POST /orb/standalone/conversation/stream` — **green**
- Frontend: frontend-next/lib/orb/standalone-client.ts (sendStandaloneOrbMessageStream) → orb-care-companion.tsx
- Handler: routers/orb_standalone_routes.py::standalone_orb_conversation_stream
- Service: orb_converged_general_assistant_service.stream_answer → finalize_orb_residential_answer (metadata event)
- Streaming: True
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired (metadata replaces raw stream)
- Notes: Fixed: frontend resolveOrbStreamedAnswer now prefers repaired metadata; onMetadata swaps repaired text.

### `POST /orb/residential/conversation` — **green**
- Frontend: none (premium API alias; /orb uses standalone routes)
- Handler: routers/orb_residential_premium_routes.py::orb_residential_conversation
- Service: orb_converged_general_assistant_service → finalize_orb_residential_answer
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired
- Notes: Fixed in this pass — previously bypassed finalization.

### `POST /orb/dictate/generate` — **green**
- Frontend: frontend-next/lib/orb/dictate/orb-dictate-client.ts → orb-dictate-station.tsx, orb-write-standalone-panel.tsx
- Handler: routers/orb_dictate_routes.py::dictate_generate
- Service: generate_dictate_note → _finalize_dictate_text → finalize_orb_residential_answer
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired (professional_note)
- Notes: Fixed source_text pass-through for record-generation detection.

### `POST /orb/dictate/finalise` — **green**
- Frontend: orb-dictate-client.ts
- Handler: routers/orb_dictate_routes.py::dictate_finalise
- Service: finalise_dictate_document → generate_dictate_note
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired

### `POST /orb/dictate/prepare-write` — **green**
- Frontend: orb-write-standalone-panel.tsx
- Handler: routers/orb_dictate_routes.py::dictate_prepare_write
- Service: prepare_write_document → _finalize_dictate_text
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired

### `POST /orb/dictate/edit` — **green**
- Frontend: orb-dictate-studio.tsx
- Handler: routers/orb_dictate_routes.py::dictate_edit
- Service: edit_dictate_document → _finalize_dictate_text
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired (revised_text)

### `POST /orb/dictate/analyze` — **green**
- Frontend: orb-dictate-station.tsx
- Handler: routers/orb_dictate_routes.py::dictate_analyze
- Service: analyze_dictate_session → _finalize_dictate_text (analysis path)
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired where text returned

### `POST /orb/standalone/actions/run` — **green**
- Frontend: orb-care-companion.tsx (action chips)
- Handler: routers/orb_standalone_routes.py::standalone_orb_action_run
- Service: orb_action_engine_service.run_action → finalize_standalone_intelligence
- Streaming: False
- Final repair: conditional (care-related actions)
- sanitize_live_record_output: conditional
- Displayed answer: repaired for care actions

### `POST /orb/standalone/shift-builder/generate` — **amber**
- Frontend: frontend-next/lib/orb/shift-builder.ts
- Handler: routers/orb_shift_builder_routes.py::shift_builder_generate
- Service: orb_shift_builder_service → orb_action_engine_service (finalize via action engine)
- Streaming: False
- Final repair: conditional
- sanitize_live_record_output: conditional
- Displayed answer: repaired when care action path
- Notes: Uses action engine finalization; shift plan sections may need dedicated record repair audit.

### `Voice → Chat handoff` — **green**
- Frontend: orb-voice-station.tsx onSendToOrb → sendMessage
- Handler: POST /orb/standalone/conversation/stream
- Service: same as chat stream
- Streaming: True
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired

### `Voice realtime WebSocket` — **amber**
- Frontend: orb-realtime-voice-client.ts
- Handler: WS /orb/voice/ws/{session_id}
- Service: orb_voice_realtime_ws_handler (provider realtime)
- Streaming: True
- Final repair: False
- sanitize_live_record_output: False
- Displayed answer: raw realtime (handoff to Dictate/Chat for records)
- Notes: Realtime session defers record finalization to Dictate/Chat handoff paths.

### `POST /orb/conversation (legacy)` — **red**
- Frontend: orb-standalone-chat.tsx (legacy, not /orb route)
- Handler: routers/orb_routes.py::orb_conversation
- Service: orb_general_assistant_service (no residential finalizer)
- Streaming: False
- Final repair: False
- sanitize_live_record_output: False
- Displayed answer: raw
- Notes: Legacy OS-linked route; not used by ORB Residential /orb shell.

### `POST /assistant/orb/conversation` — **amber**
- Frontend: OS operational surfaces (not ORB Residential)
- Handler: routers/orb_operational_routes.py
- Service: orb_operational_assistant_service → finalize_standalone_intelligence
- Streaming: False
- Final repair: True
- sanitize_live_record_output: conditional
- Displayed answer: repaired
- Notes: OS-linked operational ORB — separate product surface.

## Bypass paths

### stream-frontend-partial-preference (production-critical) — **fixed**
- Frontend preferred longer raw SSE partial over repaired metadata.answer
- Fix: resolveOrbStreamedAnswer + standalone-client.ts + onMetadata replacement

### residential-premium-no-finalize (quality-critical) — **fixed**
- POST /orb/residential/conversation skipped finalize_orb_residential_answer
- Fix: orb_residential_premium_routes.py

### dictate-source-text (production-critical) — **fixed**
- Dictate finalization used generated document as user_input, skipping record repair
- Fix: source_text parameter on finalize_document_intelligence

### voice-realtime-raw (quality-critical) — **open**
- WebSocket realtime voice returns unrepaired provider text in-session
- Mitigation: Record outputs hand off to Dictate/Chat which repair

### legacy-orb-conversation (dead code) — **open**
- POST /orb/conversation lacks residential finalization
- Mitigation: Not mounted by ORB Residential frontend
