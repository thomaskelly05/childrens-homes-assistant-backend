from __future__ import annotations

import os
import time
from dataclasses import asdict, dataclass, field
from typing import Any

from services.intelligence.chronology_cache import invalidate_chronology_cache

PROJECTION_DEDUPE_SECONDS = int(os.getenv("PROJECTION_DEDUPE_SECONDS", "20"))
PROJECTION_MAX_DEDUPE_KEYS = int(os.getenv("PROJECTION_MAX_DEDUPE_KEYS", "5000"))

_PROJECTION_DEDUPE: dict[str, float] = {}


@dataclass(frozen=True)
class ProjectionRequest:
    domain: str
    entity_type: str
    entity_id: str
    transition_type: str
    home_id: int | str | None = None
    provider_id: int | str | None = None
    young_person_id: int | str | None = None
    staff_id: int | str | None = None
    correlation_id: str | None = None
    source_event_id: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)

    @property
    def dedupe_key(self) -> str:
        return ":".join(
            [
                str(self.domain or "unknown"),
                str(self.entity_type or "entity"),
                str(self.entity_id or "unknown"),
                str(self.transition_type or "changed"),
                str(self.correlation_id or ""),
            ]
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self) | {"dedupe_key": self.dedupe_key}


class ProjectionCoordinator:
    """Coordinates operational projection invalidation without rebuilding each domain repeatedly.

    This layer is intentionally lightweight and synchronous. It provides a single place for
    records/workflows/realtime publishers to declare that projections are dirty. Consumers
    can then rebuild lazily using their own existing routes/services.
    """

    def _now(self) -> float:
        return time.time()

    def _prune(self) -> None:
        now = self._now()
        for key, created_at in list(_PROJECTION_DEDUPE.items()):
            if now - created_at > PROJECTION_DEDUPE_SECONDS:
                _PROJECTION_DEDUPE.pop(key, None)
        while len(_PROJECTION_DEDUPE) > PROJECTION_MAX_DEDUPE_KEYS:
            first_key = next(iter(_PROJECTION_DEDUPE), None)
            if first_key is None:
                break
            _PROJECTION_DEDUPE.pop(first_key, None)

    def is_duplicate(self, request: ProjectionRequest) -> bool:
        self._prune()
        key = request.dedupe_key
        if key in _PROJECTION_DEDUPE:
            return True
        _PROJECTION_DEDUPE[key] = self._now()
        return False

    def projection_targets(self, request: ProjectionRequest) -> list[str]:
        targets = {"dashboard", "orb"}
        entity = request.entity_type.lower()
        domain = request.domain.lower()
        transition = request.transition_type.lower()

        if entity in {"daily_note", "incident", "safeguarding", "missing_episode", "risk_assessment", "health_record", "education_record", "family_contact", "keywork_session", "support_plan"}:
            targets.update({"chronology", "evidence", "child_workspace"})
        if entity in {"incident", "safeguarding", "missing_episode", "risk_assessment"} or domain == "safeguarding":
            targets.update({"safeguarding", "governance", "inspection", "alerts"})
        if entity in {"supervision", "training", "probation", "staff_evidence", "shift", "rota"} or domain in {"workforce", "staff"}:
            targets.update({"workforce", "governance"})
        if entity in {"document", "template", "policy", "statutory_document"} or domain == "documents":
            targets.update({"documents", "evidence", "inspection"})
        if entity in {"reg44", "reg45", "statement_of_purpose", "policy", "compliance_action"} or domain == "governance":
            targets.update({"governance", "inspection", "reports"})
        if transition in {"approved", "submitted", "reviewed", "signed_off", "escalated", "returned"}:
            targets.update({"actions", "notifications"})

        return sorted(targets)

    def invalidate(self, request: ProjectionRequest) -> dict[str, Any]:
        duplicate = self.is_duplicate(request)
        targets = self.projection_targets(request)

        if not duplicate and "chronology" in targets:
            if request.young_person_id:
                invalidate_chronology_cache(f"young_person::{request.young_person_id}")
            elif request.home_id:
                invalidate_chronology_cache(f"home::{request.home_id}")
            else:
                invalidate_chronology_cache()

        return {
            "ok": True,
            "duplicate": duplicate,
            "request": request.to_dict(),
            "projection_targets": targets,
            "invalidated": [] if duplicate else targets,
        }


projection_coordinator = ProjectionCoordinator()
