from pydantic import BaseModel
from typing import Optional

class PartnerAssistantRequest(BaseModel):
    message: str
    organisation_id: Optional[str] = None
    user_role: Optional[str] = None

class PartnerAssistantResponse(BaseModel):
    answer: str
    safeguarding_level: str = "standard"
    follow_up_required: bool = False
