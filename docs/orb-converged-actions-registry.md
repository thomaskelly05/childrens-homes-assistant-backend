# ORB Converged Actions Registry

Canonical file: `frontend-next/lib/orb/orb-converged-actions.ts`

## Design principles

- **Lenses and workflows, not agents** — staff see practice actions, not internal brains.
- **Governed routes only** — each action points to an existing API/helper (`editOrbDictateDocument`, `runOrbDocumentIntelligence`, `generateOrbDictateNote`, handoff helpers).
- **`requiresHumanReview: true`** on all practice actions.
- **High-risk cautions** on safeguarding-related actions.

## Action shape

```typescript
{
  id: string
  label: string
  description: string
  category: 'core' | 'quality' | 'safeguarding' | 'inspection' | 'create_related' | 'export' | 'document_lens' | 'chat_starter' | 'dictate_output'
  surfaces: OrbConvergedSurface[]
  route: string              // existing helper — not a new brain
  outputTarget: 'chat' | 'write' | 'saved_output' | 'document_analysis' | 'template' | 'dictate'
  requiresHumanReview: boolean
  highRiskCaution?: string
}
```

## ORB Write panel groups

| Group key | Title | Action IDs |
|---|---|---|
| `core` | Core actions | missing, review_record, professional, remove_blame, child_centred, grammar, record_properly |
| `safety` | Safety & quality | safeguarding_gaps, ofsted_ready, recording_quality, child_voice_check, manager_oversight, guidance_check, safeguarding_lens, ofsted_lens |
| `create_related` | Create related | chronology, manager_summary, handover, action_plan, social_worker_update |
| `export` | Export & final | prepare_pdf |

Save draft and mark finalise are registered in `ORB_CONVERGED_WRITE_ACTIONS` but rendered via Write toolbar (`saveOrbWriteLocalDraft`, `data-orb-write-finalise`).

## Chat starters (registry)

| ID | Label | Mode |
|---|---|---|
| starter_handover | Create handover / shift plan | — |
| starter_review_practice | Review written practice | — |
| starter_safeguarding | Think through safeguarding concern | Safeguarding Thinking |
| starter_inspection | Prepare for inspection / Ofsted evidence | Ofsted Lens |
| starter_record_properly | Record this properly | Record This Properly |
| starter_manager_summary | Create manager summary | — |
| starter_reg44_action_plan | Build action plan from Reg 44 / Statement of Purpose | Reg 44 / Reg 45 Prep |
| starter_recent_changes | Summarise recent changes | — |
| starter_easy_read_briefing | Turn policy into easy-read briefing | — |

Consumed via `orb-navigation-convergence.ts` → `orb-residential-copy.ts` → `orb-care-companion.tsx`.

## Dictate hero outputs

Aligned with `orb-recording-framework.json` note types:

- Daily Record, Incident Report, Missing From Home, Safeguarding Concern, Chronology Entry, Handover, Manager Summary, Action Plan

## Document lenses

Derived from `RESIDENTIAL_FIRST_CLASS_LENSES` as `ORB_CONVERGED_DOCUMENT_LENSES` — includes Reg 44, Statement of Purpose, action plan, easy-read, Quality Standards, inspection readiness, safeguarding, recording requirements.

## Consumers

| Module | Import |
|---|---|
| `orb-write-ai-actions.ts` | `convergedWriteActionsForPanel()` |
| `orb-write-ai-panel.tsx` | `ORB_CONVERGED_WRITE_PANEL_GROUPS` |
| `orb-dictate-hero-output-types.ts` | `convergedDictateHeroNoteTypes()` |
| `orb-residential-copy.ts` | `convergedChatStarters()` |
| `orb-navigation-convergence.ts` | `ORB_CONVERGED_CHAT_STARTERS` (synced static copy for node tests) |

## Duplicate lists removed / reduced

- Hardcoded `ORB_WRITE_AI_ACTIONS` array → derived from registry
- Hardcoded `ORB_CONVERGED_CHAT_STARTERS` in navigation → derived from registry
- Hardcoded `ORB_DICTATE_HERO_OUTPUT_TYPES` → derived from registry

**Retained (intentionally):**

- `ORB_DICTATE_QUICK_ACTIONS` — Dictate studio in-place edits (deeper wording tools)
- `contextualDocumentActions()` — paste-detect contextual lens suggestions
- Legacy `PRIMARY_EMPTY_STARTERS` in care companion — non-residential surfaces only
