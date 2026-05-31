# ORB Residential — Final Product Polish Report

Sprint: **ORB Residential Final Product Polish — Viewport Lock, Living ORB, App Access, Templates, Voice and ORB Voice**

## Deliverables

### 1. Composer restored and compacted
- Residential composer remains compact (`orb-composer-glass--compact`), centred, placeholder **Ask anything**, mic and send visible.
- Thread bottom padding reduced on residential (`pb-4`) so the composer stays in view; composer dock is `flex: 0 0 auto`.

### 2. Viewport lock confirmed
- Root layout: `h-[100dvh]`, `overflow: hidden` on `.orb-chat-layout--residential`.
- Sidebar, thread, and modal bodies scroll internally; CSS reinforces `orb-chat-main` / `orb-composer-zone` flex behaviour.

### 3. Sidebar collapsible sections
- **Projects**, **Recent chats**, **Apps**, **Account / Workspace** — chevron toggles with localStorage:
  - `orb-sidebar-projects-collapsed`
  - `orb-sidebar-recents-collapsed`
  - `orb-sidebar-apps-collapsed`
  - `orb-sidebar-account-collapsed`
- Defaults: Projects/Recents/Apps expanded; Account compact.

### 4. Projects/folders and project memory
- Seeded projects unchanged (`orb-projects` persistence).
- **Project memory** opens a premium modal (`OrbProjectMemoryModal`) instead of `window.prompt`.

### 5. ORB visual / living orb
- `GlassOrbMark` remains the single orb; added `--orb-brand-blue`, `--orb-brand-cyan`, `--orb-glow`, `--orb-glass-highlight`.
- Voice hero sizing (`glass-orb-mark--voice`) and stronger pulse while thinking (`glass-orb-mark--thinking`).

### 6. App access / auth fixes
- `shouldBlockStationForAuth(sessionReady, error)` — signed-in users see **Reconnect to sync** banner, not a full sign-in wall, when API returns auth-shaped errors.
- Applied to Templates, Knowledge Centre, Saved Outputs.

### 7. Templates immediate generation
- **Use template** closes modal and `sendMessage(templateImmediatePrompt(...))` immediately.
- Safeguarding concern record includes full section list in the prompt.

### 8. Billing UI
- Existing billing modal retained (plan £9.99/month, usage, spending cap, buy more). No backend changes in this pass.

### 9. Profile / account upgrade
- Premium account modal: status chips, quick actions (Settings, Billing, Voice, Data & privacy), usage stats (projects, saved outputs, passkeys).

### 10. Voice in main ORB
- Mic remains in residential composer; voice settings reachable from account modal.

### 11. ORB Voice app
- New station **ORB Voice** (`orb_voice` panel): turn-based voice conversation, Start-only mic, transcript area, privacy copy.
- Listed in sidebar Apps and composer plus menu.

### 12. Plus menu shortcuts
- `OrbComposerPlusMenu`: upload, review, template, knowledge, ORB Voice, learning session, saved outputs.

### 13. Modal depth
- Project memory and account modals use `OrbAppModal`; station modals unchanged (wide/standard sizes).

### 14. Answer-writing
- Template prompts request full residential structure (headings, placeholders, safeguarding, child voice) via `templateImmediatePrompt`.

### 15. Tests / build
- `npm run test:orb` — **238 passed**
- `npm run typecheck` — **pass**
- `npm run build` — **pass**

## Remaining backend follow-ups

| Area | Endpoint / work |
|------|-----------------|
| Spending cap | `POST /orb/usage/spending-cap` (UI stores locally until ready) |
| Usage top-up | `POST /orb/usage/top-up-checkout` |
| Project memory sync | Persist `orb-projects` server-side |
| Realtime voice | Duplex / realtime STT+TTS if moving beyond browser Web Speech API |

## Product target

ORB Residential should now feel like a **premium, glass, dark, living AI copilot** for residential childcare: open ORB → ask (or speak) → get answers, with apps as modals inside one viewport — not sign-in loops or unfinished routes.
