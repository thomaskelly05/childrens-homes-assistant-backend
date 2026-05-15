from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


class DocumentAutosaveService:
    """Truthful autosave envelopes that never overwrite approved records silently."""

    def build_autosave(
        self,
        *,
        document: dict[str, Any],
        sections: dict[str, str],
        current_user: dict[str, Any],
        client_token: str,
        base_version: int | str | None = None,
    ) -> dict[str, Any]:
        status = str(document.get("status") or "")
        if status in {"approved", "archived"}:
            return {
                "ok": False,
                "state": "blocked",
                "message": "This document is approved or archived. Autosave was not applied.",
                "document_id": str(document.get("document_id") or document.get("id")),
            }
        latest_version = document.get("version_number") or document.get("latest_version")
        conflict = base_version not in (None, "", latest_version, str(latest_version))
        return {
            "ok": not conflict,
            "autosave_id": str(uuid4()),
            "document_id": str(document.get("document_id") or document.get("id")),
            "sections": sections,
            "base_version": base_version,
            "client_token": client_token,
            "created_by": current_user.get("id") or current_user.get("user_id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "state": "review_before_save" if conflict else "autosaved",
            "conflict": conflict,
            "message": "Server version changed. Review the draft before saving." if conflict else "Draft autosaved.",
        }

    def recover_latest(self, autosaves: list[dict[str, Any]]) -> dict[str, Any] | None:
        candidates = [item for item in autosaves if not item.get("conflict")]
        return sorted(candidates, key=lambda item: str(item.get("created_at") or ""), reverse=True)[0] if candidates else None


document_autosave_service = DocumentAutosaveService()
