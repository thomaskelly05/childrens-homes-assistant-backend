# ORB Product Surface QA

## Surfaces updated (studio layouts pass)

- [x] Dictate — `OrbStudioShell`, premium action rail
- [x] ORB Write — 3-column word processor v2
- [x] Documents & Guidance — knowledge library hero + shell
- [x] Templates — recording library hero + premium cards
- [x] Saved Outputs — document archive layout + empty state
- [x] Shift Builder — handover studio grid
- [x] Review — guided studio with sidebar
- [x] Inspection Readiness — guided studio
- [x] Safeguarding Thinking — guided studio
- [x] Record This Properly — guided studio
- [x] Billing modal — studio modal sections
- [x] Account modal — studio modal sections
- [x] Settings — studio shell marker

## Route / API preservation

| Area | Routes | API |
|------|--------|-----|
| Chat | `/orb` | `/orb/standalone/conversation` |
| Dictate | `?station=orb_dictate` | dictate client routes |
| ORB Write | `?station=write`, `/orb/write` redirect | `editOrbDictateDocument`, save outputs |
| Documents | `?station=knowledge` | `/orb/standalone/documents/*` |
| Templates | `?station=templates` | `/templates/*` |
| Saved Outputs | `?station=saved` | `/orb/standalone/outputs` |
| Shift Builder | `?station=shift_builder` | `/orb/standalone/shift-builder/generate` |
| Billing | modal + `/orb/billing` | `/orb/standalone/billing/*` |

## Manual QA checklist

1. Open `/orb` — chat sends messages
2. Dictate — record, transcript, Analyse, Generate, Open in ORB Write
3. ORB Write — start screen, generate draft, toolbar formatting, zoom, export PDF, save draft
4. Templates — Start in Dictate, Open in ORB Write, Preview structure
5. Documents — tabs, upload, paste, analyse
6. Saved Outputs — empty state actions when empty
7. Shift Builder — generate draft from notes
8. Practice panels — generate/continue CTA
9. Billing / Account / Settings — modals open, no cropped buttons
10. No child profile selector visible
11. No internal brain metadata in UI

## Automated tests

```bash
cd frontend-next
npm run test -- components/orb/premium/orb-premium-studio-layouts.test.ts
npm run test -- components/orb-write/orb-write-word-processor-v2.test.ts
npm run test -- components/orb-standalone/orb-studio-surface-contract.test.ts
npm run typecheck
```

## Intentionally unchanged

- Voice realtime WebRTC architecture
- Backend intelligence core and governance
- OS-embedded ORB (`/assistant/orb`)
- Child profile boundaries in standalone ORB
- E2E Playwright specs (run separately if needed)

## Known limitations

See `docs/orb-write-word-processor-v2.md` for editor limitations. Studio layouts are desktop-first; narrow viewports stack panels vertically.
