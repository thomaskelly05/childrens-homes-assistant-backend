from __future__ import annotations

import uuid
from fastapi import APIRouter, Header, HTTPException, Request

from db.partner_assistant_db import (
    record_partner_assistant_audit,
    validate_partner_api_key,
)
from schemas.assistant_partner_api import (
    PartnerAssistantRequest,
    PartnerAssistantResponse,
)
from services.assistant_partner_service import generate_partner_response

router = APIRouter(prefix="/v1/assistant", tags=["Partner Assistant"])


@router.post("/respond", response_model=PartnerAssistantResponse)
async def respond(
    payload: PartnerAssistantRequest,
    request: Request,
    x_api_key: str = Header(None),
):
    key_record = validate_partner_api_key(x_api_key)
    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid API key")

    audit_id = f"audit_{uuid.uuid4().hex[:12]}"

    try:
        result = await generate_partner_response(payload)

        record_partner_assistant_audit(
            audit_id=audit_id,
            organisation_id=key_record.get("organisation_id"),
            api_key_id=key_record.get("id"),
            host_system=payload.context.host_system,
            mode=payload.mode,
            user_role=payload.context.user_role,
            request_message_preview=payload.message[:200],
            safeguarding_level=result.get("safeguarding_level"),
            follow_up_required=result.get("follow_up_required", False),
            status="success",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        return PartnerAssistantResponse(**result, audit_id=audit_id)

    except Exception as e:
        record_partner_assistant_audit(
            audit_id=audit_id,
            organisation_id=key_record.get("organisation_id"),
            api_key_id=key_record.get("id"),
            host_system=payload.context.host_system,
            mode=payload.mode,
            user_role=payload.context.user_role,
            request_message_preview=payload.message[:200],
            safeguarding_level=None,
            follow_up_required=False,
            status="error",
            error=str(e),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        raise
