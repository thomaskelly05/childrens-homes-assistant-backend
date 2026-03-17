from fastapi import APIRouter

router = APIRouter(prefix="/evidence", tags=["Evidence"])


@router.get("/standards")
def list_quality_standards():
    return {
        "items": [
            {"key": "quality_and_purpose_of_care", "label": "Quality and purpose of care"},
            {"key": "views_wishes_and_feelings", "label": "Children’s views, wishes and feelings"},
            {"key": "education", "label": "Education"},
            {"key": "enjoyment_and_achievement", "label": "Enjoyment and achievement"},
            {"key": "health_and_wellbeing", "label": "Health and well-being"},
            {"key": "positive_relationships", "label": "Positive relationships"},
            {"key": "protection_of_children", "label": "Protection of children"},
            {"key": "leadership_and_management", "label": "Leadership and management"},
            {"key": "care_planning", "label": "Care planning"},
        ]
    }


@router.get("/judgement-areas")
def list_judgement_areas():
    return {
        "items": [
            {"key": "experiences_and_progress", "label": "Children’s experiences and progress"},
            {"key": "helped_and_protected", "label": "Children are helped and protected"},
            {"key": "leadership_and_management", "label": "Leadership and management"},
        ]
    }


@router.get("/record/{record_type}/{record_id}")
def get_evidence_for_record(record_type: str, record_id: int):
    return {
        "record_type": record_type,
        "record_id": record_id,
        "links": [
            {
                "relationship": "supports",
                "target_type": "quality_standard",
                "target_key": "protection_of_children",
                "target_label": "Protection of children",
            },
            {
                "relationship": "supports",
                "target_type": "judgement_area",
                "target_key": "helped_and_protected",
                "target_label": "Children are helped and protected",
            },
            {
                "relationship": "linked_document",
                "target_type": "document",
                "target_id": 101,
                "target_label": "Safer care plan",
            },
        ],
    }
