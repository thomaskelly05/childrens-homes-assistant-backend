from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy.orm import Session

from life_echo.models import LifeEchoEventModel
from life_echo.schemas import LifeEchoEvent, LifeEchoEventCreate


class LifeEchoRepository(Protocol):
    def create_event(self, payload: LifeEchoEventCreate) -> LifeEchoEvent:
        ...

    def get_timeline(self, child_id: str) -> list[LifeEchoEvent]:
        ...


class InMemoryLifeEchoRepository:
    """Fallback repository used until a database session is supplied."""

    def __init__(self) -> None:
        self._events: dict[str, list[LifeEchoEvent]] = defaultdict(list)

    def create_event(self, payload: LifeEchoEventCreate) -> LifeEchoEvent:
        event = LifeEchoEvent(**payload.model_dump())
        self._events[payload.child_id].append(event)
        self._events[payload.child_id].sort(key=lambda item: item.occurred_at)
        return event

    def get_timeline(self, child_id: str) -> list[LifeEchoEvent]:
        return self._events.get(child_id, [])


class SqlAlchemyLifeEchoRepository:
    """Database-backed repository for LifeEcho emotional continuity events."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_event(self, payload: LifeEchoEventCreate) -> LifeEchoEvent:
        event = LifeEchoEvent(**payload.model_dump())
        row = LifeEchoEventModel(
            id=event.id,
            child_id=event.child_id,
            source=event.source.value,
            source_system=event.source_system,
            source_record_id=event.source_record_id,
            event_type=event.event_type.value,
            emotional_tone=event.emotional_tone.value,
            visibility=event.visibility.value,
            title=event.title,
            narrative=event.narrative,
            child_voice=event.child_voice,
            intensity=event.intensity,
            triggers=event.triggers,
            protective_factors=event.protective_factors,
            staff_ids=event.staff_ids,
            relationship_ids=event.relationship_ids,
            tags=event.tags,
            event_metadata=event.metadata,
            occurred_at=event.occurred_at,
            created_at=event.created_at,
            updated_at=event.updated_at,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return _row_to_event(row)

    def get_timeline(self, child_id: str) -> list[LifeEchoEvent]:
        rows = (
            self.db.query(LifeEchoEventModel)
            .filter(LifeEchoEventModel.child_id == child_id)
            .order_by(LifeEchoEventModel.occurred_at.asc())
            .all()
        )
        return [_row_to_event(row) for row in rows]


def _row_to_event(row: LifeEchoEventModel) -> LifeEchoEvent:
    return LifeEchoEvent(
        id=row.id,
        child_id=row.child_id,
        source=row.source,
        source_system=row.source_system,
        source_record_id=row.source_record_id,
        event_type=row.event_type,
        occurred_at=_as_aware(row.occurred_at),
        title=row.title,
        narrative=row.narrative,
        emotional_tone=row.emotional_tone,
        intensity=row.intensity,
        triggers=row.triggers or [],
        protective_factors=row.protective_factors or [],
        staff_ids=row.staff_ids or [],
        relationship_ids=row.relationship_ids or [],
        tags=row.tags or [],
        visibility=row.visibility,
        child_voice=row.child_voice,
        metadata=row.event_metadata or {},
        created_at=_as_aware(row.created_at),
        updated_at=_as_aware(row.updated_at),
    )


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)
