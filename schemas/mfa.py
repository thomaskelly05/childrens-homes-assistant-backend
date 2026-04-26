from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


def clean_text(value: str) -> str:
    return str(value or "").strip()


class MfaSetupResponse(BaseModel):
    ok: bool = True
    secret: str
    otp_auth_url: str
    qr_code_data_url: str


class MfaVerifyEnableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=12)

    @field_validator("code", mode="before")
    @classmethod
    def clean_code(cls, value):
        cleaned = clean_text(value).replace(" ", "")
        if not cleaned.isdigit():
            raise ValueError("MFA code must contain digits only")
        return cleaned


class MfaChallengeRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=32)

    @field_validator("code", mode="before")
    @classmethod
    def clean_code(cls, value):
        return clean_text(value).replace(" ", "")


class RecoveryCodeVerifyRequest(BaseModel):
    recovery_code: str = Field(..., min_length=5, max_length=64)

    @field_validator("recovery_code", mode="before")
    @classmethod
    def clean_recovery_code(cls, value):
        return clean_text(value)


class MfaStatusResponse(BaseModel):
    ok: bool = True
    enabled: bool
    verified_in_session: bool
    recovery_codes_remaining: int = Field(..., ge=0)