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
| Document analysis | Document Intelligence lenses (15+) | Done | `orb_document_intelligence_service.py`, `document-intelligence.ts` | OS sync | No | Very high | No OS records |
| Document analysis (panel) | Analyse / summarise tabs | Done | `orb-document-panel.tsx` | Lens parity in panel | Partial | High | No OS records |
| Policy card from document | `policy_card` lens | Done | `/documents/intelligence` | OS publish | No | Very high | Draft only |
| Reg 44 from document | `reg44` lens + OS reader heuristics | Done | `orb_reg44_document_extraction.py` | DB import | No | Very high | Text only |
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
| Stop generating | Abort fetch + composer Stop | Done | `orb-care-companion.tsx`, `orb-standalone-composer.tsx` | Provider job cancel | No | High | Safe |
| Retry from here | Regenerate last turn | Partial | `orb-care-companion.tsx` | Mid-thread branch | Planned | High | Safe |
| Delete message | — | Missing | — | Per-message delete | Later | Low | Safe |
| Suggested replies (inline) | Chips under last answer | Done | `orb-assistant-message.tsx` | — | No | High | Safe |
| Ask about this | Attachment chips | Done | `orb-assistant-message.tsx` | Document panel parity | Partial | High | Safe |
| Structured response actions | `POST /orb/standalone/actions/run` | Done | `orb_action_engine_service.py`, `orb-response-actions.ts` | Stream actions | Partial | Very high | No OS records |
| What am I missing | Backend action + heuristics | Done | `orb_action_engine_service.py` | OS chronology compare | No | Very high | Provided text only |
| Recording / oversight / chronology actions | Backend engine | Done | `orb-care-companion.tsx` | — | No | Very high | Standalone boundary |
| Transform actions (concise, detailed, reframe) | Backend engine | Done | `orb_action_engine_service.py` | — | No | High | No invented facts |
| Shift plan / handover | `build_shift_plan`, `shift_handover_summary` | Done | `orb-care-companion.tsx` | Section-by-section residential API | Partial | Very high | Provided notes only |
| Child voice prompt | `add_child_voice_prompt` | Done | Action engine | — | No | High | Never invents views |
| Supervision prompts (toolbar) | `supervision_prompt` action | Done | `orb-care-companion.tsx` | — | No | High | Staff Coach mode |

---

## Extended feature matrix (full audit)

Status: **Done** · **Partial** · **Missing** · **N/A** (not for standalone) · **Later** (OS/provider plan)

### Message features

| Feature | Status | Notes / files |
|---------|--------|---------------|
| Copy response | Done | `orb-assistant-message.tsx` |
| Read aloud | Partial | Last answer + hover on older; `use-standalone-orb-voice.ts` |
| Regenerate response | Done | Last user message retry — `handleRegenerate` |
| Edit user message | Done | `OrbUserMessageBubble`, `editMessageId` |
| Share chat | Partial | Header export = clipboard copy |
| Delete message | Missing | — |
| Delete chat | Done | Sidebar |
| Pin chats | Done | Sidebar |
| Archive chats | Done | Sidebar |
| Search chats | Done | Sidebar |
| Retry from here | Partial | Regenerate last only |
| Stop generating | Done | AbortController + Stop button |
| Suggested replies | Done | `OrbSuggestedReplyChips` |
| Ask about this | Partial | Image attachments; documents via panel |

### Voice / audio

| Feature | Status | Notes |
|---------|--------|-------|
| Voice input | Partial | Push-to-talk — `orb-standalone-composer.tsx` |
| Voice conversation | Missing | Later |
| Advanced voice | Later | — |
| Interruptible voice | Later | — |
| Voice selection | Partial | `orb-voice-settings-panel.tsx` |
| Speed controls | Partial | `speechRate` in voice hook |
| Pause/play read aloud | Partial | Speak / Stop on message |

### Image

| Feature | Status | Notes |
|---------|--------|-------|
| Upload images | Done | Composer attachments |
| Screenshot analysis | Partial | Same as image upload + vision when configured |
| OCR / text extraction | Partial | Vision-dependent |
| Identify situations | Partial | Vision-dependent |
| Generate images | N/A | Not product goal |
| Edit images | Missing | — |

### File

| Feature | Status | Notes |
|---------|--------|-------|
| PDF / DOCX / PPTX / XLSX / CSV / TXT upload | Partial | `orb-document-panel.tsx`, `orb_document_routes.py` |
| Summarise / extract / compare / Q&A | Partial | Analyse routes |
| Generated downloads | Partial | Saved outputs markdown |
| PDF / Word / spreadsheet export | Later | Documented limitation |

### Memory / personalisation

| Feature | Status | Notes |
|---------|--------|-------|
| Memory | Partial | Local profile + workspace |
| Temporary chat | Done | Skips profile in prompt |
| Custom instructions | Done | Adult profile drawer |
| Role profile | Done | `adult-profile-store.ts` |
| Response style | Done | Voice settings + profile |
| Accessibility preferences | Done | `standalone-accessibility.ts` |
| Saved project context | Done | Projects in local store |
| Server-synced profile | Later | — |

### Search / research

| Feature | Status | Notes |
|---------|--------|-------|
| Knowledge search | Done | Knowledge library |
| Deep research | Partial | Agent panel |
| Live web browsing | Later | Not standalone |
| Citations | Done | Inline + sources detail |
| Source confidence | Partial | Explainability panel |
| Source basis | Done | Source packs + spine |

### Productivity

| Feature | Status | Notes |
|---------|--------|-------|
| Canvas / workspace | Partial | Follow-ups + saved outputs |
| Editable output | Partial | Composer prefill |
| Tasks / reminders | Later | — |
| Tables / charts / calculations | Partial | Markdown in answers |
| Checklist / action plan builder | Partial | Follow-up prompts |

### Coding / data

| Feature | Status | Notes |
|---------|--------|-------|
| Code blocks / syntax highlighting | Partial | `orb-markdown-answer.tsx` |
| Data analysis / CSV | Partial | Document Q&A |

### Chat management

| Feature | Status | Notes |
|---------|--------|-------|
| Folders / projects | Done | `standalone-local-store.ts` |
| Project instructions | Partial | Profile/project notes |
| Saved outputs | Done | `orb_saved_output_routes.py` |
| Archive / search / pin | Done | Sidebar |

### Mobile

| Feature | Status | Notes |
|---------|--------|-------|
| Camera upload | Done | `capture="environment"` on composer |
| Voice on mobile | Partial | Browser-dependent |
| Responsive sidebar | Done | Premium layout |

### Collaboration

| Feature | Status | Notes |
|---------|--------|-------|
| Shared links | Missing | — |
| Export pack | Partial | Clipboard export |
| Team workspace | Later / OS only | — |

### GPT / agents

| Feature | Status | Notes |
|---------|--------|-------|
| Residential agents | Done | 8 modes + agents panel |
| Agent selector | Done | Composer + panel |
| Mention agents | Later | — |
| Agent library | Partial | `orb-agent-panel.tsx` |
| Generic GPT store | N/A | Intentionally not built |

### Accessibility

| Feature | Status | Notes |
|---------|--------|-------|
| Keyboard shortcuts | Partial | Voice legacy shortcut |
| Dark / light mode | Partial | Appearance control |
| Text scaling | Partial | Accessibility panel |
| Reduced motion | Done | `standalone-accessibility.ts` |
| Screen reader / focus | Partial | SR labels on composer |
| Read aloud | Partial | See voice section |

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
| `/whatamimissing` | Gap-analysis prompt (or use What am I missing chip → action engine) |
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
