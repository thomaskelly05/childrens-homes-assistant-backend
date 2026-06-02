# ORB product architecture

Internal reference for how ORB Residential is structured in the frontend and backend.

## ORB is the AI copilot

ORB is the AI copilot for children's residential care. It helps staff think, record, review and prepare professionally — without replacing judgement or accessing IndiCare OS records from the standalone product.

## Chat is the central brain

The main chat surface is the default home. Conversation history, projects, citations and follow-ups all radiate from chat. Other apps are focused modes that reuse the same account, theme, composer patterns and saved outputs.

## Apps (focused modes)

| App | Purpose |
|-----|---------|
| **Chat** | General professional Q&A and drafting |
| **Dictate** | Speech-to-text recording and professional note generation |
| **Voice** | Live duplex conversation with ORB |
| **Review** | Therapeutic and compliance quality review of written practice |
| **Skills** | Guided workflows for common residential tasks |
| **Templates** | Structured document starters |
| **Library** | Knowledge and regulation sources |
| **Documents** | Upload and paste for document intelligence |
| **Saved outputs** | Artefacts saved from chat and apps |

## Shared systems

These cut across every app:

- **Theme** — `data-orb-appearance` + `data-orb-theme` (system / light / dark)
- **Modal / panel shell** — centred or side panels with consistent header and close
- **Composer** — chat input, attachments, mic routing
- **Account** — plan, profile, sign-in state
- **Settings** — appearance, personalisation, voice, privacy
- **Saved outputs** — persistence and reuse
- **Debug flight recorder** — `debugVoice=1` only; never shown in normal UI

## Mode definitions

- **Dictate** = speech-to-text recording (and note generation), not live conversation.
- **Voice** = live conversation (OpenAI Realtime WebRTC or WebSocket when configured).
- **Review** = therapeutic / compliance quality review of pasted or drafted text.
- **Library** = knowledge and regulation browsing.
- **Templates** = structured documents by category.
- **Skills** = guided workflows with clear steps.

## Voice transport (implementation note)

1. `GET /orb/voice/session/status` — configuration probe (no session).
2. `POST /orb/voice/realtime/session` — ephemeral client secret / WebSocket URL.
3. Browser WebRTC negotiates with OpenAI using the client secret (see `lib/orb/network`).
4. UI shows **live** only when peer, data channel, or remote audio track is active — not when the session endpoint alone returns 200.
