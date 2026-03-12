from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func, String
from db.connection import Base


class StaffJournal(Base):
    __tablename__ = "staff_journal"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)

    # Overview
    holding_today = Column(Text, nullable=True)
    practice_today = Column(Text, nullable=True)
    reflection_today = Column(Text, nullable=True)

    # Gibbs
    description = Column(Text, nullable=True)
    feelings = Column(Text, nullable=True)
    evaluation = Column(Text, nullable=True)
    analysis = Column(Text, nullable=True)
    conclusion = Column(Text, nullable=True)
    action_plan = Column(Text, nullable=True)

    # PACE
    playfulness = Column(Text, nullable=True)
    acceptance = Column(Text, nullable=True)
    curiosity = Column(Text, nullable=True)
    empathy = Column(Text, nullable=True)

    # Leadership
    leadership_style = Column(String(100), nullable=True)
    leadership_reflection = Column(Text, nullable=True)

    # Impact / Safeguarding
    child_impact = Column(Text, nullable=True)
    team_impact = Column(Text, nullable=True)
    safeguarding_considerations = Column(Text, nullable=True)
    support_needed = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
