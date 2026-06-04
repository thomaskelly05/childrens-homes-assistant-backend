# IndiCare AI Trust and Data Protection Strategy

## Purpose

This document explains how IndiCare uses artificial intelligence in children's residential care software while protecting child and staff data. It is written for providers, investors, and partners reviewing our approach.

## What uses external AI

External AI (currently OpenAI, configurable) is used only when a provider explicitly enables it. Typical optional uses include:

- ORB assistant conversational drafting (streaming)
- Structured metadata wrapping after an answer is formed
- Optional report or risk drafting where enabled
- Dictation cleanup and voice-related hooks where configured
- Legacy document generation (`/documents/*`) and document AI review (`/document-ai/review`)
- AI meeting notes (transcription and drafting) when enabled
- Knowledge retrieval and ORB Knowledge Library embeddings (redacted, audited)

See also:

- `indicare-external-ai-route-inventory.md` — route-level inventory
- `indicare-legacy-ai-route-governance-audit.md` — convergence audit and risk register
- `indicare-embedding-data-protection-policy.md` — embedding-specific rules

## What does not use external AI

IndiCare's core care logic remains deterministic:

- Safeguarding threshold decisions (LADO, police, medical, legal) are **not** delegated to external models
- IndiCare Intelligence Core routing, gap detection, and regulatory framing
- Record storage, permissions, and chronology assembly
- Trusted statutory source registry (no open-web scraping)

## What data is sent

When external AI is enabled, IndiCare sends **minimised, redacted** text required for the specific feature. Context is trimmed to what the task needs. Child identifiers are removed or tokenised before outbound calls where redaction applies.

## What data is redacted

Before external processing, IndiCare applies automated redaction for:

- Names, dates of birth, contact details
- NHS numbers, postcodes, addresses
- School and family references
- Additional safeguarding-sensitive phrasing in strict modes

Automated redaction is not perfect; staff must still review drafts before records are finalised.

## Prompt and transcript storage

**Default: off.** Prompts and voice transcripts are not stored for model training or analytics unless a provider explicitly enables storage flags. Usage audits record metadata (feature, model, redaction mode, estimates) not full conversation text.

## No-training expectation

IndiCare configures providers with a **no training on customer data** expectation (`no_training_required=True` on every privacy decision). Contractual sub-processor terms must match provider configuration.

## Provider controls

Providers can control (via environment today; admin API planned):

- Whether external AI is enabled at all
- Redaction strictness
- Which features may call external models
- Whether prompts or transcripts may be stored
- Realtime voice and report drafting toggles

## Human review

All AI-generated care content is **draft-only**. Managers and registered staff must review, edit, and sign off before records become authoritative. High-risk outputs require explicit human accountability.

## Trusted sources and local policy

ORB cites only sources listed in the governed registry. Statutory gold sources may be checked automatically but are **not** auto-applied to care records. Local safeguarding boards and provider policies require upload and human approval.

## Roadmap alignment

See `indicare-model-independence-roadmap.md` for provider portability and `indicare-ai-subprocessor-and-provider-policy.md` for vendor management.
