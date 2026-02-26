from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    email: str
    role: str
    home_id: int | None = None

class UserOut(UserBase):
    id: int
    created_at: datetime
