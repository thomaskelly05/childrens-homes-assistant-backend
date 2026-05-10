# IndiCare AI Suite Frontend Boundary

This folder is the isolated frontend product surface for `app.indicare.co.uk/assistant`.

## Product boundary

The AI Suite is a standalone AI-native workspace. It includes:

- IndiCare AI conversational assistant
- I-Notes
- IndiCare Docs
- IndiCare Connect
- IndiCare Mail
- Voice companion
- Memory and continuity UI
- Conversational runtime, streaming and CGI presence

It must not import or visually present IndiCare OS record-management surfaces.

## Not allowed in AI Suite UI

Do not add these to `/assistant` or this folder:

- care record dashboards
- chronology record grids
- medication or incident record forms
- young person record modules
- OS operational tiles
- ClearCare-style workflow screens
- compliance dashboards intended for the OS

Those belong in the separate IndiCare OS frontend.

## Allowed shared layers

The AI Suite may share backend services with the OS:

- authentication
- permissions
- memory
- AI orchestration
- voice infrastructure
- reasoning services
- search/retrieval APIs

Shared intelligence is allowed. Shared OS UI is not.

## Design target

The AI Suite should feel like ChatGPT, Grok, Claude or Perplexity: conversational, immersive, minimal, voice-first and app-capability led.

The OS should feel like structured care-management software. Keep those products separate.
