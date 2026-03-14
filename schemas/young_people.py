from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class YoungPersonBase(BaseModel):
    home_id: int
    first_name: str
    last_name: str
    preferred_name: Optional[str] = None
    date_of_birth: date
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    nhs_number: Optional[str] = None
    local_id_number: Optional[str] = None
    admission_date: date
    discharge_date: Optional[date] = None
    placement_status: str = "active"
    primary_keyworker_id: Optional[int] = None
    summary_risk_level: Optional[str] = None
    photo_url: Optional[str] = None
    archived: bool = False


class YoungPersonCreate(YoungPersonBase):
    pass


class YoungPersonUpdate(BaseModel):
    home_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    preferred_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    nhs_number: Optional[str] = None
    local_id_number: Optional[str] = None
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    placement_status: Optional[str] = None
    primary_keyworker_id: Optional[int] = None
    summary_risk_level: Optional[str] = None
    photo_url: Optional[str] = None
    archived: Optional[bool] = None


class YoungPersonRead(YoungPersonBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
