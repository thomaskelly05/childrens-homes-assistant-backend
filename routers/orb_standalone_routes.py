from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from services.orb_general_assistant_service import orb_general_assistant_service

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Assistant"])

STANDALONE_ORB_MODES = [
    "Ask ORB",
    "Safeguarding",
    "Reflect",
    "Ofsted Lens",
    "Behaviour Support",
    "Record This Properly",
]

STANDALONE_ORB_GUARDRAILS = [
    "ORB Care Companion is standalone and does not retrieve IndiCare OS care records.",
    "It gives guidance and reflective support, not statutory, medical or legal decisions.",
    "For immediate safeguarding risk, follow local procedures and escalate to the relevant safeguarding lead or emergency service.",
]

STANDALONE_ORB_IDENTITY = (
    "You are ORB Care Companion, a standalone voice-first AI assistant for residential children's homes and general knowledge."
)

STANDALONE_ORB_CAPABILITIES = """
Capabilities:
- Answer general knowledge questions clearly and honestly.
- Support residential children's homes practice, leadership reflection and staff supervision thinking.
- Apply an Ofsted and SCCIF lens without predicting grades.
- Explain Children's Homes Regulations and Quality Standards in practical terms.
- Support safeguarding reflection and immediate escalation reminders where risk may be present.
- Improve recording quality with factual, child-centred, non-punitive wording.
- Support therapeutic, trauma-informed and behaviour-as-communication practice.
- Help managers reflect on oversight, patterns, drift and whether actions made a difference.
""".strip()

STANDALONE_ORB_BOUNDARIES = """
Boundaries:
- No access to IndiCare OS records, child files, dashboards, chronology, staff records or live home data.
- No direct writes to care records.
- No final safeguarding threshold decisions and no legal advice.
- No emergency response replacement — escalate through local procedures when risk is immediate.
- If the user needs record-aware support, tell them to use IndiCare OS Assistant inside the OS.
""".strip()

STANDALONE_ORB_TONE = """
Tone:
- British English, calm, warm, concise when speaking, reflective, practical, non-judgemental and child-centred.
Voice response style:
- Start with shorter spoken answers (about 3–6 sentences when voice-concise).
- Use phrasing like "I'd think about it like this…" where helpful.
- Offer to go deeper: "I can go deeper if you want."
- Ask one useful follow-up question when it would help, not every time.
""".strip()

MODE_BEHAVIOUR = {
    "Safeguarding": (
        "Mode behaviour — Safeguarding: advise immediate escalation where risk appears immediate; "
        "remind the user to follow local safeguarding policy; do not decide thresholds."
    ),
    "Record This Properly": (
        "Mode behaviour — Record This Properly: help create factual, child-centred, non-punitive wording; "
        "avoid terms like bad behaviour, attention seeking or manipulative; suggest what evidence to include."
    ),
    "Ofsted Lens": (
        "Mode behaviour — Ofsted Lens: explain what evidence may be expected; do not predict inspection grades."
    ),
    "Behaviour Support": (
        "Mode behaviour — Behaviour Support: treat behaviour as communication; trauma-informed response; "
        "repair and restorative follow-up."
    ),
    "Reflect": (
        "Mode behaviour — Reflect: emotionally containing; support staff wellbeing and reflective practice."
    ),
}


class OrbStandaloneConversationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    mode: str = Field(default="Ask ORB", max_length=80)
    conversation_id: str | None = None
    history: list[dict[str, Any]] = Field(default_factory=list)
    detail: str | None = Field(default=None, max_length=40)


def _standalone_contract() -> dict[str, Any]:
    return {
        "name": "ORB Care Companion",
        "surface": "standalone_orb_ai",
        "public_route": "/orb",
        "os_assistant_route": "/assistant",
        "os_linked": False,
        "care_record_access": False,
        "staff_record_access": False,
        "young_person_record_access": False,
        "chronology_access": False,
        "dashboard_access": False,
        "direct_writes": False,
        "purpose": "Advice, guidance, reflection and residential care practice support.",
        "modes": STANDALONE_ORB_MODES,
        "guardrails": STANDALONE_ORB_GUARDRAILS,
        "endpoints": {
            "health": "/orb/standalone/health",
            "conversation": "/orb/standalone/conversation",
            "config": "/orb/standalone/config",
        },
    }


def _resolve_detail(mode: str, requested: str | None) -> str:
    if requested in {"voice_concise", "concise"}:
        return "concise"
    if requested == "detailed":
        return "detailed"
    if requested == "balanced":
        return "concise"
    if mode in {"Safeguarding", "Ofsted Lens", "Record This Properly"}:
        return "detailed"
    return "concise"


def _build_framed_message(*, mode: str, user_message: str, detail: str) -> str:
    mode_hint = MODE_BEHAVIOUR.get(mode, "")
    detail_hint = ""
    if detail == "concise":
        detail_hint = (
            "Answer style: Voice concise — keep the first answer short and speakable (about 3–6 sentences), "
            "then offer to go deeper."
        )
    elif detail == "detailed":
        detail_hint = "Answer style: Detailed — provide fuller structured guidance with practical next steps."

    parts = [
        STANDALONE_ORB_IDENTITY,
        STANDALONE_ORB_CAPABILITIES,
        STANDALONE_ORB_BOUNDARIES,
        STANDALONE_ORB_TONE,
        mode_hint,
        detail_hint,
        f"Mode: {mode}",
        f"User message: {user_message}",
    ]
    return "\n\n".join(part for part in parts if part)


@router.get("/health")
async def standalone_orb_health(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": {
            **_standalone_contract(),
            "status": "ready",
            "isolation_verified": True,
            "runtime_note": "Standalone ORB uses general assistant guidance services only. It must not call OS-linked ORB care-context endpoints.",
        },
    }


@router.get("/config")
async def standalone_orb_config(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": _standalone_contract(),
    }


@router.post("/conversation")
async def standalone_orb_conversation(
    payload: OrbStandaloneConversationRequest,
    current_user=Depends(require_assistant_access),
):
    mode = payload.mode or "Ask ORB"
    detail = _resolve_detail(mode, payload.detail)
    framed_message = _build_framed_message(mode=mode, user_message=payload.message, detail=detail)
    history = payload.history[-20:] if payload.history else []
    assistant_data = await orb_general_assistant_service.answer(
        framed_message,
        history=history,
        detail=detail,
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
