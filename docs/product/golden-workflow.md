# IndiCare OS golden workflow

## Workflow

Pilot QA should use this path as the protected golden workflow:

1. Sign in at `/login` with the demo manager account.
2. Open `/home` and choose Jamie from the child selector.
3. Enter Jamie's journey.
4. Add a Daily Note.
5. Use the smart suggestion chips when safeguarding, incident, action, plan or child-voice wording is detected.
6. Save the Daily Note and read the confirmation carefully:
   - "Saved" means the live backend accepted the record.
   - "Draft saved locally" means the record is only held in browser safe storage and has not been added to the child's record.
   - A failure message means the local draft remains available and the user must retry when the backend is available.
7. Create a linked safeguarding follow-up from the journey recording options.
8. Open chronology, actions, manager QA, handover, reports and evidence from Jamie's journey.
9. Confirm Orb is visible and does not block the form.
10. Log out and confirm sensitive drafts, child context, assistant state and Orb state are cleared.

## Expected production behaviour

- Golden-path controls must navigate somewhere real or show a controlled limitation.
- Recording suggestions never persist silently.
- Draft status must not be presented as a live child-record save.
- Orb is optional on this path and must stay non-blocking.
- Logout must clear local drafts, child context, temporary report state, assistant state and Orb state.

## Current limitations

- Demo young person IDs such as `yp-jamie` cannot be written to live numeric backend endpoints. The recording API returns an explicit local-draft status for those IDs.
- Some manager QA actions are visible as controlled limitations until the live sign-off endpoint is connected.
- Orb voice is available from the global Orb button; form-level dictation shows a controlled limitation instead of pretending to dictate directly into the form.

## Manual QA fallback

If E2E cannot run, manually complete the workflow in a browser with `NEXT_PUBLIC_E2E_TEST_MODE=1 npm run dev` from `frontend-next/`, then verify the same checklist in this document.
