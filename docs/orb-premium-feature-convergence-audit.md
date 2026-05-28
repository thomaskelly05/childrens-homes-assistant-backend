# ORB Premium Feature Convergence Audit

**Route:** `/orb` (canonical) · **Surface:** `OrbCareCompanion` + standalone APIs  
**Date:** 2026-05-28 · **Pass:** Premium product + feature convergence

Standalone ORB must never imply access to live IndiCare OS child, home, staff, chronology, or care records. Memory = profile, projects, user-provided context, and local chat history only.

---

## 1. Current ORB features found (working on `/orb`)

| Area | Feature | Status | Primary files |
|------|---------|--------|---------------|
| Core chat | Text + image send, streaming, stop/retry | A | `orb-care-companion.tsx`, `standalone-client.ts` |
| Core chat | Copy response, regenerate, edit user message | A | `orb-care-companion.tsx`, `orb-assistant-message.tsx` |
| Core chat | Pin / archive / search / delete chats | A | `orb-standalone-sidebar.tsx`, `standalone-local-store.ts` |
| Core chat | Export conversation (header copy) | A | `orb-care-companion.tsx` |
| Core chat | Suggested starters (role-aware empty state) | A | `adult-profile-store.ts`, `orb-care-companion.tsx` |
| Core chat | Slash commands (mode + library) | A | `orb-care-companion.tsx`, `orb-standalone-composer.tsx` |
| Core chat | Temporary chat (no profile memory in prompt) | A | `standalone-local-store.ts`, `orb-care-companion.tsx` |
| Core chat | Response action bar (ChatGPT-style + ORB follow-ups) | A | `orb-assistant-message.tsx` |
| Modes | Ask ORB, Safeguarding, Ofsted, Record, Therapeutic, Manager, Staff Coach, Reg 44/45 | A | `standalone-client.ts`, `residential-agents.ts` |
| Intelligence | Knowledge library panel | A | `orb-knowledge-library.tsx`, `orb_knowledge_routes.py` |
| Intelligence | Deep research / agents panel | A | `orb-agent-panel.tsx`, `orb_agent_routes.py` |
| Intelligence | Citations / explainability / cognition pill | A | `orb-explainability-panel.tsx`, backend cognition |
| Workspace | Projects, saved outputs | A | `standalone-local-store.ts`, `orb_saved_output_routes.py` |
| Documents | Upload, summarise, analyse (standalone) | A | `orb-document-panel.tsx`, `orb_document_routes.py` |
| Voice | Push-to-talk, TTS read-aloud, voice settings | B | `use-standalone-orb-voice.ts`, `orb-voice-settings-panel.tsx` |
| Profile | Adult profile drawer (localStorage) | A | `adult-profile-store.ts`, `orb-adult-profile-drawer.tsx` |
| Profile | Workspace “Profiles” (user-provided child context labels) | A | `orb-standalone-sidebar.tsx` |
| Settings | Memory, tools, permissions, accessibility panels | A | `orb-*-panel.tsx` |
| Design | Light-first premium layout (`orb-premium.css` over tokens) | A | `app/orb/layout.tsx`, `orb-chatgpt-light.css` |

**Legend:** A = exists and works · B = exists but partial or hidden

---

## 2. Legacy ORB features found (not converged on `/orb`)

| Feature | Location | Convergence |
|---------|----------|-------------|
| Voice-first full-screen ORB | `orb-standalone-experience.tsx`, `/assistant` | C — separate surface; `/orb` is text-first |
| Minimal legacy chat | `orb-standalone-chat.tsx` | C — not used by `/orb` page |
| OS operational ORB | `orb-operational/*`, embedded rails | E — OS-bound; not standalone |
| Residential redirect shell | `orb-residential-shell.tsx` | C — redirect to `/orb` only |
| Old sidebar label “Apps” | Removed | Converged to Core / Intelligence / Workspace / Profiles |

---

## 3. Features already converged (this and prior passes)

- Single route `/orb` with `OrbCareCompanion` (no second ORB UI).
- CSS: one layout background; `orb-premium.css` disables competing `::before` wash on `.orb-chat-layout`.
- Sidebar: Core / Intelligence / Workspace / Profiles; compact branding; portal dropdowns.
- Composer: primary product object; soft focus; slash command palette hint.
- Profile: ChatGPT-style personalisation with standalone boundary note.
- Action bar: Copy, Regenerate, Save, Speak + ORB follow-ups in More menu.
- Temporary chat: UI toggle; skips profile blocks in outbound prompt.
- Premium gating on knowledge, documents, agents, evaluation, outputs (backend).

---

## 4. Features duplicated or split

