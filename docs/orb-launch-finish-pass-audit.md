# ORB Launch Finish Pass — Audit

Date: 2026-06-05  
Scope: ORB Residential `/orb` — Chat, Dictate, Voice, ORB Write, Templates, Documents & Guidance, Saved Outputs, Account/Settings/Billing.

## Summary

The launch finish pass addressed navigation friction, studio polish, modal presentation, chat actions, and handoff consistency without changing backend intelligence routes.

## Navigation audit

| Nav item | Before | After |
|----------|--------|-------|
| Chat | Started a **new** chat while workspace panel stayed open | `onOpenChat` closes workspace panel and returns to active thread |
| Dictate / Voice / ORB Write / Library | Workspace swap with duplicate title chrome | Compact workspace chrome; studio supplies its own header |
| Settings | Used `orbStationShellProps` → full workspace with back arrow | Right-side overlay drawer (`orbOverlayDrawerShellProps`) |
| Profile | Centred modal | Premium drawer with status chips and quick actions |
| Billing | Centred modal (functional) | Polished feature list + sticky CTA footer (unchanged Stripe logic) |

## Back arrow behaviour

- **Workspace panels**: Back arrow returns to Chat (intentional). Primary destinations mount immediately — no intermediate redirect screen for converged nav items.
- **Settings / Account**: Close button / Escape / backdrop — no back arrow required.
- **ORB Write internal**: Removed “back to start” — document studio is the default surface.

## ORB Write gaps (addressed)

- Default view was `start` form instead of document canvas → now opens blank A4 studio.
- Rough notes moved to left source panel with Analyse / Generate in studio header.
- Unified content handoff from Chat (`orb-write-content-handoff.ts`).

## Dictate gaps (addressed)

- Recorder bar tagged `data-orb-dictate-recorder-bar`.
- Studio layout preserved: top bar, transcript left, ORB analysis right, output rail bottom.
- Compact workspace chrome when opened from sidebar.

## Chat action gaps (addressed)

- Icon-first action row: Copy, Edit, Regenerate, Speak, Save, Open in ORB Write, Use as template, Export, More.
- User messages: Copy, Edit, Resend icon actions.

## Must remain unchanged

- `/orb/dictate/*` API routes and governed edit path (`editOrbDictateDocument`).
- Voice station implementation (navigation shell only).
- Stripe billing logic.
- IndiCare Intelligence Core, governance, redaction, audit.
- No child profile storage/selector on standalone ORB.
- `?station=` deep links and convergence redirects.

## Known limitations

- Table insert / divider depend on browser `contentEditable` support.
- Export from chat downloads markdown locally (no PDF from chat row).
- Provider team billing remains signposted only.
