from __future__ import annotations

from typing import Any


def gold_standard_response(
    *,
    item: dict[str, Any] | None = None,
    id: Any | None = None,
    message: str | None = None,
    workflow: Any | None = None,
    sync: Any | None = None,
    intelligence: Any | None = None,
    versioned: Any | None = None,
    **extra: Any,
) -> dict[str, Any]:
    """Build the standard child workflow response shape.

    Gold-standard workflow responses should let the frontend update immediately
    without guessing which key contains the saved record. The helper keeps
    backwards-compatible top-level keys while always exposing the canonical
    fields: ok, id, item, workflow and sync.
    """

    safe_item = item if isinstance(item, dict) else {}
    record_id = id or safe_item.get("id") or safe_item.get("source_id") or safe_item.get("record_id")

    response: dict[str, Any] = {
        "ok": True,
        "id": record_id,
        "item": safe_item,
        "workflow": workflow or {},
        "sync": sync or {},
    }

    if message:
        response["message"] = message
    if intelligence is not None:
        response["intelligence"] = intelligence
    if versioned is not None:
        response["versioned"] = versioned

    response.update({key: value for key, value in extra.items() if value is not None})
    return response


def sync_not_observed(reason: str = "legacy_service_did_not_return_sync_result") -> dict[str, Any]:
    return {
        "attempted": False,
        "ok": None,
        "observed": False,
        "reason": reason,
    }
