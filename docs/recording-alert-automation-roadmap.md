# Recording alert automation roadmap

## Delivered in this pass

- Metadata-only **digest** and **badge summary** APIs
- **Manual run checks** with last-run metadata
- AppShell Record nav **badge** (manager roles)
- Care Hub **Recording oversight** digest
- Reusable **RecordingManagerDigest** component (Care Hub, governance, alerts)
- ORB prompt chips via operational `/assistant/orb` only
- Optional SQL persistence for check runs (`084_recording_alert_check_runs.sql`)

## Not in scope (by design)

- Background scheduler / cron
- Push notifications or email
- Auto-resolution of safeguarding alerts
- Automated safeguarding threshold decisions
- Raw draft bodies in badges or digests
- Standalone `/orb` access to alert APIs

## Next increments

1. **Event-driven checks** — run `run_alert_checks` after draft save, review decision, formal submission attempt
2. **Per-home scheduling** — provider-configured check interval when job infrastructure is available
3. **Connect notifications** — urgent/safeguarding badge events to existing notification bell (metadata only)
4. **Shift handover digest** — export digest snapshot into handover workflow
5. **Assignment rules** — route alerts to duty manager / on-call by home

## Manager judgement boundary

All automation stops at surfacing metadata and recommendations. Managers acknowledge, assign and resolve alerts manually.
