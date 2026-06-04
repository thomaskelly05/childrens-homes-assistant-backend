# IndiCare Intelligence ORB UI/UX parity

## Entry points audited

| Entry | Core path | Staff UX |
|-------|-----------|----------|
| Text chat | `/orb/standalone/conversation` (+ stream) | Primary answer first; intelligence behind progressive disclosure |
| Streaming | SSE metadata includes `context_used.indicare_intelligence_core` | Same as text |
| Voice input | Transcript → `sendMessage` (same API) | Review before send when depth is `residential_deep` or `safeguarding_critical` |
| Dictate | `/orb/dictate/generate` with Core prompt | Quality/missingness in dictate studio |
| Wake / continuous | Browser voice runtime → transcript | Same review rules as voice |
| Spoken replies | `voice.speak` on final quality-gated answer | Blocked in privacy/low-sensory/safeguarding-critical |
| Record This Properly mode | Mode + Core depth | CTA when recording-related |
| Safeguarding Thinking | Mode forces depth | No auto-spoken playback by default |
| Manager Copilot / RI | Expanded intelligence drawer | Manager oversight CTA |
| Action buttons | `/orb/standalone/actions/run` | Core on care-related actions |
| Feedback | `/orb/standalone/feedback` | Unchanged; can attach Core metadata later |

## Frontend contract

- Prefer `context_used.indicare_intelligence_core`, then `indicare_intelligence`, then legacy `expert_brain_9`.
- Helper: `frontend-next/lib/orb/indicare-intelligence-core.ts`
- Panel: `OrbIntelligenceCorePanel` — collapsed **What ORB checked**; technical drawer for managers/RIs only.
- CTAs: **Record this properly**, **Manager oversight view** when depth/risk warrants.

## Missing evidence chips

Surfaced from Core `gaps` / `missingness_graph` when present, including:

- Child voice, manager review, chronology, risk assessment update, care plan update
- Social worker notification, LADO consideration, return home interview
- Exploitation indicators, Reg 40, Reg 44/45 action

## Voice / dictation rules

1. Submitted transcript = typed message for Core and quality gate.
2. Auto-send paused for `residential_deep` and `safeguarding_critical` (client estimate + server depth).
3. Spoken replies use the same final answer as text; blocked when voice replies off, low-sensory mode, safeguarding-critical depth, or urgent safeguarding banner.

## Accessibility / shift use

- Progressive disclosure for intelligence (not shown by default to all staff).
- Practical next steps remain in the main answer.
- Transcript review encouraged before send on high-risk voice input.

## Tests

- `tests/test_indicare_orb_frontend_core_metadata.py`
- `tests/test_indicare_voice_dictation_intelligence_parity.py`
- `tests/test_orb_premium_ux_contract.py`
- `tests/test_orb_voice_transcript_reply_visibility.py`

## Premium UX polish (June 2026)

- **Composer copyright:** `OrbComposerCopyright` under residential composer — professional judgement line, not repeated banners.
- **Action chips:** `buildIntelligenceContextActionChips` uses `expert_depth`; general answers stay light; care answers show recording/safeguarding/Ofsted chips.
- **What ORB checked:** Collapsed default; summary chips when expanded; missing evidence only when gaps exist; manager debug drawer role-gated.
- **Voice reply visibility:** `assistantReply` from chat now rendered in `OrbVoiceStation` (`data-orb-voice-reply`) — previously passed but not displayed. See `docs/orb-voice-transcript-reply-audit.md`.
- **Micro-status:** `OrbIntelligenceMicroStatus` during residential+ streaming; none for `general_light`.
- **Workspace layout:** `OrbPremiumWorkspaceLayout` for practice panels (one-screen starting states).
- **Templates:** Card grid with featured sorting.
- **Documents:** Upload / lens / output section markers.

All routes and Core metadata paths unchanged.
