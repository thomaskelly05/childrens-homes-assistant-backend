# ORB Residential — AI and Data Use (Provider Trust Document)

**Status:** Draft for legal review. Wording reflects current product design; provider configuration may vary.

## AI features

ORB may use external AI providers (e.g. OpenAI) when **enabled by provider settings** and acknowledged by an administrator. Features include:

- Conversational assistance (chat)
- Dictate transcription and document generation
- Voice synthesis and realtime sessions (where configured)
- Document analysis, comparison, and briefing
- Template-assisted writing

## Governance

- External AI is **off by default** for new provider configurations
- Calls route through an internal governance gateway
- **Redaction** is applied before external calls when enabled
- **Human review** is required for operational outputs — ORB does not replace professional judgement
- Usage is recorded with **safe metadata** (feature, token estimates, outcome) — not raw prompts by default

## What is processed

When you use AI features, the system may process:

- Text you type or paste (messages, transcripts, document text)
- Document files you upload (within size/type limits)
- Session and subscription metadata
- Technical logs (errors, latency, rate limits)

## What is not stored by default

- Raw prompts and model responses (unless provider explicitly enables prompt storage)
- Full transcripts (unless provider explicitly enables transcript storage)
- Child profile data in standalone ORB (standalone product does not include OS child records)

## Provider controls

Administrators can configure (subject to role permissions):

- Enable/disable external AI
- Redaction mode
- Prompt/transcript storage toggles
- Allowed AI features
- Premium TTS external provider
- Data retention days

Changes are **audited**.

## Limitations

AI outputs may be inaccurate or incomplete. Providers must maintain safeguarding procedures independent of ORB.
