# ORB Premium UX Polish — Implementation Summary

June 2026 polish pass for ORB Residential standalone (`/orb`). **IndiCare Intelligence Core brain unchanged.** All existing routes preserved.

## What changed

### Shared premium workspace

- **`OrbPremiumWorkspaceLayout`** — compact intro, workspace card, primary CTA slot, collapsed advanced options.
- Used in **Inspection Readiness**, **Safeguarding Thinking**, **Record This Properly** practice panels.

### Composer copyright

- **`OrbComposerCopyright`** — subtle line under residential composer:
  > © 2026 IndiCare Intelligence. ORB supports professional judgement and does not replace safeguarding procedures.
- Non-residential keeps existing `OrbFooter` disclaimer pattern.

### Chat & action chips

- **`buildIntelligenceContextActionChips`** — chips from `indicare_intelligence_core.expert_depth`:
  - `general_light`: Make shorter, Explain more, Save
  - `residential_light/standard`: Record this properly, What am I missing?, safeguarding/Ofsted lenses, action plan
  - `residential_deep/safeguarding_critical`: Manager oversight, recording gaps, escalation, missing evidence, action plan
- General unrelated queries (e.g. capital of France) skip care-heavy chips.

### What ORB checked

- Collapsed by default (unchanged).
- Premium summary chips when expanded: Depth, Care relevance, Quality Standards, Professional lenses, Registered home domains, Source basis, Quality gate.
- Missing evidence chips **only when gaps exist**.
- Manager/RI debug drawer behind role gate.

### Voice transcript & reply

- **Root cause:** `assistantReply` prop not rendered — see `docs/orb-voice-transcript-reply-audit.md`.
- **Fix:** `data-orb-voice-reply` panel, pending state, spoken-blocked text, Continue in chat.

### Dictate

- Capture section labelled (`data-orb-dictate-capture-section`).
- Existing Magic Notes flow preserved: capture → transcript → generate → output → adult review.

### Documents

- Document intelligence workspace sections: upload/paste, lens, output.
- Compact paste area; boundary copy retained.

### Templates

- **Card grid** (`data-orb-templates-card-grid`) with category pill, purpose, Use template, Preview.
- Featured templates sorted to top.

### Perceived speed

- **`OrbIntelligenceMicroStatus`** — rotating micro-status for residential+ depths during answer (`Checking context…`, etc.).
- No micro-status for `general_light`.
- Intelligence panel still loads after message completes (non-blocking).

## What was preserved

- All ORB routes (standalone conversation, stream, actions, dictate, voice, documents, templates).
- `indicare_intelligence_core` metadata + `expert_brain_9` fallback.
- Voice visual design, wake phrase, continuous conversation, safety spoken-reply rules.
- Specialist modes (Safeguarding Thinking, Record This Properly, Ofsted Lens, etc.).
- Emergency/safeguarding banners where already present.
- No removal of ORB or brain rewrites.

## Tests

| File | Focus |
|------|-------|
| `tests/test_orb_premium_ux_contract.py` | Copyright, chips, panel, layout, routes |
| `tests/test_orb_voice_transcript_reply_visibility.py` | Voice transcript/reply markers |
| `tests/test_orb_documents_workspace_contract.py` | Document workspace sections |
| `tests/test_orb_templates_card_grid_contract.py` | Template card grid |
| `frontend-next/.../orb-premium-ux-polish.test.ts` | Chip logic + markers |

## Remaining design limitations

- Review panel and some stations still scroll on very small laptop viewports — further compaction possible.
- Template Preview selects card but full preview modal not added (selection + Use template sufficient for v1).
- Client-side prefetch/cache for templates/Knowledge Centre not fully implemented — low risk follow-up.
- Dictate governance blocks remain necessary for safeguarding modes — cannot remove without policy change.

## Related docs

- `docs/orb-premium-ux-polish-audit.md` — full screen audit
- `docs/orb-voice-transcript-reply-audit.md` — voice reply root cause
- `docs/indicare-intelligence-orb-ui-ux-parity.md` — updated parity notes
