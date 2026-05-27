from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["OS Child Workspace Sources"])


def _path(template: str, child_id: str) -> str:
    return template.replace("{young_person_id}", child_id).replace("{id}", child_id)


@router.get("/os-command/young-person/{young_person_id}/workspace/sources")
def get_child_workspace_sources(young_person_id: int):
    """Return the existing IndiCare routes that should power the child OS.

    This endpoint is intentionally a convergence map. It prevents the child
    workspace from inventing parallel systems when route families already exist
    for documents, plans, reviews, calendars, reports, standards, compliance,
    chronology, photos and ORB.
    """
    child_id = str(young_person_id)
    sources = {
        "profile": {
            "workspace": f"/api/os-command/young-person/{child_id}/workspace",
            "profile": f"/young-people/{child_id}",
            "context": f"/api/child-workspace-context/{child_id}",
        },
        "orb": {
            "conversation": "/api/assistant/orb/conversation",
            "preferred": True,
            "workspace_fallback": f"/api/os-command/young-person/{child_id}/workspace/orb",
        },
        "documents": {
            "list": f"/child-documents?young_person_id={child_id}&limit=100",
            "create": "/child-documents",
            "submit": "/child-documents/{document_id}/submit",
            "review": "/child-documents/{document_id}/review",
            "archive": "/child-documents/{document_id}/archive",
            "versions": "/child-documents/{document_id}/versions",
            "comments": "/child-documents/{document_id}/comments",
            "add_comment": "/child-documents/{document_id}/comments",
        },
        "statutory_documents": {
            "list": f"/young-people/{child_id}/statutory-documents",
            "create": f"/young-people/{child_id}/statutory-documents",
        },
        "plans": {
            "list": f"/young-people/{child_id}/plans",
            "archived": f"/young-people/{child_id}/plans/archived",
            "create": f"/young-people/{child_id}/plans",
            "update": "/young-people/plans/{plan_id}",
            "submit": "/young-people/plans/{plan_id}/submit",
            "approve": "/young-people/plans/{plan_id}/approve",
            "return": "/young-people/plans/{plan_id}/return",
            "archive": "/young-people/plans/{plan_id}/archive",
            "export": "/young-people/plans/{plan_id}/export",
        },
        "risk": {
            "list": f"/young-people/{child_id}/risk",
            "create": f"/young-people/{child_id}/risk",
        },
        "daily_notes": {
            "list": f"/young-people/{child_id}/daily-notes",
            "create": f"/young-people/{child_id}/daily-notes",
        },
        "incidents": {
            "list": f"/young-people/{child_id}/incidents",
            "create": f"/young-people/{child_id}/incidents",
        },
        "missing_episodes": {
            "list": f"/young-people/{child_id}/missing-episodes",
            "create": f"/young-people/{child_id}/missing-episodes",
        },
        "safeguarding": {
            "list": f"/young-people/{child_id}/safeguarding",
            "flowchart": "/safeguarding-flowchart",
            "domain": "/safeguarding-domain",
        },
        "keywork": {
            "list": f"/young-people/{child_id}/keywork",
            "create": f"/young-people/{child_id}/keywork",
        },
        "health": {
            "list": f"/young-people/{child_id}/health",
            "create": f"/young-people/{child_id}/health",
        },
        "education": {
            "list": f"/young-people/{child_id}/education",
            "create": f"/young-people/{child_id}/education",
        },
        "family": {
            "list": f"/young-people/{child_id}/family",
            "create": f"/young-people/{child_id}/family",
        },
        "appointments": {
            "list": f"/young-people/{child_id}/appointments",
            "create": f"/young-people/{child_id}/appointments",
        },
        "handover": {
            "list": f"/young-people/{child_id}/handover",
            "create": f"/young-people/{child_id}/handover",
        },
        "calendar": {
            "summary": f"/young-people/{child_id}/calendar-summary?year={{year}}&month={{month}}",
            "records_by_date": f"/young-people/{child_id}/records-by-date?date={{date}}",
        },
        "reports": {
            "list": f"/young-people/{child_id}/reports",
            "generate": f"/young-people/{child_id}/reports",
        },
        "compliance": {
            "summary": f"/young-people/{child_id}/compliance",
        },
        "standards": {
            "summary": f"/young-people/{child_id}/standards",
            "evidence": f"/young-people/{child_id}/standards/evidence",
            "rebuild": f"/young-people/{child_id}/standards/rebuild",
            "link": "/young-people/standards/link",
        },
        "photo": {
            "upload": f"/young-people/{child_id}/photo",
        },
        "chronology": {
            "list": f"/young-people/{child_id}/chronology",
            "story": f"/child-chronology-story/{child_id}",
            "intelligence": f"/chronology-intelligence/{child_id}",
        },
        "journey": {
            "child_journey": f"/child-journey/{child_id}",
            "outcomes": f"/outcomes/{child_id}",
            "smart_search": "/smart-search",
            "lifeecho": f"/lifeecho-memory/{child_id}",
            "plan_impact": f"/plan-impact/{child_id}",
        },
        "recording_reviews": {
            "queue": "/api/recording-reviews/queue",
            "summary": "/api/recording-reviews/summary",
            "detail": "/api/recording-reviews/{record_id}",
            "action": "/api/recording-reviews/{record_id}/action",
        },
        "manager_operating_system": {
            "daily_brief": "/api/manager-daily-brief",
            "operational_feed": "/api/operational-feed",
            "notifications": "/api/os-notifications",
            "care_hub": "/api/care-hub",
            "realtime_operational": "/api/realtime-operational",
        },
        "inspection_governance": {
            "ofsted_readiness": "/api/ofsted-readiness",
            "inspection_readiness": "/api/inspection-readiness",
            "sccif_alignment": "/api/sccif-alignment",
            "reg45_quality_review": "/api/reg45-quality-review",
            "governance": "/api/governance",
        },
        "audits_and_validation": {
            "schema_status": "/api/os-command/schema-status",
            "workflow_wiring_audit": "/api/os-workflow-wiring-audit",
            "schema_live": "/api/schema-live",
            "live_validation": "/api/os-live-validation",
            "single_source_audit": "/api/os-single-source-audit",
        },
    }

    recommended_os_tabs = [
        "Overview",
        "Record",
        "Chronology",
        "Plans",
        "Risk",
        "Reviews",
        "Alerts",
        "Appointments",
        "Calendar",
        "Documents",
        "Compliance",
        "Standards",
        "Reports",
        "LifeEcho",
        "Handover",
        "Child Voice",
        "Photo",
        "Database",
    ]

    useful_surfaces_not_yet_primary_tabs = [
        {
            "surface": "Calendar",
            "why": "The route already summarises records by month and opens records by date; useful for staff handover and inspection chronology.",
            "source": sources["calendar"],
        },
        {
            "surface": "Compliance",
            "why": "The route already brings together plan reviews, risk reviews, keywork follow-ups and statutory document review dates.",
            "source": sources["compliance"],
        },
        {
            "surface": "Standards evidence",
            "why": "The route already links records to Quality Standards and can rebuild child-level evidence mapping.",
            "source": sources["standards"],
        },
        {
            "surface": "Reports",
            "why": "The route already generates handover, monthly, risk/support, appointment/action and Ofsted evidence summaries.",
            "source": sources["reports"],
        },
        {
            "surface": "Photo/profile identity",
            "why": "The route already handles safe image upload and should be surfaced in the child identity header.",
            "source": sources["photo"],
        },
        {
            "surface": "Manager OS feed",
            "why": "The child workspace should not sit alone; manager daily brief, operational feed and notifications can surface wider action context.",
            "source": sources["manager_operating_system"],
        },
    ]

    return {
        "ok": True,
        "young_person_id": young_person_id,
        "sources": sources,
        "recommended_os_tabs": recommended_os_tabs,
        "useful_surfaces_not_yet_primary_tabs": useful_surfaces_not_yet_primary_tabs,
    }
