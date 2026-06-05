# ORB UI Route Preservation (v2 pass)

Date: 2026-06-05

This document confirms that the Premium Visual System v2 and ORB Write word processor upgrade did **not** remove or replace backend routes, panel IDs, or intelligence wiring.

## Frontend routes

| Route | Behaviour | v2 status |
|-------|-----------|-----------|
| `/orb` | Main shell + chat | Unchanged |
| `/orb?station=orb_dictate` | Dictate station | Unchanged |
| `/orb?station=write` / `orb_write` | ORB Write | Unchanged |
| `/orb?station=documents` | Documents & Guidance | Unchanged |
| `/orb?station=templates` | Templates | Unchanged |
| `/orb?station=saved` | Saved Outputs | Unchanged |
| `/orb?station=shift_builder` | Shift Builder | Unchanged |
| `/orb/login`, `/orb/billing`, `/orb/setup` | Auth/billing | Unchanged |

## API routes (preserved)

| Endpoint | Used by |
|----------|---------|
| `POST /orb/dictate/analyze` | Dictate analysis |
| `POST /orb/dictate/generate` | Dictate generate |
| `POST /orb/dictate/finalise` | Dictate finalise |
| `POST /orb/dictate/edit` | ORB Write AI panel, Dictate studio |
| Document upload/analyse | Documents panel |
| Template fetch/generate | Templates |
| Saved outputs CRUD | Saved Outputs |
| Chat stream | Chat home |
| Stripe billing | Billing modal |

## Panel IDs (preserved)

`orb_dictate`, `orb_write`, `orb_voice`, `documents`, `knowledge`, `templates`, `saved`, `shift_builder`, `review`, `inspection_readiness`, `safeguarding_thinking`, `record_properly`, `settings`, `billing`, `account`

## Intelligence governance (unchanged)

- IndiCare Intelligence Core — not bypassed
- No new AI brain created
- No internal brain metadata exposed in UI
- Redaction, audit, provider settings, privacy rules — unchanged
- Adult review / accept-reject-apply flows preserved

## Handoffs (unchanged)

- Dictate → ORB Write (`orb-write-session-handoff-v1`)
- Templates → Write / Dictate / Documents
- Saved Outputs → Write / Dictate

## Tests enforcing contract

- `orb-visual-regression-contract.test.ts`
- `orb-premium-visual-system-v2.test.ts`
- `orb-write-word-processor.test.ts`
- Existing `orb-write-standalone.test.ts`
