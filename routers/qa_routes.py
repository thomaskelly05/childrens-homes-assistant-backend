from fastapi import APIRouter

from routers.document_os_route_utils import EvidencePayload
from services.quality_assurance_service import quality_assurance_service

router = APIRouter(prefix="/qa", tags=["QA"])


@router.get("/dashboard")
def qa_dashboard():
    return {
        "summary": {
            "open_reviews": 3,
            "overdue_documents": 2,
            "missing_signatures": 1,
            "medication_exceptions": 1,
            "incident_followups_due": 2,
        },
        "items": [
            {
                "type": "incident_review",
                "title": "Incident awaiting manager review",
                "young_person_name": "Child A",
                "status": "open",
            },
            {
                "type": "document_review",
                "title": "Safer care plan overdue",
                "young_person_name": "Child B",
                "status": "overdue",
            },
        ],
    }


@router.post("/audits/draft")
def qa_audit(payload: EvidencePayload):
    return {"ok": True, "audit": quality_assurance_service.audit(records=payload.records, audit_type=payload.audit_type or "file")}
