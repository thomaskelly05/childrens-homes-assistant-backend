from __future__ import annotations

from pydantic import BaseModel, Field


class MfaSetupResponse(BaseModel):
    ok: bool = True
    secret: str
    otp_auth_url: str
    qr_code_data_url: str


class MfaVerifyEnableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=12)


class MfaChallengeRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=32)


class RecoveryCodeVerifyRequest(BaseModel):
    recovery_code: str = Field(..., min_length=5, max_length=64)


class MfaStatusResponse(BaseModel):
    ok: bool = True
    enabled: bool
    verified_in_session: bool
    recovery_codes_remaining: int
