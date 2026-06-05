# ORB Chat Message Actions

## Assistant messages

Icon row (`data-orb-response-action-bar-icons`):

| Action | Attribute | Notes |
|--------|-----------|-------|
| Copy | `copy` | Clipboard |
| Edit | `edit` | Prefills composer |
| Regenerate | `regenerate` | Latest message only |
| Speak | `speak` | TTS when available |
| Save | `save` | Saved Outputs path |
| Open in ORB Write | `open-in-orb-write` | Content handoff |
| Use as template | `use-as-template` | Composer prefill |
| Export | `export` | Download `.md` |
| More | `more` | Follow-up ORB actions |

Icons use tooltips + `sr-only` labels for accessibility.

## User messages

`data-orb-user-message-actions`: Copy, Edit, Resend (when send available).

## Mobile

Primary icons visible; overflow actions in More menu on narrow viewports.

## Governance

No internal brain metadata or debug actions exposed in the action row.
