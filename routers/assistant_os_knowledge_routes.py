from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth.dependencies import require_assistant_access
from services.indicare_knowledge_service import IndiCareKnowledgeService

router = APIRouter(prefix="/assistant/os", tags=["assistant-os-knowledge"])

knowledge_service = IndiCareKnowledgeService()


class KnowledgeAskRequest(BaseModel):
    question: str
    young_person_id: int | None = None
    home_id: int | None = None
    limit: int | None = 8


@router.post("/knowledge")
def ask_knowledge(
    payload: KnowledgeAskRequest,
    current_user: dict[str, Any] = Depends(require_assistant_access),
):
    """Ask the home/child knowledge base with document citations.

    This sits under /assistant/os so the existing assistant remains the primary
    user-facing intelligence surface. The route returns an answer plus source
    citations and can be called by the assistant UI when staff ask document-led
    questions about a child, home, plan or policy.
    """
    return knowledge_service.ask(
        question=payload.question,
        current_user=current_user,
        young_person_id=payload.young_person_id,
        home_id=payload.home_id,
        limit=payload.limit or 8,
    )
