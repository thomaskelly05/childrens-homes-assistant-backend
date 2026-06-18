# ORB Data Safety and Privacy

## Standalone boundary

Standalone ORB (`/orb`) does **not** access:

- Child / young person records
- Home operational data
- Staff records
- Chronology or care records

Subscription to ORB Residential does **not** grant IndiCare OS access.

## Safety acceptance (version `2026-05-29-v1`)

Users must accept before full ORB use:

1. ORB supports professional thinking; does not replace safeguarding procedures
2. Standalone ORB does not access IndiCare OS records
3. Avoid unnecessary identifiable personal details
4. Saved outputs and feedback may improve ORB quality safely

## Usage limits

Fair-use limits apply per plan. Hard limits return a friendly message; urgent safeguarding prompts receive a short safety template instead of a dead-end.

## Feedback

Answer feedback is stored for admin quality review — not linked to OS child records.

## Web Voice transcription (June 2026)

On Safari and Firefox, ORB Voice may use **server-assisted transcription** when browser speech recognition is unreliable:

- Short audio may be processed **transiently** for transcription (realtime WebRTC or brief upload).
- Raw audio is **not stored** by ORB after processing.
- Transcripts are **not saved** unless the adult explicitly saves or exports.
- Intelligence and playback remain separate: `POST /orb/standalone/conversation` (text) and `POST /orb/voice/tts` (spoken reply text only).

iOS Voice continues to use on-device speech recognition; no microphone audio is sent to the backend for STT on iOS.
