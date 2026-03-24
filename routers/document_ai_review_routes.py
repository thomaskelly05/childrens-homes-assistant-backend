from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
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
    result = review_document_with_ai(
        document_type=body.document_type,
        payload=body.payload,
        actions=body.actions,
    )

    if not result.get("review"):
        raise HTTPException(status_code=500, detail="Could not review document")

    return result
