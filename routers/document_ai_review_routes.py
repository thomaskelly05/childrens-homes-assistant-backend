from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.ai_external_call_governance import governance_ids_from_user
from services.document_ai_review_service import review_document_with_ai

router = APIRouter(prefix="/document-ai", tags=["Document AI Review"])


class DocumentAIReviewRequest(BaseModel):
    document_type: str = Field(min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    actions: list[str] = Field(default_factory=lambda: ["improve_wording"])


@router.post("/review")
def api_review_document(
    body: DocumentAIReviewRequest,
    current_user=Depends(get_current_user),
):
    ids = governance_ids_from_user(current_user)
    result = review_document_with_ai(
        document_type=body.document_type,
        payload=body.payload,
        actions=body.actions,
        provider_id=ids["provider_id"],
        home_id=ids["home_id"],
        user_id=ids["user_id"],
    )

    if not result.get("review"):
        raise HTTPException(status_code=500, detail="Could not review document")

    return result
