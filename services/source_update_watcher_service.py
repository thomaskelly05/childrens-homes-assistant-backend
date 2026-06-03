"""Watch trusted registry sources for page/hash changes — never auto-apply protected content."""

from __future__ import annotations

import hashlib
from typing import Any

from services.source_change_review_service import source_change_review_service
from services.trusted_source_registry_service import trusted_source_registry_service


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class SourceUpdateWatcherService:
    """Compares known content hashes; creates pending reviews on change."""

    def __init__(self) -> None:
        self._known_hashes: dict[str, str] = {}

    def register_baseline(self, source_id: str, content: str) -> dict[str, Any]:
        digest = _hash_text(content)
        self._known_hashes[source_id] = digest
        return {"source_id": source_id, "hash": digest, "status": "baseline_registered"}

    def check_source(
        self,
        source_id: str,
        *,
        fetched_content: str | None = None,
        fetched_headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        src = trusted_source_registry_service.get_source(source_id)
        if not src:
            return {"source_id": source_id, "status": "unknown_source"}
        if not trusted_source_registry_service.allowed_for_auto_check(source_id):
            return {"source_id": source_id, "status": "auto_check_disabled"}

        if fetched_content is None:
            return {
                "source_id": source_id,
                "status": "check_skipped",
                "reason": "No fetched content supplied; watcher does not scrape the open web.",
            }

        new_hash = _hash_text(fetched_content)
        old_hash = self._known_hashes.get(source_id)
        if old_hash is None:
            self._known_hashes[source_id] = new_hash
            return {"source_id": source_id, "status": "baseline_set", "hash": new_hash}

        if new_hash == old_hash:
            return {"source_id": source_id, "status": "unchanged", "hash": new_hash}

        review = source_change_review_service.create_pending_review(
            source_id=source_id,
            old_hash=old_hash,
            new_hash=new_hash,
            headers=fetched_headers or {},
            source_metadata=src,
        )
        return {
            "source_id": source_id,
            "status": "changed",
            "review_id": review.get("review_id"),
            "auto_apply_blocked": True,
        }


source_update_watcher_service = SourceUpdateWatcherService()
