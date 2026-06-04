# ORB Premium UX Polish — Screen Audit

Audit date: June 2026. Scope: standalone ORB at `/orb` (OrbCareCompanion). Backend brain and routes unchanged unless UI needed metadata.

## Summary

| Screen | Scroll issue | Primary action above fold | Form vs workspace | Priority |
|--------|--------------|---------------------------|-------------------|----------|
| Chat | Empty state tall on mobile; desktop OK | Composer always visible | **Workspace** (good) | Polish starter cards |
| Composer | Footer only on non-residential | Send/mic visible | Workspace input | Add copyright line |
| Assistant actions | N/A | Persistent action bar | Workspace | Context-aware chips |
| What ORB checked | Collapsed — good | Hidden until expand | Progressive disclosure | Premium chips |
| Dictate | Desktop two-column can scroll | Record/paste visible | Mixed form/workspace | Compact capture flow |
| Voice | Transcript/reply was missing | Start voice visible | **Workspace** (strong) | **Fix reply visibility** |
| Shift Builder | Moderate scroll | Generate visible | Specialist workspace | Minor compaction |
| Documents | Boundary list + paste tall | Run analysis mid-page | Form-heavy | One-screen sections |
| Saved Outputs | List scroll expected | Open/search visible | Library | OK |
| Review | Output card pushed fold | Run review below fold | Form | Collapse advanced |
| Inspection Readiness | Output card pushed fold | Continue below fold | Form | Compact layout |
| Safeguarding Thinking | Multiple fields | Continue below fold | Form | Collapse context fields |
| Record This Properly | Five fields | Generate below fold | Form | Single primary field |
| Templates | List felt utilitarian | Search visible | List | **Card grid** |
| Knowledge Centre | Library scroll OK | Search visible | Library | OK |
| Settings | Long settings expected | Save visible | Settings | OK |
| Account/Billing modals | Modal scroll OK | Primary CTA visible | Modal | OK |
| Mobile | Sheet panels full-screen | Back + primary | Mobile workspace | OK |

---

## Chat screen

**Current issue:** Starter cards and welcome block can feel tall; action chips were mode/hint based only, not Core-depth aware.

**Scroll:** Desktop residential empty state fits one viewport with compact composer. Mobile uses full viewport thread.

**Primary action:** Composer send — always visible in dock.

**Feel:** Assistant workspace (centred ORB welcome, starter cards).

**Keep unchanged:** ORB visual identity, centred welcome, thread layout, streaming, sidebar navigation, all routes.

**Compact:** Starter card copy; reduce duplicate disclaimers.

**Advanced/collapsible:** Cognition labels (already hidden on residential surface).

**Route-compatible:** `/orb`, `?q=`, `?station=`, conversation API unchanged.

---

## Composer

**Current issue:** Residential surface hid footer/copyright entirely.

**Scroll:** N/A — dock pinned.

**Primary action:** Send + mic — visible.

**Keep unchanged:** Plus menu, attachments, voice/dictate routing, CSRF send path.

**Compact:** Subtle copyright under composer on residential.

**Route-compatible:** No API changes.

---

## Assistant message actions

**Current issue:** Suggested chips used regex on hint only; care-heavy chips could appear on general answers.

**Keep unchanged:** Persistent Copy/Speak/Save bar, citations, regenerate on latest only.

**Change:** `buildIntelligenceContextActionChips` from `indicare_intelligence_core.expert_depth`.

---

## What ORB checked (OrbIntelligenceCorePanel)

**Current issue:** Debug details mixed with staff summary; missing evidence always section visible when expanded even if empty.

**Scroll:** Collapsed by default — no scroll impact.

**Keep unchanged:** Collapsed default, manager/RI debug drawer gated by role.

**Compact:** Summary chips (Depth, Care relevance, Quality Standards, lenses, domains, source basis, quality gate).

**Advanced:** Manager/RI debug drawer only when `showTechnicalDetails`.

---

## Dictate

**Current issue:** Governance/consent blocks add height; starting state scrolls on smaller laptops.

**Scroll:** Desktop two-column — capture left, output right; can scroll before generate.

**Primary action:** Record note / paste — visible in capture column.

**Keep unchanged:** `/orb/dictate/generate`, studio phase, consent boundaries, no auto-save to live records.

**Compact:** Capture / transcript / output sections labelled; Magic Notes workflow preserved.

**Advanced:** Governance consent, participants, mode select — keep but grouped.

---

## Voice

**Current issue:** **`assistantReply` prop passed from OrbCareCompanion but never rendered in OrbVoiceStation UI.** Browser PTT and chat-send path produced answers in chat history only. Realtime WebRTC showed turns; browser fallback did not show ORB text reply.

**Scroll:** Single column — OK.

**Keep unchanged:** Visual design, wake phrase, continuous conversation, speech recognition, safety/privacy spoken reply rules.

**Fix:** Render `data-orb-voice-reply` from `assistantReply` + turns; show spoken-blocked reason in text.

---

## Documents

**Current issue:** Boundary bullet list + empty state + paste consumed vertical space before lenses.

**Scroll:** Starting state could scroll on 768px height.

**Keep unchanged:** Upload/paste, lens API, standalone boundary (no OS records).

**Compact:** Section markers: upload, lens, output; reduced paste rows.

---

## Templates

**Current issue:** Plain clickable list — functional but not premium.

**Keep unchanged:** Search, category filters, `fetchOrbTemplates`, fallback catalog, routes.

**Change:** Card grid with category pill, purpose line, Use template + Preview.

---

## Review / Safeguarding / Inspection / Record

**Current issue:** “What ORB will help with” cards pushed primary input below fold.

**Keep unchanged:** Specialist modes, prompt builders, Continue in chat → same modes.

**Compact:** OrbPremiumWorkspaceLayout — intro + main input + collapsed advanced + primary CTA.

---

## Perceived speed

**Current issue:** No micro-status for residential+ during streaming; intelligence panel loads with message.

**Keep unchanged:** Safety logic, quality gate on server.

**Change:** OrbIntelligenceMicroStatus rotating lines for non-general depth; panel lazy after complete.

---

## Routes — must remain compatible

- `POST /orb/standalone/conversation`
- `POST /orb/standalone/conversation/stream`
- `POST /orb/standalone/actions/run`
- `POST /assistant/orb/conversation`
- `POST /orb/dictate/generate`
- Voice client paths
- Saved outputs, templates, documents APIs
- `indicare_intelligence_core` metadata + `expert_brain_9` fallback
