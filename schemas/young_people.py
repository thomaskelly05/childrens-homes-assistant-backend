from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
VALID_PLACEMENT_STATUSES = {
    "active",
    "planned",
    "discharged",
    "transition",
    "emergency",
    "archived",
}
VALID_RISK_LEVELS = {
    "low",
    "medium",
    "high",
    "critical",
}
def clean_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None
class YoungPersonBase(BaseModel):
    home_id: int = Field(..., gt=0)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    preferred_name: Optional[str] = Field(default=None, max_length=100)
    date_of_birth: date
    gender: Optional[str] = Field(default=None, max_length=80)
    ethnicity: Optional[str] = Field(default=None, max_length=120)
    nhs_number: Optional[str] = Field(default=None, max_length=30)
    local_id_number: Optional[str] = Field(default=None, max_length=80)
    admission_date: date
    discharge_date: Optional[date] = None
    placement_status: str = "active"
    primary_keyworker_id: Optional[int] = Field(default=None, gt=0)
    summary_risk_level: Optional[str] = None
    photo_url: Optional[str] = Field(default=None, max_length=500)
    archived: bool = False
    @field_validator(
        "first_name",
        "last_name",
        "preferred_name",
        "gender",
        "ethnicity",
        "nhs_number",
        "local_id_number",
        "summary_risk_level",
        "photo_url",
        mode="before",
    )
    @classmethod
    def clean_text_fields(cls, value):
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None
    @field_validator("placement_status", mode="before")
    @classmethod
    def normalise_placement_status(cls, value):
        cleaned = str(value or "active").strip().lower()
        if cleaned not in VALID_PLACEMENT_STATUSES:
            return "active"
        return cleaned
    @field_validator("summary_risk_level", mode="before")
    @classmethod
    def normalise_summary_risk_level(cls, value):
        cleaned = clean_optional_text(value)
        if cleaned is None:
            return None
        cleaned = cleaned.lower()
        if cleaned not in VALID_RISK_LEVELS:
            return None
        return cleaned
    @field_validator("discharge_date")
    @classmethod
    def validate_discharge_date(cls, value, info):
        if value is None:
            return value
        admission_date = info.data.get("admission_date")
        if admission_date and value < admission_date:
            raise ValueError("discharge_date cannot be before admission_date")
        return value
class YoungPersonCreate(YoungPersonBase):
    pass
class YoungPersonUpdate(BaseModel):
    home_id: Optional[int] = Field(default=None, gt=0)
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    preferred_name: Optional[str] = Field(default=None, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(default=None, max_length=80)
    ethnicity: Optional[str] = Field(default=None, max_length=120)
    nhs_number: Optional[str] = Field(default=None, max_length=30)
    local_id_number: Optional[str] = Field(default=None, max_length=80)
    admission_date: Optional[date] = None
    discharge_date: Optional[date] = None
    placement_status: Optional[str] = None
    primary_keyworker_id: Optional[int] = Field(default=None, gt=0)
    summary_risk_level: Optional[str] = None
    photo_url: Optional[str] = Field(default=None, max_length=500)
    archived: Optional[bool] = None
    @field_validator(
        "first_name",
        "last_name",
        "preferred_name",
        "gender",
        "ethnicity",
        "nhs_number",
        "local_id_number",
        "summary_risk_level",
        "photo_url",
        mode="before",
    )
    @classmethod
    def clean_text_fields(cls, value):
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None
    @field_validator("placement_status", mode="before")
    @classmethod
    def normalise_placement_status(cls, value):
        cleaned = clean_optional_text(value)
        if cleaned is None:
            return None
        cleaned = cleaned.lower()
        if cleaned not in VALID_PLACEMENT_STATUSES:
            return "active"
        return cleaned
    @field_validator("summary_risk_level", mode="before")
    @classmethod
    def normalise_summary_risk_level(cls, value):
        cleaned = clean_optional_text(value)
        if cleaned is None:
            return None
        cleaned = cleaned.lower()
        if cleaned not in VALID_RISK_LEVELS:
            return None
        return cleaned
class YoungPersonRead(YoungPersonBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)