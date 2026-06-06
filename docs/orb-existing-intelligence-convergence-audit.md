# ORB Existing Intelligence Convergence Audit

## Executive summary

ORB Residential already contained the required intelligence, lenses, actions, handoffs and saved-output workflows across `frontend-next/lib/orb/`, backend services and the `orb-care-companion.tsx` shell. This convergence pass **reused** those implementations and centralised duplicate action/lens lists into `frontend-next/lib/orb/orb-converged-actions.ts`. No new AI brain, agent system or saved-output store was created.

## 1. Intelligence / brain / core

| Capability | File(s) | Purpose | Surfaces | Duplicated? | Converged? |
|---|---|---|---|---|---|
| IndiCare Intelligence Core | `lib/orb/indicare-intelligence-core.ts`, `services/indicare_intelligence_core_service.py` | Extract quality gates, support chips, CTAs from API responses | Chat, Voice | Backend mirror | Reused as-is |
| ORB brain metadata (internal) | `lib/orb/orb-brain-metadata.ts`, `services/orb_brain_metadata_service.py` | Internal routing metadata for saved outputs | Saved Outputs (indicator only) | No user-facing duplication | Not exposed in UI |
| Cognition routing | `lib/orb/orb-cognition-routing-build.ts`, backend bridge services | Route requests through governed intelligence | All via API | OS-level only | Reused |
| Trusted source registry | `lib/orb/knowledge/orb-official-guidance.ts`, `services/indicare_source_convergence_service.py` | Official guidance sources | Documents | Merged into Documents panel | Reused |
| Recording intelligence | `lib/orb/recording/orb-recording-framework.ts`, `assistant/knowledge/orb_recording_framework.json` | Canonical record types, checks, suggested outputs | Dictate, Write, Templates | Was partially duplicated in studio templates — now derived | Converged via framework |
| Quality gates | `indicare-intelligence-core.ts`, dictate brain analysis | Child voice, safeguarding, recording quality | Chat, Dictate, Write | Parallel checks in Write quality_checks | Reused |
| Manager oversight | Edit mode `manager_oversight`, document lens `manager_oversight` | Manager review prompts | Write, Dictate, Documents | Label overlap | Centralised in converged registry |
| Ofsted / SCCIF logic | Edit modes `ofsted_ready`, `sccif_lens`; document lens `ofsted` | Inspection readiness without regulatory judgements | Write, Dictate, Documents, Chat | Multiple entry points | Centralised |
| Safeguarding logic | Edit mode `safeguarding_lens`; document lens `safeguarding` | Safeguarding reflection and gaps | Write, Dictate, Documents, Chat | Multiple entry points | Centralised |
| Child voice logic | Edit mode `child_voice`; recording checks | Child-centred recording | Write, Dictate | Overlap with child-centred rewrite | Separate check + rewrite in registry |
| Route finalisation | `lib/orb/orb-navigation-convergence.ts` | Deprecated nav → converged destinations | All | — | Reused |
| ORB answer support | `lib/orb/orb-response-actions.ts`, `lib/orb/orb-output-reuse.ts` | Chat follow-up chips → backend action engine | Chat | Partial overlap with converged starters | Both retained; starters converged |

## 2. Lenses / checks / review modes

| Lens / check | Canonical file | Surfaces | Connected to Chat | Dictate | Write | Documents | Templates | Saved Outputs |
|---|---|---|---|---|---|---|---|---|
| What am I missing? | `orb-converged-actions.ts` (`missing_information`) | Write, Dictate | via Chat starter flows | ✓ | ✓ | via doc lens `what_is_missing` | — | rerun |
| Review this record | converged registry | Write, Chat | ✓ | ✓ | ✓ | — | — | — |
| Safeguarding lens | converged + `document-intelligence.ts` | Write, Documents | ✓ | ✓ | ✓ | ✓ | ✓ | rerun |
| Ofsted / inspection | converged + document lenses | Write, Documents, Chat | ✓ | ✓ | ✓ | ✓ | ✓ | rerun |
| Recording quality | converged + `recording_quality` lens | Write, Dictate | — | ✓ | ✓ | ✓ | — | — |
| Child voice | converged write actions | Write | — | ✓ | ✓ | — | — | — |
| Manager oversight | converged + document lens | Write, Dictate, Documents | — | ✓ | ✓ | ✓ | — | — |
| Reg 44 / Reg 45 | `document-intelligence.ts` | Documents, Chat starter | ✓ | — | — | ✓ | ✓ | rerun |
| Action plan | converged + document lens `actions` | Write, Dictate, Documents, Templates | ✓ | ✓ | ✓ | ✓ | ✓ | save |
| Chronology / handover | converged registry + recording framework | Write, Dictate, Templates, Chat | ✓ | ✓ | ✓ | — | ✓ | — |
| Policy check / guidance check | `sccif_lens`, Documents guidance tab | Write, Documents | ✓ | — | ✓ | ✓ | — | — |
| Reflective practice | Chat modes (`Staff Coach`) | Chat | ✓ | — | — | — | — | — |

