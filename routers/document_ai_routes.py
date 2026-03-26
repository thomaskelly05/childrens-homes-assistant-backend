from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.document_ai_service import review_document

router = APIRouter(prefix="/document-ai", tags=["Document AI"])


class DocumentAIReviewPayload(BaseModel):
    document_type: str = Field(min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)
    actions: list[str] = Field(default_factory=list)


@router.post("/review")
def api_review_document(
    request: DocumentAIReviewPayload,
    current_user=Depends(get_current_user),
):
    result = review_document(
        document_type=request.document_type,
        payload=request.payload,
        actions=request.actions,
    )

    return {
        "ok": True,
        "review": result,
    }
