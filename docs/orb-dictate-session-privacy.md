# ORB Dictate Session Privacy

## Session-only transcript

Audio and transcript remain session-based until the adult explicitly saves or exports. ORB Dictate does not silently submit records.

## No child profile data

- No child profile selector in Dictate
- No child profile persistence in Dictate session storage
- No biometric child voice identification — speaker labels are adult self-declaration only ("My name is Tom")

## Privacy banner

Displayed in Dictate top bar:

> No child profile data is stored in ORB Dictate. Audio and transcript remain session-based until saved/exported by the adult.

## Safety copy

- Review required before saving or exporting.
- ORB supports professional judgement. It does not replace it.
- Adult remains responsible for the final record.

## GDPR / governance

- `AIPrivacyDecision`, redaction and audit flow through `ai_external_call_governance` on generate/edit/finalise routes.
- `brain_metadata` is internal — not shown to normal users in Dictate or Write UI.
- Standalone boundary: ORB Dictate does not submit to IndiCare OS unless an approved connected workflow is used separately.

## Handoff storage

- Dictate → Write uses `sessionStorage` (`orb-write-session-handoff-v1`) — cleared when browser session ends.
- Panel layout preference uses `localStorage` (`orb-dictate-panel-layout-v1`) — layout only, no transcript.
- Draft save uses ORB Saved Outputs when adult clicks Save — not automatic.
