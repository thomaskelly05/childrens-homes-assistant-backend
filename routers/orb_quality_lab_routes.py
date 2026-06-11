"""ORB Quality Lab — founder/admin gold scenario evaluation routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.permissions import require_admin
from schemas.orb_quality_lab import OrbQualityLabEvaluateRequest, OrbQualityLabRunRequest
from services.orb_quality_lab_service import orb_quality_lab_service

router = APIRouter(prefix="/orb/admin/quality-lab", tags=["ORB Quality Lab"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.get("/overview")
async def quality_lab_overview(_admin=Depends(require_admin)):
    return _success(orb_quality_lab_service.build_overview())


@router.get("/scenarios")
async def quality_lab_scenarios(
    family: str | None = Query(default=None),
    role: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=100),
    _admin=Depends(require_admin),
):
    scenarios = orb_quality_lab_service.list_scenarios(family=family, role=role, limit=limit)
    return _success({"scenarios": scenarios, "count": len(scenarios)})


@router.post("/runs")
async def quality_lab_run(
    body: OrbQualityLabRunRequest,
    _admin=Depends(require_admin),
):
    result = orb_quality_lab_service.run_gold_pack(
        title=body.title,
        family=body.family,
        role=body.role,
        limit=body.limit,
        scenario_ids=body.scenario_ids,
        use_sample_answers=body.use_sample_answers,
        run_mode=body.run_mode,
    )
    return _success(result)


@router.post("/evaluate")
async def quality_lab_evaluate(
    body: OrbQualityLabEvaluateRequest,
    _admin=Depends(require_admin),
):
    try:
        result = orb_quality_lab_service.evaluate_answer(
            scenario_id=body.scenario_id,
            answer=body.answer,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _success(result)