| Duplication | Resolution |
|-------------|------------|
| `orb-chatgpt-light.css` vs `orb-premium.css` | Intentional cascade: tokens/light in light file; layout in premium |
| Standalone vs `orb_residential_*` backends | Standalone routes for `/orb`; residential for OS-linked surfaces only |
| Profile: adult drawer vs workspace profiles | Adult = personalisation; workspace profiles = optional user context tags |
| Two chat components (`orb-care-companion` vs `orb-standalone-chat`) | Only companion on `/orb` |

---

## 5. Missing for ChatGPT-like experience

| Feature | Status | Notes |
|---------|--------|-------|
| Share chat link | D | Needs safe export/hosting design |
| Read aloud on all messages (not last only) | D | TTS exists; per-message UX later |
| Voice conversation mode | D | Push-to-talk only; full duplex later |
| Generated file download | D | Saved outputs markdown only |
| Web search / live browse | E/D | Policy-gated; not in standalone yet |
| Canvas / editable workspace | D | Use follow-up prompts + saved outputs for now |
| Tasks / reminders | D | Product later |
| Tables/charts generation | D | Markdown only |
| Dark mode polish | D | Light primary; dark tokens exist |
| Stop generating (mid-stream cancel) | B | Partial via pending state; hard cancel API later |

---

## 6. Missing for residential children’s homes (ORB-native value)

| Need | Status | ORB equivalent |
|------|--------|----------------|
| Daily log / incident / restraint wording | B | Record This Properly + action bar “Recording wording” |
| Safeguarding facts/concerns/gaps/escalation | A | Safeguarding Thinking mode + lenses |
| LADO / Working Together prompts | B | Mode + knowledge spine; deepen in agents |
| Ofsted / SCCIF / Quality Standards | A | Ofsted Lens, Reg 44/45 Prep |
| Therapeutic / PACE / trauma-informed | A | Therapeutic Reframe mode |
| Manager oversight / RI governance | B | Manager Copilot; follow-up “Manager oversight” |
| Shift handover / what am I missing | A | `/shift`, `/whatamimissing`, follow-up actions |
| Policy card on upload | B | Library + document panel |
| Chronology suggestion (no OS IDs) | B | Follow-up action; no live chronology write |
| Reg 44 evidence pack builder | D | Prep mode + saved outputs; pack export later |

---

## 7. Features that should NOT be built into standalone ORB

- Live child / home / staff / record / chronology lookup or IDs in prompts.
- Writing to OS care records, dashboards, or chronology.
- Implying inspection outcomes or safeguarding decisions.
- Team/provider live collaboration on OS data.
- Auto-sync with IndiCare OS profile or HR records.

---

## 8. Recommended next implementation order

1. **Stop generating** — abort in-flight fetch/stream on `/orb/standalone/conversation`.
2. **Shift Builder panel** — wire “Shift Builder” action to dedicated workspace (notes exist in `docs/orb-shift-builder-product-notes.md`).
3. **Regenerate from message** — retry from a specific assistant turn (not only last user).
4. **Share/export pack** — markdown/PDF export of thread + saved outputs (standalone artefacts only).
5. **Deepen agent registry** — Ofsted Lens, Safeguarding, Record agents as first-class with health checks in UI.
6. **Voice conversation** — optional; after privacy review.
7. **Canvas workspace** — editable draft pane for records/oversight (no OS write).
8. **Backend profile sync** — optional server-side prefs; still no OS records.

---

## Backend convergence (Part 9 summary)

| Endpoint family | Premium gate | OS boundary |
|-----------------|--------------|-------------|
| `/orb/standalone/config` | Session + premium | No OS IDs |
| `/orb/standalone/conversation` | Yes | Rejects OS identifiers |
| `/orb/standalone/knowledge/*` | Yes | Knowledge Spine + Operating Brain in prompts |
| `/orb/standalone/documents/*` | Yes | User uploads only |
| `/orb/standalone/agents/*` | Yes | Agent orchestration |
| `/orb/standalone/evaluation/*` | Yes | Quality evaluation |
| `/orb/standalone/outputs/*` | Yes | Saved artefacts |

Tests: `tests/test_orb_standalone_boundary.py`, `tests/test_orb_operating_brain_convergence.py`, `tests/test_orb_knowledge_routes.py`, `tests/test_orb_saved_output_routes.py`.

---

## Design audit (Part 1 summary)

| Check | Status |
|-------|--------|
| Duplicate layout `::before` | Fixed in `orb-premium.css` |
| Ambient layers | Single `OrbAmbientCognition`; reduced opacity |
| Sidebar logo crop | Fixed brand block sizing |
| Dropdown z-index | Portal menus + `.orb-action-more-menu` z-index |
| Composer focus ring | Soft outline in premium |
| Text contrast | Slate hierarchy on `#f4f6f9` |
| Mobile composer | Rounded shrink in premium media query |
