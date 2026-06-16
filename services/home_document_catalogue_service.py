from __future__ import annotations

from typing import Any

from schemas.location_intelligence import DocumentCatalogueItem
from services.risk_intelligence_language import safe_payload


CHILD_DOCUMENTS = [
    "Care Plan",
    "Placement Plan",
    "Matching Assessment",
    "Impact Risk Assessment",
    "Individual Risk Assessment",
    "Missing From Care Protocol",
    "Behaviour Support Plan",
    "Positive Behaviour Support Plan",
    "Education Plan",
    "PEP support documents",
    "Health Plan",
    "Medication Plan",
    "Family Contact Plan",
    "Independence Plan",
    "Pathway Plan",
    "Keywork Plan",
    "Safety Plan",
    "Exploitation Risk Assessment",
    "Online Safety Plan",
    "Self-Harm Risk Assessment",
    "Bullying/Peer Relationship Plan",
    "Emotional Wellbeing Plan",
    "Therapy/CAMHS support plan",
    "Chronology",
    "Direct Work Evidence",
    "Child Voice Evidence",
    "Consent forms",
    "Delegated authority forms",
    "CSE/CCE Risk Assessment",
]

HOME_REGULATORY_DOCUMENTS = [
    "Statement of Purpose",
    "Children's Guide",
    "Locality Risk Assessment",
    "Workforce Development Plan",
    "Safeguarding Policy",
    "Missing Child Policy",
    "Behaviour Management Policy",
    "Restraint Policy",
    "Complaints Policy",
    "Whistleblowing Policy",
    "Fire Risk Assessment",
    "Health & Safety Risk Assessment",
    "Medication Policy",
    "Admissions Policy",
    "Equality & Diversity Policy",
    "Data Protection Policy",
    "Online Safety Policy",
    "Supervision Policy",
    "Safer Recruitment Policy",
    "Business Continuity Plan",
    "Infection Control Policy",
    "Lone Working Policy",
    "Mobile Phone/CCTV Policy",
    "Quality Assurance Calendar",
    "Reg 44 Reports",
    "Reg 45 Reviews",
    "Ofsted Action Plans",
    "Improvement Plans",
    "Training Matrix",
    "Shift Planning Guidance",
    "Missing Risk Procedures",
    "Safeguarding Escalation Procedures",
]

STAFF_DOCUMENTS = [
    "Supervision Records",
    "Appraisal Records",
    "Induction Records",
    "Probation Records",
    "DBS checks",
    "DBS Tracking",
    "Safer Recruitment File",
    "Safer Recruitment Checklist",
    "Training Records",
    "Competency Assessments",
    "Staff Development Plan",
    "Disciplinary Records",
    "Return-to-work records",
]


class HomeDocumentCatalogueService:
    """Complete document intelligence catalogue for children's home readiness."""

    def catalogue(
        self,
        *,
        home_id: int | str | None = None,
        child_ids: list[int | str] | None = None,
        staff_ids: list[int | str] | None = None,
    ) -> dict[str, Any]:
        items = []
        for name in CHILD_DOCUMENTS:
            for child_id in child_ids or ["child"]:
                items.append(self._item(name, "child", "key worker / manager", f"child:{child_id}"))
        for name in HOME_REGULATORY_DOCUMENTS:
            items.append(self._item(name, "home + regulatory", "registered manager", f"home:{home_id or 'home'}"))
        for name in STAFF_DOCUMENTS:
            for staff_id in staff_ids or ["staff"]:
                items.append(self._item(name, "staff", "registered manager / responsible individual", f"staff:{staff_id}"))
        return safe_payload(
            {
                "home_id": home_id,
                "summary": "records indicate the complete home document catalogue is available for Inspection evidence preparation review.",
                "items": [item.model_dump() for item in items],
                "counts": {
                    "child_documents": len(CHILD_DOCUMENTS) * max(1, len(child_ids or [])),
                    "home_regulatory_documents": len(HOME_REGULATORY_DOCUMENTS),
                    "staff_documents": len(STAFF_DOCUMENTS) * max(1, len(staff_ids or [])),
                    "total": len(items),
                },
            }
        )

    def _item(self, document_type: str, category: str, owner: str, linked: str) -> DocumentCatalogueItem:
        return DocumentCatalogueItem(
            document_type=document_type,
            category=category,
            owner=owner,
            linked_child_home_staff=linked,
            linked_regulation=self._regulations(document_type),
            linked_standard=self._standards(document_type),
            review_frequency=self._frequency(document_type),
            evidence_requirements=[
                "source document present",
                "last reviewed date visible",
                "manager oversight or signoff visible where required",
                "child voice or staff evidence visible where relevant",
            ],
        )

    def _regulations(self, document_type: str) -> list[str]:
        text = document_type.lower()
        if "reg 44" in text:
            return ["Reg 44"]
        if "reg 45" in text:
            return ["Reg 45"]
        if "safeguarding" in text or "missing" in text or "risk" in text:
            return ["Reg 12", "Reg 13"]
        if "supervision" in text or "training" in text or "recruitment" in text or "dbs" in text:
            return ["Reg 32", "Reg 33"]
        return ["Children's Homes Regulations"]

    def _standards(self, document_type: str) -> list[str]:
        text = document_type.lower()
        if "education" in text or "pep" in text:
            return ["education"]
        if "health" in text or "medication" in text or "camhs" in text:
            return ["health_and_wellbeing"]
        if "voice" in text or "guide" in text or "direct work" in text:
            return ["children_views_wishes_feelings"]
        if "safeguarding" in text or "missing" in text or "risk" in text:
            return ["protection_of_children"]
        if "supervision" in text or "training" in text or "quality" in text:
            return ["leadership_and_management"]
        return ["care_planning"]

    def _frequency(self, document_type: str) -> str:
        text = document_type.lower()
        if "reg 44" in text:
            return "monthly"
        if "reg 45" in text:
            return "six-monthly"
        if "fire" in text or "health & safety" in text:
            return "annual and after significant change"
        if "risk" in text or "missing" in text or "safety" in text:
            return "monthly or after significant event"
        return "annual or when circumstances change"


home_document_catalogue_service = HomeDocumentCatalogueService()
