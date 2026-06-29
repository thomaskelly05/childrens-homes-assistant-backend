"""ORB Residential founder-only source-grounded alpha — Phase 2l internal routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.current_user import get_current_user
from schemas.orb_source_grounded_alpha import OrbSourceGroundedAlphaEvaluateRequest
from services.audit_event_service import record_audit_event
from services.orb_residential_source_grounded_alpha_service import (
    orb_residential_source_grounded_alpha_service,
)

router = APIRouter(
    prefix="/orb/admin/source-grounded-alpha",
    tags=["ORB Source-Grounded Alpha"],
)


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _require_alpha_access(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    access = orb_residential_source_grounded_alpha_service.check_access(current_user)
    if not access["access_allowed"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "source_grounded_alpha_blocked",
                "message": access["blocked_reason"],
                "access_status": access,
            },
        )
    return current_user


@router.get("/status")
async def source_grounded_alpha_status(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Return alpha governance status. Non-founder/admin users receive blocked access details."""
    status_payload = orb_residential_source_grounded_alpha_service.build_status()
    status_payload["access_status"] = orb_residential_source_grounded_alpha_service.check_access(
        current_user
    )
    return _success(status_payload)


@router.post("/evaluate")
async def source_grounded_alpha_evaluate(
    body: OrbSourceGroundedAlphaEvaluateRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_alpha_access),
):
    """Founder/admin-only internal source-grounded assembly evaluation. Not public live use."""
    result = orb_residential_source_grounded_alpha_service.evaluate_internal_alpha(
        user=current_user,
        workflow_type=body.workflow_type,
        query=body.query,
        answer_text=body.answer_text,
        include_secondary_source_types=body.include_secondary_source_types,
        boundary_statement_ids_present=body.boundary_statement_ids_present,
        escalation_prompt_ids_present=body.escalation_prompt_ids_present,
        proposed_signoffs=body.proposed_signoffs,
        public_promise_claim_made=body.public_promise_claim_made,
        nr_1_cleared_for_wiring=body.nr_1_cleared_for_wiring,
    )

    record_audit_event(
        event_type="governance",
        action="source_grounded_alpha_evaluate",
        outcome="success" if result.get("internal_alpha_access_allowed") else "blocked",
        request=request,
        actor=current_user,
        resource_type="orb_residential_source_grounded_alpha",
        resource_id=body.workflow_type,
        metadata={
            "phase": "Phase 2l",
            "workflow_type": body.workflow_type,
            "internal_alpha_access_allowed": result.get("internal_alpha_access_allowed"),
            "llm_called": result.get("llm_called"),
            "public_source_grounded_answers_enabled": result.get("public_source_grounded_answers_enabled"),
            "source_chunks_sent_to_llm": result.get("source_chunks_sent_to_llm"),
            "citation_count": len(result.get("citation_candidates_for_internal_checking", [])),
        },
    )

    return _success(result)
