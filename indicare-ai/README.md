# IndiCare.ai

A standalone immersive AI-native professional workspace for residential childcare.

IndiCare.ai is separate from IndiCare OS.

IndiCare OS is the system of record.
IndiCare.ai is the professional intelligence environment.

## Product model

- Assistant: ChatGPT-style professional support
- Connect: Microsoft Teams-style collaboration
- I-Notes: Beam/Magic Notes-style capture and transformation
- Docs: Pages/Docs-style AI writing workspace
- Intelligence: immersive voice-first operational reasoning, inspired by Grok-style conversational AI

## Local development

Create a `.env` file from `.env.example`, then run:

```bash
npm install
npm run dev
```

## Backend connection

The app expects the IndiCare backend to expose:

- `/assistant/general/stream`
- `/assistant/general-safe`
- `/auth/check`
- `/auth/login`
- operational record APIs from IndiCare OS

Use `VITE_INDICARE_API_BASE` to point the standalone app at the backend.
