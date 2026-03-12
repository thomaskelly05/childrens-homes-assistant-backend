from sqlalchemy import Column, Integer, Text, DateTime
from sqlalchemy.sql import func
from db.connection import Base


class AINote(Base):

    __tablename__ = "ai_notes"

    id = Column(Integer, primary_key=True, index=True)

    child_id = Column(Integer)

    staff_id = Column(Integer)

    transcript = Column(Text)

    ai_draft = Column(Text)

    final_note = Column(Text)

    safeguarding_flag = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
