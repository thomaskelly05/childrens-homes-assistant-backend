# ORB Saved Output Workflow Convergence

## What already existed

- Backend: `services/orb_saved_output_service.py`, `routers/orb_saved_output_routes.py`
- Frontend list/detail: `orb-saved-outputs-panel.tsx`, `orb-saved-output-detail-actions.tsx`
- Adapters: `orb-saved-output-adapters.ts` (save, export, rerun, source/type labels)
- Local fallback: `orb-saved-outputs-local.ts`, `orb-saved-outputs-resilience.ts`
- Shared output renderer: `orb-intelligence-output.tsx`

## What was converged

### Open in ORB Write (detail view)

Previously: empty-state button opened blank Write; detail view lacked Write handoff.

Now:

1. `buildSavedOutputWriteHandoff(record)` in `orb-write-converged-handoff.ts` builds content payload from markdown/summary.
2. `handoffSavedOutputToOrbWrite(record)` writes `orb-write-content-handoff-v1` session storage.
3. `OrbSavedOutputDetailActions` shows **Open in ORB Write** (`data-orb-saved-output-open-write`).
4. `orb-care-companion.tsx` wires `onOpenSavedOutputInOrbWrite` → close panel → open Write station.

### Source and type display

Already present on detail header:

- `savedOutputTypeLabel(detail.type)`
- `savedOutputSourceLabel(detail)` from metadata `source_feature`

Sources mapped: Chat, Dictate, Voice, Documents, Shift Builder, Action Engine, etc.

### Empty state

Updated to guide users to:

- Chat (`data-orb-saved-start-chat`)
- Dictate (`data-orb-saved-start-dictate`)
- ORB Write (`data-orb-saved-start-write`)
- Documents (`data-orb-saved-start-documents`)

### Related document creation

Where ORB Write handoff supports `record_type_id` / `suggested_output_type` from saved metadata, Write opens with appropriate record type. Create-related actions available in Write panel after handoff.

## Routes used (unchanged)

- `GET/POST /orb/saved-outputs/*` — list, create, export
- `reuseOrbSavedOutput`, `exportOrbSavedOutput` — client helpers
- No second saved-output system introduced

## Re-run flows (unchanged)

| Rerun kind | Destination |
|---|---|
| `document_lens` | Documents panel with lens + source text |
| `policy_card` | Documents |
| `shift_focus` | Shift Builder (legacy panel) |
| `action_engine` | Chat action engine |
| `voice_transcript` | Unavailable (by design) |

## Boundary lines

`ORB_SAVED_OUTPUT_BOUNDARY_LINES` remain visible in detail actions — standalone ORB does not access live care records.
