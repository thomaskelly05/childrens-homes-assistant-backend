from pydantic import BaseModel
from typing import Optional


class StaffJournalCreate(BaseModel):
    staff_id: int

    # Overview
    holding_today: Optional[str] = None
    practice_today: Optional[str] = None
    reflection_today: Optional[str] = None

    # Gibbs
    description: Optional[str] = None
    feelings: Optional[str] = None
    evaluation: Optional[str] = None
    analysis: Optional[str] = None
    conclusion: Optional[str] = None
    action_plan: Optional[str] = None

    # PACE
    playfulness: Optional[str] = None
    acceptance: Optional[str] = None
    curiosity: Optional[str] = None
    empathy: Optional[str] = None

    # Leadership
    leadership_style: Optional[str] = None
    leadership_reflection: Optional[str] = None

    # Impact / Safeguarding
    child_impact: Optional[str] = None
    team_impact: Optional[str] = None
    safeguarding_considerations: Optional[str] = None
    support_needed: Optional[str] = None


class StaffJournalUpdate(BaseModel):
    # Overview
    holding_today: Optional[str] = None
    practice_today: Optional[str] = None
    reflection_today: Optional[str] = None

    # Gibbs
    description: Optional[str] = None
    feelings: Optional[str] = None
    evaluation: Optional[str] = None
    analysis: Optional[str] = None
    conclusion: Optional[str] = None
    action_plan: Optional[str] = None

    # PACE
    playfulness: Optional[str] = None
    acceptance: Optional[str] = None
    curiosity: Optional[str] = None
    empathy: Optional[str] = None

    # Leadership
    leadership_style: Optional[str] = None
    leadership_reflection: Optional[str] = None

    # Impact / Safeguarding
    child_impact: Optional[str] = None
    team_impact: Optional[str] = None
    safeguarding_considerations: Optional[str] = None
    support_needed: Optional[str] = None
