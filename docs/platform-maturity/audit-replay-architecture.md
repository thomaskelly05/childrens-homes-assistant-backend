# Audit replay architecture

Audit replay must provide one provider-safe timeline across platform audit, OS audit, lifecycle transitions, assistant oversight, governance signoffs and inspection evidence changes.

## Canonical contract

Use `schemas.audit_contracts.AuditTimelineEvent` for actor, provider, home, entity, action, timestamp, chronology linkage, evidence linkage, lifecycle linkage, governance linkage, assistant linkage, correlation ID and replay metadata.

## Replay rule

Replay APIs must require provider/home scope from `ProviderContext`, redact care content, return stable cursors and expose only records visible to the requesting actor.

## Migration notes

`services.audit_timeline_repository` writes and replays canonical timeline rows from `operational_audit_timeline`. Existing `audit_events` replay remains available while audit sinks migrate to the canonical timeline.
