from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


REVIEW_STATUSES = {"submitted", "pending_review", "review_requested", "changes_requested"}
SAVED_STATUSES = {"saved", "approved", "final", "completed", "routed"}
FAILED_STATUSES = {"failed", "error", "retry_failed"}
DRAFT_STATUSES = {"draft", "autosaved", "local_draft"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalise_status(status: Any) -> str:
    return str(status or "").strip().lower().replace(" ", "_")


@dataclass(frozen=True)
class WorkflowSaveState:
    state: str
    label: str
    message: str
    retryable: bool = False
    requires_review: bool = False
    stale: bool = False
    source: str = "server"
    confidence: str = "confirmed"
    continuity: str = "current"
    updated_at: str = field(default_factory=_now)


class WorkflowReliabilityService:
    """Shared workflow reliability rules for calm, truthful save feedback."""

    def save_state_for_record(
        self,
        record: dict[str, Any] | None,
        *,
        pending_queue_items: list[dict[str, Any]] | None = None,
        stale_session: bool = False,
        offline: bool = False,
    ) -> WorkflowSaveState:
        pending = pending_queue_items or []
        failed = [item for item in pending if _normalise_status(item.get("status")) in FAILED_STATUSES]
        retrying = [item for item in pending if _normalise_status(item.get("status")) in {"pending", "retrying", "queued"}]
        status = _normalise_status((record or {}).get("workflow_status") or (record or {}).get("status"))

        if offline:
            return WorkflowSaveState(
                state="offline_draft",
                label="Saved on this device",
                message="Work is held safely here and will retry when the connection returns.",
                retryable=True,
                source="local",
                stale=stale_session,
                confidence="local_only",
                continuity="offline_queue_pending",
            )
        if stale_session:
            return WorkflowSaveState(
                state="stale_session",
                label="Needs refresh",
                message="This record changed elsewhere. Review the latest version before saving again.",
                retryable=True,
                stale=True,
                confidence="needs_review",
                continuity="compare_before_save",
            )
        if failed:
            return WorkflowSaveState(
                state="retry_needed",
                label="Save needs retry",
                message="The last save did not complete. Nothing has been overwritten; retry is available.",
                retryable=True,
                confidence="retry_available",
                continuity="idempotency_key_retained",
            )
        if retrying:
            return WorkflowSaveState(
                state="syncing",
                label="Syncing",
                message="Changes are queued and being written to the live record.",
                retryable=False,
                confidence="queue_replay_pending",
                continuity="pending_reconciliation",
            )
        if status in REVIEW_STATUSES:
            return WorkflowSaveState(
                state="review",
                label="Sent for review",
                message="The draft is saved and waiting in the review chain.",
                requires_review=True,
                confidence="confirmed",
                continuity="review_chain",
            )
        if status in DRAFT_STATUSES:
            return WorkflowSaveState(
                state="draft",
                label="Draft saved",
                message="Draft is safely saved and can be continued.",
                confidence="draft_confirmed",
                continuity="continue_later",
            )
        if status in SAVED_STATUSES:
            return WorkflowSaveState(
                state="saved",
                label="Saved",
                message="Latest changes are on the live record.",
            )
        if record:
            return WorkflowSaveState(
                state="draft",
                label="Record available",
                message="Record context is available; save confidence depends on the latest confirmation.",
                confidence="context_available",
                continuity="verify_latest_confirmation",
            )
        return WorkflowSaveState(
            state="empty",
            label="Not saved yet",
            message="Start recording, then save when ready.",
            source="none",
        )

    def duplicate_submit_guard(self, *, idempotency_key: str | None, seen_keys: set[str]) -> dict[str, Any]:
        if not idempotency_key:
            return {"allowed": True, "duplicate": False, "reason": "no_idempotency_key"}
        if idempotency_key in seen_keys:
            return {
                "allowed": False,
                "duplicate": True,
                "reason": "duplicate_submit",
                "message": "This submit is already being processed.",
            }
        seen_keys.add(idempotency_key)
        return {"allowed": True, "duplicate": False, "reason": "accepted"}

    def reconcile_timeline(self, events: list[dict[str, Any]]) -> dict[str, Any]:
        deduped: list[dict[str, Any]] = []
        seen: set[str] = set()
        for event in sorted(events, key=lambda item: str(item.get("occurred_at") or item.get("created_at") or "")):
            key = str(event.get("event_id") or event.get("id") or event.get("client_event_id") or "")
            if key and key in seen:
                continue
            if key:
                seen.add(key)
            deduped.append(event)
        return {
            "events": deduped,
            "dropped_duplicates": len(events) - len(deduped),
            "reconciled_at": _now(),
            "continuity": "complete" if len(deduped) == len(events) else "deduplicated",
        }

    def recovery_plan(
        self,
        *,
        offline: bool = False,
        stale_session: bool = False,
        failed_operations: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        failed = failed_operations or []
        steps: list[str] = []
        if offline:
            steps.append("Keep editing locally and retry automatically when online.")
        if stale_session:
            steps.append("Refresh source record, compare draft, then save a new version.")
        if failed:
            steps.append("Retry failed saves/uploads with the original idempotency keys.")
        return {
            "recoverable": bool(offline or stale_session or failed),
            "steps": steps,
            "failed_count": len(failed),
            "calm_copy": "Your work has not been discarded.",
            "save_confidence": "local_or_queue_safe" if offline or failed else "review_latest_before_retry" if stale_session else "confirmed",
            "queue_replay_copy": "Queued work will replay with original idempotency keys where available.",
        }


workflow_reliability_service = WorkflowReliabilityService()
