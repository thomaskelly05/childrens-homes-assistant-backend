from fastapi import APIRouter

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
