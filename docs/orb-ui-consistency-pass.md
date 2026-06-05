# ORB UI Consistency Pass — Summary

## Updated screens

- **Documents & Guidance** — premium toolbar, tabs, trust strip, empty state, `Analyse with ORB` CTA.
- **Templates** — `OrbPremiumPage`, toolbar, pills, premium empty state, template cards.
- **Saved Outputs** — premium search/filters, empty state with Write/Dictate CTAs.
- **Shift Builder** — studio layout; optional inputs in collapsed advanced.
- **Review** — premium page; therapeutic section collapsible.
- **Inspection Readiness / Safeguarding / Record This Properly** — premium inputs, trust strips, collapsed advanced.

## Sidebar

- Documents → **Documents & Guidance** (helper: guidance and home documents).
- Knowledge Library retained with helper noting overlap with Documents route.
- Dictate / ORB Write / Shift Builder helpers unchanged in intent.

## Shared infrastructure

- New package: `components/orb/premium/*`
- Tokens: `components/orb/premium/orb-premium-theme.ts`
- CSS: end of `app/orb/orb-premium-tokens.css`

## Remaining inconsistencies (known)

- **Dictate / Voice / Write / Chat** — use existing premium studios; not fully migrated to `OrbPremiumPage` (by design).
- **Knowledge Library panel** (`orb-knowledge-library.tsx`) — governance UI separate from Documents panel; long-term merge TBD.
- **Template card actions** — recording library actions (`Start in Dictate`, etc.) still routed via `OrbRecordingLibraryCards` labels; align in a follow-up if needed.
- **Export PDF** label — used where PDF export exists; markdown export still says Export in some panels.

## Verification

```bash
cd frontend-next && npm run typecheck
cd frontend-next && npm run test:orb
```
