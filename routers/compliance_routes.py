from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/compliance", tags=["Compliance"])


@router.get("/health")
def compliance_health() -> dict:
    return {
        "ok": True,
        "module": "compliance",
        "status": "mounted",
        "message": "Compliance compatibility router loaded successfully.",
    }


@router.get("/overview")
def compliance_overview() -> dict:
    return {
        "ok": True,
        "domain": "governance",
        "compliance": {
            "reg_44": "available_via_governance_os",
            "reg_45": "available_via_governance_os",
            "inspection": "available_via_inspection_os",
            "documents": "available_via_documents_os",
        },
    }
