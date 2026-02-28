from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func
from db import Base

class StaffJournal(Base):
    __tablename__ = "staff_journal"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    holding_today = Column(Text, nullable=True)
    practice_today = Column(Text, nullable=True)
    reflection_today = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
