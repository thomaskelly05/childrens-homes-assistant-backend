# ORB Dictate Recorder Studio v3

## Layout

1. **Recorder bar** (`data-orb-dictate-recorder-bar`): record type, timer, status, record/pause/stop, Analyse, Generate, Open in ORB Write
2. **Privacy strip**: session boundary copy (always visible)
3. **Left**: live transcript panel with manual edit and speaker guidance
4. **Right**: ORB analysis cards/chips via `OrbDictateBrainPanel`
5. **Bottom rail**: output type chips (daily record, incident, safeguarding, chronology, handover, manager summary, action plan)

## Preserved APIs

- `/orb/dictate/analyze`
- `/orb/dictate/generate`
- `/orb/dictate/finalise`
- `/orb/dictate/edit` (via ORB Write AI panel)

## Handoff to ORB Write

`saveOrbWriteHandoff()` on finalise — unchanged. Top bar **Open in ORB Write** remains.

## Session privacy

No child profile storage. Transcript remains session-based.
