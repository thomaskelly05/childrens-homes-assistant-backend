"""ORB Evaluation & Red Team Platform — founder/admin routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.permissions import require_admin
from schemas.orb_evaluation_platform import (
    OrbEvaluationGenerateRequest,
    OrbEvaluationRunRequest,
    OrbEvaluationScenarioPayload,
)
from services.orb_evaluation_platform_service import orb_evaluation_platform_service

router = APIRouter(prefix="/orb/admin/evaluation", tags=["ORB Evaluation Platform"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.get("/overview")
async def evaluation_overview(_admin=Depends(require_admin)):
    return _success(orb_evaluation_platform_service.build_overview())


@router.get("/scenarios")
async def evaluation_scenarios(
    limit: int = Query(default=500, ge=1, le=5000),
    _admin=Depends(require_admin),
):
    scenarios = orb_evaluation_platform_service.list_scenarios(limit=limit)
    return _success({"scenarios": scenarios, "count": len(scenarios)})


@router.post("/scenarios/generate")
async def evaluation_generate_scenarios(
    body: OrbEvaluationGenerateRequest,
    _admin=Depends(require_admin),
):
    return _success(
        {
            "message": "Scenarios are generated via the Next.js founder API and stored with POST /scenarios.",
            "requested_count": body.count,
            "pack_type": body.pack_type,
        }
    )


@router.post("/scenarios")
async def evaluation_store_scenarios(
    scenarios: list[OrbEvaluationScenarioPayload],
    _admin=Depends(require_admin),
):
    stored = orb_evaluation_platform_service.store_scenarios(
        [s.model_dump(by_alias=True) for s in scenarios]
    )
    return _success(stored)


@router.post("/runs")
async def evaluation_run(
    body: OrbEvaluationRunRequest,
    _admin=Depends(require_admin),
):
    result = orb_evaluation_platform_service.run_evaluation(body)
    if result.error and result.status == "failed" and result.scenario_count == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.error)
    return _success(result.model_dump())


@router.post("/runs/{run_id}/retest")
async def evaluation_retest(
    run_id: str,
    body: OrbEvaluationRunRequest,
    _admin=Depends(require_admin),
):
    body.title = body.title or f"Retest of {run_id}"
    body.pack_type = "retest"
    result = orb_evaluation_platform_service.run_evaluation(body)
    return _success({**result.model_dump(), "retest_of_run_id": run_id})
