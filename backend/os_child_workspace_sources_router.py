from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["OS Child Workspace Sources"])


@router.get("/os-command/young-person/{young_person_id}/workspace/sources")
def get_child_workspace_sources(young_person_id: int):
    """Return existing IndiCare routes that power child workspace tabs.

    This keeps the child workspace converged onto existing route systems rather
    than creating duplicate document, plan, review or ORB endpoints.
    """
    child_id = str(young_person_id)
    return {
        "ok": True,
        "young_person_id": young_person_id,
        "sources": {
            "documents": {
                "list": f"/child-documents?young_person_id={child_id}&limit=100",
                "create": "/child-documents",
                "submit": "/child-documents/{document_id}/submit",
                "review": "/child-documents/{document_id}/review",
                "versions": "/child-documents/{document_id}/versions",
                "comments": "/child-documents/{document_id}/comments",
            },
            "plans": {
                "list": f"/young-people/{child_id}/plans",
                "create": f"/young-people/{child_id}/plans",
                "update": "/young-people/plans/{plan_id}",
                "submit": "/young-people/plans/{plan_id}/submit",
                "approve": "/young-people/plans/{plan_id}/approve",
                "return": "/young-people/plans/{plan_id}/return",
                "archive": "/young-people/plans/{plan_id}/archive",
                "export": "/young-people/plans/{plan_id}/export",
            },
            "orb": {
                "conversation": "/api/assistant/orb/conversation",
                "preferred": True,
            },
            "recording_reviews": {
                "queue": "/api/recording-reviews/queue",
                "summary": "/api/recording-reviews/summary",
                "detail": "/api/recording-reviews/{record_id}",
                "action": "/api/recording-reviews/{record_id}/action",
            },
        },
    }
