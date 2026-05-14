from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any
from uuid import uuid4


class DocumentVersionService:
    """Immutable version snapshots for editable document records."""

    def snapshot(self, *, document: dict[str, Any], reason: str, current_user: dict[str, Any], version_number: int) -> dict[str, Any]:
        frozen = copy.deepcopy(document)
        return {
            "version_id": str(uuid4()),
            "document_id": str(document.get("document_id") or document.get("id")),
            "version_number": version_number,
            "reason": reason,
            "snapshot": frozen,
            "content_hash": self.content_hash(frozen),
            "created_by": current_user.get("id") or current_user.get("user_id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "immutable": True,
        }

    def content_hash(self, document: dict[str, Any]) -> str:
        encoded = json.dumps(document, sort_keys=True, default=str, separators=(",", ":")).encode("utf-8")
        return sha256(encoded).hexdigest()

    def changed(self, *, before: dict[str, Any], after: dict[str, Any]) -> bool:
        comparable_before = {key: before.get(key) for key in ["title", "sections", "links", "metadata", "status"]}
        comparable_after = {key: after.get(key) for key in ["title", "sections", "links", "metadata", "status"]}
        return self.content_hash(comparable_before) != self.content_hash(comparable_after)


document_version_service = DocumentVersionService()
