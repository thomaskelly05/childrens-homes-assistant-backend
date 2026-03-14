from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class YoungPerson(Base):
    __tablename__ = "young_people"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    home_id: Mapped[int] = mapped_column(
        ForeignKey("homes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[str] = mapped_column(Text, nullable=False)
    preferred_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ethnicity: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    nhs_number: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    local_id_number: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admission_date: Mapped[date] = mapped_column(Date, nullable=False)
    discharge_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    placement_status: Mapped[str] = mapped_column(Text, nullable=False, default="active")
    primary_keyworker_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    summary_risk_level: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    legal_statuses = relationship(
        "YoungPersonLegalStatus",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    contacts = relationship(
        "YoungPersonContact",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    education_profile = relationship(
        "YoungPersonEducationProfile",
        back_populates="young_person",
        uselist=False,
        cascade="all, delete-orphan",
    )
    health_profile = relationship(
        "YoungPersonHealthProfile",
        back_populates="young_person",
        uselist=False,
        cascade="all, delete-orphan",
    )
    communication_profile = relationship(
        "YoungPersonCommunicationProfile",
        back_populates="young_person",
        uselist=False,
        cascade="all, delete-orphan",
    )
    identity_profile = relationship(
        "YoungPersonIdentityProfile",
        back_populates="young_person",
        uselist=False,
        cascade="all, delete-orphan",
    )
    alerts = relationship(
        "YoungPersonAlert",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    daily_notes = relationship(
        "DailyNote",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    support_plans = relationship(
        "SupportPlan",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    risk_assessments = relationship(
        "RiskAssessment",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    safeguarding_records = relationship(
        "SafeguardingRecord",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    missing_episodes = relationship(
        "MissingEpisode",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    health_records = relationship(
        "HealthRecord",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    medication_profiles = relationship(
        "MedicationProfile",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    medication_records = relationship(
        "MedicationRecord",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    education_records = relationship(
        "EducationRecord",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    family_contact_records = relationship(
        "FamilyContactRecord",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    keywork_sessions = relationship(
        "KeyworkSession",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    achievement_records = relationship(
        "AchievementRecord",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    review_meetings = relationship(
        "ReviewMeeting",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    chronology_events = relationship(
        "ChronologyEvent",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    compliance_items = relationship(
        "ComplianceItem",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    record_links = relationship(
        "RecordLink",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
    manager_actions = relationship(
        "ManagerAction",
        back_populates="young_person",
        cascade="all, delete-orphan",
    )
