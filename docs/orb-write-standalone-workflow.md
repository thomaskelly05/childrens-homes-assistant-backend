# ORB Write Standalone Workflow

## Entry points

| Entry | Route / action |
|-------|----------------|
| Sidebar **ORB Write** | `/orb?station=write` |
| Direct URL | `/orb/write` → redirects to `?station=write` |
| Dictate handoff | **Open in ORB Write** → `OrbWriteStation` (session handoff preserved) |
| Standalone handoff pickup | Opening ORB Write reads `orb-write-session-handoff-v1` if present |

## Direct workflow

1. **Start screen** — paste rough record, select record type from Recording Framework.
2. **Analyse with ORB** — `POST /orb/dictate/analyze`; suggestions in IndiCare Brain panel.
3. **Generate Draft** — `POST /orb/dictate/generate`; structured body via framework headings.
4. **Print-style editor** — A4 canvas, zoom, rich text, adult review footer.
5. **AI revisions** — side panel via `POST /orb/dictate/edit`; adult accepts/rejects.
6. **Export** — PDF (`/orb/dictate/export`), browser print, copy, save draft.

## Dictate handoff workflow (preserved)

1. Record / paste in Dictate → analyse → generate.
2. **Open in ORB Write** → finalise → session handoff.
3. `OrbWriteStation` opens with back navigation to Dictate.

## Privacy and adult review

- All outputs remain draft-only until adult saves/exports/approves.
- Adult review statement shown in editor and exports.
- No child profile data in standalone ORB Write.
- No internal brain metadata shown in UI.

## Limitations

- Local draft is device/session scoped when backend save fails.
- No live OS record write in this pass.
- Template “Start from template” opens Templates panel; full template-to-Write auto-fill is a follow-up.
