from pydantic import BaseModel
from typing import Optional


class StaffJournalCreate(BaseModel):
    staff_id: int
    holding_today: Optional[str] = None
    practice_today: Optional[str] = None
    reflection_today: Optional[str] = None
    description: Optional[str] = None
    feelings: Optional[str] = None
    evaluation: Optional[str] = None
    analysis: Optional[str] = None
    conclusion: Optional[str] = None
    action_plan: Optional[str] = None
    playfulness: Optional[str] = None
    acceptance: Optional[str] = None
    curiosity: Optional[str] = None
    empathy: Optional[str] = None
    leadership_style: Optional[str] = None
    leadership_reflection: Optional[str] = None
    child_impact: Optional[str] = None
    team_impact: Optional[str] = None
    safeguarding_considerations: Optional[str] = None
    support_needed: Optional[str] = None


class StaffJournalUpdate(BaseModel):
    holding_today: Optional[str] = None
    practice_today: Optional[str] = None
    reflection_today: Optional[str] = None
    description: Optional[str] = None
    feelings: Optional[str] = None
    evaluation: Optional[str] = None
    analysis: Optional[str] = None
    conclusion: Optional[str] = None
    action_plan: Optional[str] = None
    playfulness: Optional[str] = None
    acceptance: Optional[str] = None
    curiosity: Optional[str] = None
    empathy: Optional[str] = None
    leadership_style: Optional[str] = None
    leadership_reflection: Optional[str] = None
    child_impact: Optional[str] = None
    team_impact: Optional[str] = None
    safeguarding_considerations: Optional[str] = None
    support_needed: Optional[str] = None
