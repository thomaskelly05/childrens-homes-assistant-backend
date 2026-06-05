# ORB Write Editor

ORB Write is ORB Residential's connected document editor, opened from ORB Dictate finalise or draft handoff.

## Features

- Document title and record type display
- Rich-text body (`contentEditable`) with formatting toolbar
- Headings, bold, italic, underline, bullet/numbered lists, basic tables
- Undo/redo via browser commands
- Spellcheck enabled
- Session version history on AI apply
- Word count and last edited timestamp
- Print (browser) and PDF export (server via `/orb/dictate/export`)
- Copy text, save draft (`/orb/dictate/save` → ORB Saved Outputs)
- Approve/finalise (local state — adult responsibility)

## AI panel

Uses existing `POST /orb/dictate/edit` with governed intelligence. Suggestions require adult Apply/Discard — nothing is silently submitted.

## PDF layout

- Title, record type, date/time, body
- Adult review statement
- Footer: "Generated with ORB Residential, powered by IndiCare Intelligence"

PDF excludes UI panels, buttons, and internal brain metadata.

## Entry points

- Dictate **Open in ORB Write** button after generate/finalise
- Session handoff key: `orb-write-session-handoff-v1` (sessionStorage)
