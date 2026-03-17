from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/events", tags=["Events"])

EVENTS_DB = [
    {
        "id": 1,
        "young_person_id": 1,
        "event_type": "daily_note",
        "title": "Settled evening routine",
        "occurred_at": "2026-03-17T19:20:00",
        "shift_type": "PM",
        "narrative": "Engaged well with staff and completed evening routine with prompts.",
        "antecedent": "",
        "presentation": "Calm",
        "staff_response": "Warm prompts and reassurance.",
        "trauma_informed_formulation": "Responded well to predictable structure.",
        "outcome": "Settled for the evening.",
        "child_voice": "Said they wanted a quieter night.",
        "restorative_follow_up": "",
        "risk_level": "low",
        "workflow_status": "approved",
        "quality_standards": ["positive_relationships", "health_and_wellbeing"],
        "judgement_areas": ["experiences_and_progress"],
        "linked_document_ids": [],
        "linked_action_ids": [],
        "requires_manager_review": False,
    },
    {
        "id": 2,
        "young_person_id": 1,
        "event_type": "incident",
        "title": "Verbal aggression after phone call",
        "occurred_at": "2026-03-17T20:42:00",
        "shift_type": "PM",
        "narrative": "Became verbally aggressive after difficult family contact.",
        "antecedent": "Family contact ended abruptly.",
        "presentation": "Distressed, pacing, shouting.",
        "staff_response": "Reduced demands, offered space, reflective listening.",
        "trauma_informed_formulation": "Likely linked to feelings of rejection and loss.",
        "outcome": "De-escalated after 20 minutes.",
        "child_voice": "Said they were angry and upset.",
        "restorative_follow_up": "Key work to explore contact feelings tomorrow.",
        "risk_level": "medium",
        "workflow_status": "submitted",
        "quality_standards": ["protection_of_children", "positive_relationships"],
        "judgement_areas": ["helped_and_protected"],
        "linked_document_ids": [101],
        "linked_action_ids": [201],
        "requires_manager_review": True,
    },
]


class EventCreate(BaseModel):
    young_person_id: int
    event_type: str
    title: str = Field(min_length=1)
    occurred_at: Optional[str] = None
    shift_type: Optional[str] = None
    narrative: Optional[str] = None
    antecedent: Optional[str] = None
    presentation: Optional[str] = None
    staff_response: Optional[str] = None
    trauma_informed_formulation: Optional[str] = None
    outcome: Optional[str] = None
    child_voice: Optional[str] = None
    restorative_follow_up: Optional[str] = None
    risk_level: Optional[str] = "low"
    quality_standards: List[str] = []
    judgement_areas: List[str] = []
    requires_manager_review: bool = False


class EventUpdate(BaseModel):
    title: Optional[str] = None
    occurred_at: Optional[str] = None
    shift_type: Optional[str] = None
    narrative: Optional[str] = None
    antecedent: Optional[str] = None
    presentation: Optional[str] = None
    staff_response: Optional[str] = None
    trauma_informed_formulation: Optional[str] = None
    outcome: Optional[str] = None
    child_voice: Optional[str] = None
    restorative_follow_up: Optional[str] = None
    risk_level: Optional[str] = None
    workflow_status: Optional[str] = None
    quality_standards: Optional[List[str]] = None
    judgement_areas: Optional[List[str]] = None
    requires_manager_review: Optional[bool] = None


@router.get("")
def list_events(
    young_person_id: Optional[int] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    workflow_status: Optional[str] = Query(default=None),
):
    rows = EVENTS_DB[:]

    if young_person_id is not None:
        rows = [r for r in rows if r["young_person_id"] == young_person_id]

    if event_type:
        rows = [r for r in rows if r["event_type"] == event_type]

    if workflow_status:
        rows = [r for r in rows if r["workflow_status"] == workflow_status]

    rows.sort(key=lambda x: x.get("occurred_at") or "", reverse=True)
    return {"items": rows}


@router.get("/{event_id}")
def get_event(event_id: int):
    for row in EVENTS_DB:
        if row["id"] == event_id:
            return row
    return {"error": "Not found"}


@router.post("")
def create_event(payload: EventCreate):
    new_id = max([r["id"] for r in EVENTS_DB], default=0) + 1
    row = payload.dict()
    row["id"] = new_id
    row["occurred_at"] = row["occurred_at"] or datetime.utcnow().isoformat()
    row["workflow_status"] = "draft"
    row["linked_document_ids"] = []
    row["linked_action_ids"] = []
    EVENTS_DB.append(row)
    return row


@router.put("/{event_id}")
def update_event(event_id: int, payload: EventUpdate):
    for row in EVENTS_DB:
        if row["id"] == event_id:
            data = payload.dict(exclude_unset=True)
            row.update(data)
            return row
    return {"error": "Not found"}