**Duplication found:** `ORB_WRITE_AI_ACTIONS` and `ORB_DICTATE_QUICK_ACTIONS` shared edit modes with different groupings. **Converged** into `orb-converged-actions.ts`; Write panel imports derived list; Dictate quick actions remain for in-studio editing.

## 3. ORB Write actions

| Action | File | Route | Surfaces |
|---|---|---|---|
| All write assistant actions | `lib/orb/orb-converged-actions.ts` → `orb-write-ai-actions.ts` | `editOrbDictateDocument` | ORB Write |
| Panel UI | `components/orb-write/orb-write-ai-panel.tsx` | Same | ORB Write |
| Save draft / finalise | `orb-write-standalone-panel.tsx`, `orb-write-toolbar.tsx` | `saveOrbWriteLocalDraft`, toolbar finalise | ORB Write |
| PDF export | `lib/orb/write/orb-write-export.ts` | `exportOrbWritePdf` | ORB Write |
| contentEditable editor | `components/orb-write/orb-write-editor.tsx` | Local state | ORB Write |

## 4. Dictate outputs and analysis

| Capability | File | Surfaces |
|---|---|---|
| Hero output types | `orb-converged-actions.ts` → `orb-dictate-hero-output-types.ts` | Dictate |
| Suggested outputs | `orb-dictate-studio-templates.ts` (from recording framework) | Dictate |
| Generate / analyse / finalise | `orb-dictate-client.ts`, `routers/orb_dictate_routes.py` | Dictate |
| Dictate → Write handoff | `lib/orb/write/orb-write-handoff.ts` | Dictate → Write |
| Speaker labels / transcript | `orb-dictate-speaker.ts`, `OrbTranscriptPanel.tsx` | Dictate |

## 5. Documents & Guidance

| Capability | File | Surfaces |
|---|---|---|
| Document lenses | `document-intelligence.ts` + `ORB_CONVERGED_DOCUMENT_LENSES` | Documents |
| Upload / paste / link | `orb-document-panel.tsx`, `standalone-client.ts` | Documents |
| Official guidance / home docs | `knowledge-library/*`, `orb-knowledge-*` | Documents |
| Cross-room actions | `RESIDENTIAL_DOCUMENT_CROSS_ACTIONS` | Documents → Write, Templates |
| Policy comparison | **Not implemented** — documented as gap | — |

## 6. Saved Outputs

| Capability | File | Surfaces |
|---|---|---|
| CRUD + resilience | `orb-saved-output-adapters.ts`, `orb-saved-outputs-resilience.ts`, `orb-saved-outputs-local.ts` | Saved Outputs |
| Detail actions | `orb-saved-output-detail-actions.tsx` | Saved Outputs |
| **Open in ORB Write** | `orb-write-converged-handoff.ts` | Saved Outputs → Write |
| Source/type labels | `savedOutputSourceLabel`, `savedOutputTypeLabel` | Saved Outputs |

## 7. Handoff helpers

| Handoff | Key / file | From → To |
|---|---|---|
| Content handoff | `orb-write-content-handoff-v1` | Chat, Documents, Saved Outputs → Write |
| Dictate session | `orb-write-session-handoff-v1` | Dictate → Write |
| Template handoff | `orb-write-template-handoff-v1` | Templates → Write |
| **Unified entry** | `orb-write-converged-handoff.ts` | All surfaces |

## 8. Chat actions

| Action | File | Wired |
|---|---|---|
| Copy, Regenerate, Speak, Save | `orb-assistant-message.tsx` | ✓ |
| Open in ORB Write | `orb-care-companion.tsx` → `convergedHandoffToOrbWrite` | ✓ |
| Use as template, Export, More | `orb-assistant-message.tsx` | ✓ |
| Starters | `orb-converged-actions.ts` → `orb-navigation-convergence.ts` | ✓ |

## Intentionally not built

- New AI brain or visible multi-agent system
- Child profile storage/selector in standalone ORB
- Policy document comparison UI (not found in repo)
- Removal of legacy panels (redirect-only)

## Key converged files added/updated

- **Added:** `frontend-next/lib/orb/orb-converged-actions.ts`
- **Added:** `frontend-next/lib/orb/write/orb-write-converged-handoff.ts`
- **Updated:** Write AI actions, navigation starters, dictate hero types, saved output detail, care companion wiring
