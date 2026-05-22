from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from services.orb_general_assistant_service import orb_general_assistant_service

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Assistant"])


class OrbStandaloneConversationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    mode: str = Field(default="Ask ORB", max_length=80)
    conversation_id: str | None = None
    history: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/config")
async def standalone_orb_config(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": {
            "name": "ORB Care Companion",
            "surface": "standalone_orb_ai",
            "os_linked": False,
            "care_record_access": False,
            "direct_writes": False,
            "purpose": "Advice, guidance, reflection and residential care practice support.",
            "modes": [
                "Ask ORB",
                "Safeguarding",
                "Reflect",
                "Ofsted Lens",
                "Behaviour Support",
                "Record This Properly",
            ],
            "guardrails": [
                "ORB Care Companion is standalone and does not retrieve IndiCare OS care records.",
                "It gives guidance and reflective support, not statutory, medical or legal decisions.",
                "For immediate safeguarding risk, follow local procedures and escalate to the relevant safeguarding lead or emergency service.",
            ],
            "endpoints": {
                "conversation": "/orb/standalone/conversation",
                "config": "/orb/standalone/config",
            },
        },
    }


@router.post("/conversation")
async def standalone_orb_conversation(
    payload: OrbStandaloneConversationRequest,
    current_user=Depends(require_assistant_access),
):
    mode = payload.mode or "Ask ORB"
    framed_message = (
        "You are ORB Care Companion, a standalone AI assistant for residential children homes practice. "
        "Do not access or imply access to IndiCare OS records, young person records, staff records, live home data or operational dashboards. "
        "Support advice, guidance, reflection, safeguarding thinking, Ofsted readiness and recording quality. "
        "Always remind the user to follow safeguarding procedures where risk may be immediate.\n\n"
        f"Mode: {mode}\n"
        f"User message: {payload.message}"
    )
    assistant_data = await orb_general_assistant_service.answer(
        framed_message,
        history=payload.history,
        detail="detailed" if mode in {"Safeguarding", "Ofsted Lens", "Record This Properly"} else "concise",
    )
    answer = str(assistant_data.get("answer") or "I can help with that, but I could not form a response just now.")
    return {
        "ok": True,
        "success": True,
        "answer": answer,
        "summary": answer.split("\n", 1)[0][:220],
        "sources": [],
        "actions": [],
        "confidence": "medium",
        "conversation_id": payload.conversation_id,
        "context_used": {
            "surface": "standalone_orb_ai",
            "mode": mode,
            "care_record_access": False,
            "os_linked": False,
            "tools_used": assistant_data.get("tools_used") or ["standalone_orb_general_assistant"],
        },
        "guardrails": [
            "Standalone ORB did not retrieve IndiCare OS records.",
            "Use professional judgement and follow safeguarding procedures where risk is present.",
        ],
    }
