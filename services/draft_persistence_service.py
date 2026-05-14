from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stable_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, default=str, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


@dataclass(frozen=True)
class DraftEnvelope:
    draft_id: str
    owner_key: str
    entity_type: str
    entity_id: str | None
    payload: dict[str, Any]
    payload_hash: str
    base_version: str | None = None
    server_version: str | None = None
    status: str = "draft"
    updated_at: str = field(default_factory=_now)


class DraftPersistenceService:
    """Version-aware draft helpers shared by browser and backend flows."""

    def owner_key(self, *, home_id: Any = None, user_id: Any = None, young_person_id: Any = None) -> str:
        return ":".join(str(part or "none") for part in (home_id, user_id, young_person_id))

    def draft_key(self, *, entity_type: str, entity_id: Any = None, owner_key: str) -> str:
        raw = f"{owner_key}:{entity_type}:{entity_id or 'new'}"
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()

    def envelope(
        self,
        *,
        entity_type: str,
        payload: dict[str, Any],
        owner_key: str,
        entity_id: str | None = None,
        base_version: str | None = None,
        server_version: str | None = None,
        status: str = "draft",
    ) -> DraftEnvelope:
        return DraftEnvelope(
            draft_id=self.draft_key(entity_type=entity_type, entity_id=entity_id, owner_key=owner_key),
            owner_key=owner_key,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
            payload_hash=_stable_hash(payload),
            base_version=base_version,
            server_version=server_version,
            status=status,
        )

    def conflict_status(
        self,
        *,
        draft: DraftEnvelope,
        latest_server_version: str | None,
        latest_server_hash: str | None = None,
    ) -> dict[str, Any]:
        if latest_server_version and draft.base_version and latest_server_version != draft.base_version:
            if latest_server_hash and latest_server_hash == draft.payload_hash:
                return {"conflict": False, "state": "already_saved", "message": "Draft matches the live record."}
            return {
                "conflict": True,
                "state": "review_before_save",
                "message": "The live record changed after this draft started. Review before overwriting.",
            }
        return {"conflict": False, "state": "safe_to_save", "message": "Draft can be saved."}

    def merge_summary(self, *, draft: DraftEnvelope, live_record: dict[str, Any] | None = None) -> dict[str, Any]:
        live = live_record or {}
        changed_fields = [key for key, value in draft.payload.items() if live.get(key) != value]
        return {
            "draft_id": draft.draft_id,
            "status": draft.status,
            "changed_fields": changed_fields,
            "changed_count": len(changed_fields),
            "updated_at": draft.updated_at,
        }


draft_persistence_service = DraftPersistenceService()
