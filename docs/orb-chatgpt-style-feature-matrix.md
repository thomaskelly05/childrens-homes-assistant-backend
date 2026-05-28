# ORB ↔ ChatGPT-Style Feature Matrix

**Verified against codebase:** 2026-05-28 · **Canonical UI:** `/orb` (`OrbCareCompanion`)

Status key: **Done** = verified in code · **Partial** = UI or backend incomplete · **Planned** = documented next · **N/A** = not for standalone

| ChatGPT feature | ORB equivalent | Current status | Existing files | Gap | Build now? | Residential value | Standalone safety boundary |
|-----------------|---------------|----------------|----------------|-----|------------|-------------------|---------------------------|
| Copy response | Copy action chip | Done | `orb-assistant-message.tsx` | — | No | High | Safe |
| Regenerate | Regenerate + retry send | Done | `orb-care-companion.tsx` | Per-message regen | Partial | High | Safe |
| Edit user message | Edit bubble + Save & submit | Done | `orb-care-companion.tsx` | — | No | High | Safe |
| Delete chat | Sidebar chat menu | Done | `orb-standalone-sidebar.tsx` | — | No | Medium | Safe |
| Pin chat | Pin in sidebar | Done | `orb-standalone-sidebar.tsx` | — | No | Medium | Safe |
| Archive chat | Archive in sidebar | Done | `orb-standalone-sidebar.tsx` | — | No | Medium | Safe |
| Search chats | Sidebar search | Done | `orb-standalone-sidebar.tsx` | — | No | High | Safe |
| Share/export chat | Header copy + export action | Partial | `orb-care-companion.tsx` | Share link | Planned | Medium | Safe if no PII leak |
| Read aloud | Speak on last response | Partial | `use-standalone-orb-voice.ts` | All messages | Planned | Medium | Safe |
| Voice conversation | Push-to-talk only | Partial | `orb-standalone-composer.tsx` | Duplex mode | No | Medium | Privacy review |
| Image upload | Composer attachments | Done | `orb-care-companion.tsx` | — | No | Medium | User-supplied only |
| Document upload | Document panel | Done | `orb-document-panel.tsx`, `orb_document_routes.py` | PPTX depth | Partial | High | User uploads only |
| Document analysis | Analyse / summarise actions | Done | `orb-document-panel.tsx` | — | No | High | No OS records |
| Generated file download | Saved outputs | Partial | `orb_saved_output_routes.py` | PDF/DOCX gen | No | Medium | Standalone artefacts |
| Memory / profile | Adult profile + workspace profiles | Done | `adult-profile-store.ts`, `orb-memory-panel.tsx` | Server sync | Partial | High | No OS records |
| Temporary chat | Temporary thread flag | Done | `standalone-local-store.ts`, `orb-care-companion.tsx` | Server ephemeral | Partial | High | Skips profile in prompt |
| Custom instructions | Profile custom instructions | Done | `orb-adult-profile-drawer.tsx` | — | No | High | User-provided |
| Web / deep research | Deep research agent | Partial | `orb-agent-panel.tsx`, `orb_deep_research_service.py` | Live web | No | High | Policy-gated |
| Projects | Standalone projects | Done | `standalone-local-store.ts` | — | No | High | Local only |
| Canvas / workspace | Follow-ups + saved outputs | Partial | `orb-assistant-message.tsx` | Editable pane | Planned | High | Drafts only |
| Tasks / reminders | — | Planned | — | Full feature | No | Medium | N/A |
| Tables / charts | Markdown tables in answers | Partial | `orb-markdown-answer.tsx` | Chart gen | No | Low | Safe |
| Data analysis | Document Q&A | Partial | `orb_document_routes.py` | CSV tooling | Planned | Medium | Upload only |
| Agents / custom GPTs | Residential agents (8 modes) | Done | `residential-agents.ts`, `orb-residential-agents-panel.tsx` | More agents | Partial | Very high | Mode prompts only |
| Accessibility | ORB accessibility panel + a11y classes | Done | `standalone-accessibility.ts` | Text scaling | Partial | High | Safe |
| Keyboard shortcuts | Ctrl+Shift+Space (voice legacy) | Partial | `orb-standalone-experience.tsx` | Composer shortcuts doc | Planned | Medium | Safe |
| Suggested replies | Empty starters + mode suggestions | Done | `orb-care-companion.tsx` | Inline reply chips | Partial | High | Safe |
| Stop generating | Pending guard | Partial | `orb-care-companion.tsx` | Abort fetch | Yes | High | Safe |
| Retry from here | Regenerate last turn | Partial | `orb-care-companion.tsx` | Mid-thread retry | Planned | High | Safe |

---

## ORB-native actions (not generic ChatGPT)

| Action | Mechanism | Status | Files |
|--------|-----------|--------|-------|
| Improve wording | Follow-up prefills composer | Done | `orb-assistant-message.tsx`, `orb-care-companion.tsx` |
| Recording wording | Mode + follow-up | Done | Same |
| Manager oversight note | Follow-up prompt | Done | Same |
| Chronology suggestion | Follow-up (no OS write) | Done | Same |
| Shift Builder | Follow-up + `/shift` | Partial | Shift panel planned |
| Checklist | Follow-up prompt | Done | Same |
| What am I missing? | `/whatamimissing` + action | Done | Same |
| Ofsted / safeguarding lens | Mode switch + follow-up | Done | `SLASH_MODE_COMMANDS` |

---

## Slash commands (`/orb` composer)

| Command | Effect |
|---------|--------|
| `/record` | Record This Properly |
| `/safeguard` | Safeguarding Thinking |
| `/ofsted` | Ofsted Lens |
| `/shift` | Handover prompt + Ask ORB |
| `/supervision` | Staff Coach + supervision prompt |
| `/whatamimissing` | Gap-analysis prompt |
| `/therapeutic` | Therapeutic Reframe |
| `/manager` | Manager Copilot |
| `/reg44` `/reg45` | Reg 44 / Reg 45 Prep |
| `/policy` | Open knowledge library |
| `/agent` | Open agents panel |
| `/clear` | Clear composer |

---

## Profile fields (personalisation)

| Field | Influences prompts |
|-------|-------------------|
| Name, role, setting, service type | Yes — `buildAdultProfilePromptBlock` |
| Answer length, confidence, tone, writing style | Yes |
| Default lenses (Ofsted, safeguarding, recording) | Yes |
| Custom instructions, terminology | Yes |
| Boundary note | UI only — clarifies no OS access |

Roles: residential support worker, senior support worker, deputy manager, registered manager, RI, provider/director, Reg 44 visitor, social worker, trainer/consultant, other.
