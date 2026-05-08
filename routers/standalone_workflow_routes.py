from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.standalone_tier_service import assert_feature, tier_payload, tier_from_user
from services.standalone_workflow_orchestration import build_workflow_payload, list_workflows, WORKFLOWS

router = APIRouter(prefix="/standalone-workflows", tags=["Standalone Workflow Orchestration"])


class WorkflowRunRequest(BaseModel):
    workflow_id: str = Field(..., min_length=1, max_length=120)
    content: str = Field("", max_length=120000)
    memory_context: dict[str, Any] = Field(default_factory=dict)


@router.get("")
def get_workflows(current_user: dict[str, Any] = Depends(get_current_user)):
    tier = tier_from_user(current_user)
    access = tier_payload(tier)
    return {
        "ok": True,
        "tier": tier,
        "workflows": list_workflows(access.get("features") or {}),
    }


@router.post("/run")
def run_workflow(payload: WorkflowRunRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    workflow = WORKFLOWS.get(payload.workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow.required_feature:
        assert_feature(current_user, workflow.required_feature)
    return build_workflow_payload(
        workflow_id=payload.workflow_id,
        content=payload.content,
        memory_context=payload.memory_context,
    )
