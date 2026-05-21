from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text

try:
    from database import Base
except Exception:
    from sqlalchemy.orm import declarative_base

    Base = declarative_base()


class LifeEchoEventModel(Base):
    __tablename__ = "life_echo_events"

    id = Column(String, primary_key=True, index=True)
    child_id = Column(String, nullable=False, index=True)

    source = Column(String, nullable=False)
    source_system = Column(String, nullable=False)
    source_record_id = Column(String, nullable=True)

    event_type = Column(String, nullable=False, index=True)
    emotional_tone = Column(String, nullable=False, index=True)
    visibility = Column(String, nullable=False)

    title = Column(String, nullable=False)
    narrative = Column(Text, nullable=False)
    child_voice = Column(Text, nullable=True)

    intensity = Column(Integer, nullable=True)

    triggers = Column(JSON, nullable=False, default=list)
    protective_factors = Column(JSON, nullable=False, default=list)
    staff_ids = Column(JSON, nullable=False, default=list)
    relationship_ids = Column(JSON, nullable=False, default=list)
    tags = Column(JSON, nullable=False, default=list)
    metadata = Column(JSON, nullable=False, default=dict)

    occurred_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
