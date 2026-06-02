from __future__ import annotations

"""ORB Residential premium routes.

Standalone ORB Residential product surface — separate from IndiCare OS operational routes.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import (
    orb_residential_premium_dependency,
    require_orb_residential_auth,
    require_orb_residential_route_allowed,
)
from db.connection import get_db
from db.orb_residential_db import (
    create_orb_saved_project,
    get_orb_access_state,
    get_orb_user_preferences,
    list_orb_saved_outputs,
    list_orb_saved_projects,
    record_orb_usage_event,
    save_orb_output,
    start_orb_trial,
    upsert_orb_user_preferences,
)
from schemas.orb_residential_premium import (
    OrbOnboardingPreferencesRequest,
    OrbSavedOutputRequest,
    OrbSavedProjectRequest,
)
from schemas.orb_shift_builder import OrbShiftBuilderGenerateRequest, OrbShiftBuilderRequest
from services.orb_access_service import orb_access_service
from services.orb_converged_general_assistant_service import orb_converged_general_assistant_service
from services.orb_shift_builder_service import orb_shift_builder_service

router = APIRouter(prefix="/orb/residential", tags=["ORB Residential"])


def _success(data: Any, **extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"ok": True, "surface": "orb_residential", "premium": True, "data": data}
    payload.update(extra)
    return payload


@router.get("/health")
async def orb_residential_health() -> dict[str, object]:
    return {
        "ok": True,
        "surface": "orb_residential",
        "premium": True,
        "powered_by": "IndiCare Intelligence",
        "shared_intelligence_spine": True,
        "os_linked": False,
        "care_record_access": False,
    }


@router.get("/product")
async def orb_residential_product_definition() -> dict[str, object]:
    upgrade = orb_access_service.build_upgrade_payload()
    return {
        "name": "ORB Residential",
        "tagline": "Powered by IndiCare Intelligence",
        "price_gbp_monthly": 9.99,
        "positioning": "Residential care intelligence",
        "premium": True,
        "core_workflows": [
            "Ask ORB",
            "Shift Builder",
            "Record This Properly",
            "Safeguarding Thinking",
            "Therapeutic Reframe",
            "Ofsted Lens",
            "Supervision Prep",
            "Manager Review",
        ],
        "standalone_boundaries": {
            "live_record_access": False,
            "chronology_access": False,
            "provider_dashboard_access": False,
            "operational_state_access": False,
        },
        "upgrade": upgrade,
    }


@router.get("/access")
async def orb_residential_access(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    access_state = get_orb_access_state(conn, user_id)
    preferences = get_orb_user_preferences(conn, user_id)
    return _success(
        {
            "access": access_state,
            "preferences": preferences,
            "upgrade": orb_access_service.build_upgrade_payload(),
        }
    )


@router.post("/trial/start")
async def orb_residential_start_trial(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    access_state = get_orb_access_state(conn, user_id)
    if access_state.get("can_use_orb"):
        return _success({"access": access_state, "message": "Access already active"})
    trial = start_orb_trial(conn, user_id, source="orb_residential")
    conn.commit()
    return _success({"trial": trial, "access": get_orb_access_state(conn, user_id)})


@router.get("/onboarding/preferences")
async def get_onboarding_preferences(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    prefs = get_orb_user_preferences(conn, int(current_user["user_id"]))
    return _success(prefs or {})


@router.post("/onboarding/preferences")
async def update_onboarding_preferences(
    payload: OrbOnboardingPreferencesRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    row = upsert_orb_user_preferences(
        conn,
        user_id=int(current_user["user_id"]),
        role_label=payload.role_label,
        work_environment=payload.work_environment,
        preferred_support_style=payload.preferred_support_style,
        onboarding_completed=payload.onboarding_completed,
        preferences=payload.preferences,
    )
    conn.commit()
    return _success(row)


@router.get("/shift-builder/focus-modes")
async def orb_residential_shift_builder_focus_modes(
    _current_user=Depends(orb_residential_premium_dependency("shift_builder")),
):
    return _success({"focus_modes": orb_shift_builder_service.list_focus_modes()})


@router.post("/shift-builder")
async def orb_residential_shift_builder(
    payload: OrbShiftBuilderGenerateRequest,
    _current_user=Depends(orb_residential_premium_dependency("shift_builder")),
):
    for key in ("child_id", "young_person_id", "home_id", "chronology_id", "record_id"):
        if payload.context.get(key) is not None:
            raise HTTPException(
                status_code=400,
                detail=f"ORB Residential Shift Builder must not include {key}.",
            )
    try:
        result = await orb_shift_builder_service.generate(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    data = result.model_dump()
    data["surface"] = "orb_residential"
    data["premium"] = True
    data["os_linked"] = False
    data["live_record_access"] = False
    return _success(data)


@router.post("/shift-builder/prompt-pack")
async def orb_residential_shift_builder_prompt_pack(
    payload: OrbShiftBuilderRequest,
    _current_user=Depends(orb_residential_premium_dependency("shift_builder")),
):
    result = orb_shift_builder_service.build(payload)
    data = result.model_dump()
    data["surface"] = "orb_residential"
    data["premium"] = True
    data["os_linked"] = False
    data["live_record_access"] = False
    return _success(data)


class OrbResidentialMessageRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=50000)
    mode: str | None = Field(default="Ask ORB", max_length=80)
    detail: str | None = Field(default="concise", max_length=40)
    history: list[dict[str, Any]] = Field(default_factory=list)
    document_text: str | None = None
    document_source_id: str | None = None
    document_title: str | None = None


@router.post("/conversation")
async def orb_residential_conversation(
    payload: OrbResidentialMessageRequest,
    request: Request,
    conn=Depends(get_db),
    current_user=Depends(orb_residential_premium_dependency("ask_orb")),
):
    require_orb_residential_route_allowed(request)
    result = await orb_converged_general_assistant_service.answer(
        payload.message,
        history=payload.history[-20:] if payload.history else None,
        detail=str(payload.detail or "concise"),
        mode=payload.mode,
        document_text=payload.document_text,
        document_source_id=payload.document_source_id,
        document_title=payload.document_title,
        raw_user_message=payload.message,
    )
    context_used = dict(result.get("context_used") or {})
    context_used.update(
        {
            "surface": "orb_residential",
            "os_linked": False,
            "care_record_access": False,
            "live_record_access": False,
            "premium": True,
        }
    )
    result["context_used"] = context_used
    result["surface"] = "orb_residential"
    result["premium"] = True
    try:
        record_orb_usage_event(
            conn,
            user_id=int(current_user["user_id"]),
            event_type="conversation",
            mode=payload.mode,
            workflow="ask_orb",
            success=True,
            metadata={"surface": "orb_residential"},
        )
        conn.commit()
    except Exception:
        conn.rollback()
    return _success(result)


@router.post("/projects")
async def create_project(
    payload: OrbSavedProjectRequest,
    conn=Depends(get_db),
    current_user=Depends(orb_residential_premium_dependency("ask_orb")),
):
    project = create_orb_saved_project(
        conn,
        user_id=int(current_user["user_id"]),
        title=payload.title,
        description=payload.description,
        project_type=payload.project_type,
        metadata=payload.metadata,
    )
    conn.commit()
    return _success(project)


@router.get("/projects")
async def list_projects(
    limit: int = Query(default=50, ge=1, le=100),
    conn=Depends(get_db),
    current_user=Depends(orb_residential_premium_dependency("ask_orb")),
):
    projects = list_orb_saved_projects(conn, user_id=int(current_user["user_id"]), limit=limit)
    return _success(projects)


@router.get("/outputs")
async def list_outputs(
    limit: int = Query(default=50, ge=1, le=100),
    conn=Depends(get_db),
    current_user=Depends(orb_residential_premium_dependency("ask_orb")),
):
    outputs = list_orb_saved_outputs(conn, user_id=int(current_user["user_id"]), limit=limit)
    return _success(outputs)


@router.post("/outputs")
async def create_output(
    payload: OrbSavedOutputRequest,
    conn=Depends(get_db),
    current_user=Depends(orb_residential_premium_dependency("ask_orb")),
):
    for key in ("child_id", "young_person_id", "home_id", "chronology_id", "record_id"):
        if payload.metadata.get(key) is not None:
            raise HTTPException(
                status_code=400,
                detail=f"ORB Residential outputs must not include {key}.",
            )
    row = save_orb_output(
        conn,
        user_id=int(current_user["user_id"]),
        content=payload.content,
        project_id=payload.project_id,
        workflow=payload.workflow,
        output_type=payload.output_type,
        title=payload.title,
        tags=payload.tags,
        metadata=payload.metadata,
    )
    conn.commit()
    return _success(row)
