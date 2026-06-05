# Template → ORB Write workflow

## Flow

1. User opens **Templates** → **Recording library** card.
2. Clicks **Open in ORB Write**.
3. Shell saves `orb-write-template-handoff-v1` in `sessionStorage` with `record_type_id`, label, and studio template id.
4. ORB Write opens; `OrbWriteStandalonePanel` loads handoff and calls `createBlankOrbWriteDocumentFromRecordType`.
5. Editor shows record type badge, framework headings (empty section prompts), adult review statement, and PDF export footer.

## No Dictate required

Unlike `orb-write-session-handoff-v1` (Dictate transcript), template handoff creates an empty structured document immediately.

## Related actions

| Action | Behaviour |
|--------|-----------|
| Start in Dictate | Opens Dictate studio with `initialStudioTemplateId` |
| Preview structure | In-panel preview (templates panel) |
| Use with Document | Opens Documents & Guidance with record type filter |
