"""Governed trusted source registry for ORB 9 expert brain."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

_REGISTRY_PATH = os.path.join(
    os.path.dirname(__file__), "..", "assistant", "knowledge", "trusted_sources_registry.json"
)

_REQUIRED_FIELDS = (
    "source_id",
    "title",
    "owner",
    "source_type",
    "trust_tier",
    "url",
    "domain",
    "applies_to",
    "auto_check_allowed",
    "auto_apply_allowed",
    "human_approval_required",
    "citation_required",
    "summary_allowed",
    "full_text_allowed",
    "usage_rules",
)

_TRUST_TIERS = frozenset({"gold", "silver", "bronze", "local", "user_provided"})
_PROTECTED_TYPES = frozenset(
    {"statutory_guidance", "legislation", "inspection_framework", "clinical_guidance", "local_safeguarding"}
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class TrustedSourceRegistryService:
    def __init__(self) -> None:
        self._cache: dict[str, Any] | None = None

    def _load_raw(self) -> dict[str, Any]:
        if self._cache is not None:
            return self._cache
        path = os.path.normpath(_REGISTRY_PATH)
        with open(path, encoding="utf-8") as f:
            self._cache = json.load(f)
        return self._cache

    def list_sources(self) -> list[dict[str, Any]]:
        return list(self._load_raw().get("sources") or [])

    def get_source(self, source_id: str) -> dict[str, Any] | None:
        for src in self.list_sources():
            if src.get("source_id") == source_id:
                return dict(src)
        return None

    def get_by_ids(self, source_ids: list[str]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for sid in source_ids:
            src = self.get_source(sid)
            if src:
                out.append(src)
        return out

    def sources_for_applies_to(self, tag: str) -> list[dict[str, Any]]:
        tag_lower = tag.lower()
        return [
            s
            for s in self.list_sources()
            if tag_lower in [str(a).lower() for a in (s.get("applies_to") or [])]
        ]

    def validate_source_metadata(self, source: dict[str, Any]) -> list[str]:
        errors: list[str] = []
        for field in _REQUIRED_FIELDS:
            if field not in source:
                errors.append(f"missing:{field}")
        tier = str(source.get("trust_tier") or "")
        if tier not in _TRUST_TIERS:
            errors.append(f"invalid trust_tier:{tier}")
        stype = str(source.get("source_type") or "")
        if stype in _PROTECTED_TYPES and source.get("auto_apply_allowed") is True:
            errors.append("auto_apply_allowed must be false for protected source types")
        if tier in ("gold", "silver") and source.get("human_approval_required") is not True:
            if stype in _PROTECTED_TYPES:
                errors.append("human_approval_required must be true for gold/silver statutory sources")
        return errors

    def validate_registry(self) -> list[str]:
        errors: list[str] = []
        seen: set[str] = set()
        for src in self.list_sources():
            sid = str(src.get("source_id") or "")
            if sid in seen:
                errors.append(f"duplicate source_id:{sid}")
            seen.add(sid)
            errors.extend(f"{sid}:{e}" for e in self.validate_source_metadata(src))
        return errors

    def source_confidence(self, source_id: str) -> float:
        src = self.get_source(source_id)
        if not src:
            return 0.0
        tier = str(src.get("trust_tier") or "")
        return {
            "gold": 1.0,
            "silver": 0.9,
            "bronze": 0.75,
            "local": 0.85,
            "user_provided": 0.6,
        }.get(tier, 0.5)

    def allowed_for_auto_check(self, source_id: str) -> bool:
        src = self.get_source(source_id)
        return bool(src and src.get("auto_check_allowed"))

    def allowed_for_auto_apply(self, source_id: str) -> bool:
        src = self.get_source(source_id)
        if not src:
            return False
        if str(src.get("source_type") or "") in _PROTECTED_TYPES:
            return False
        return bool(src.get("auto_apply_allowed"))

    def registry_version(self) -> str:
        return str(self._load_raw().get("version") or "unknown")

    def to_summary(self, source_id: str) -> dict[str, Any] | None:
        src = self.get_source(source_id)
        if not src:
            return None
        return {
            "source_id": source_id,
            "title": src.get("title"),
            "trust_tier": src.get("trust_tier"),
            "source_type": src.get("source_type"),
            "confidence": self.source_confidence(source_id),
            "citation_required": src.get("citation_required"),
            "summary_allowed": src.get("summary_allowed"),
            "url": src.get("url"),
            "checked_at": _utc_now_iso(),
        }


trusted_source_registry_service = TrustedSourceRegistryService()
