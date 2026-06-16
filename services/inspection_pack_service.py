from __future__ import annotations

from typing import Any

from services.annex_a_readiness_service import annex_a_readiness_service
from services.document_gap_analysis_service import document_gap_analysis_service
from services.inspection_intelligence_service import inspection_intelligence_service
from services.regulatory_ontology_service import regulatory_ontology_service


class InspectionPackService:
    """Composes manager-reviewed Inspection evidence preparation packs."""

    def build_pack(
        self,
        *,
        home_id: int | str | None = None,
        evidence: dict[str, Any] | None = None,
        home_profile: dict[str, Any] | None = None,
        staff: list[dict[str, Any]] | None = None,
        children: list[dict[str, Any]] | None = None,
        records: list[dict[str, Any]] | None = None,
        documents: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        evidence = evidence or {"cards": records or [], "gaps": []}
        annex_a = annex_a_readiness_service.build(
            home_profile=home_profile,
            staff=staff,
            children=children,
            records=records,
            documents=documents,
        )
        document_gaps = document_gap_analysis_service.analyse(
            home_id=home_id,
            existing_documents=documents,
            child_ids=[child.get("id") for child in children or [] if child.get("id")],
            staff_ids=[person.get("id") for person in staff or [] if person.get("id")],
        )
        readiness = inspection_intelligence_service.readiness(evidence=evidence, workspace={"annex_a": annex_a, "document_gaps": document_gaps})
        return {
            "home_id": home_id,
            "summary": "Inspection pack is a draft evidence workspace for manager review.",
            "ontology": regulatory_ontology_service.summary().model_dump(mode="json"),
            "annex_a_readiness": annex_a,
            "document_gap_analysis": document_gaps,
            "inspection_readiness": readiness,
            "manager_only": True,
            "auto_submit": False,
            "signoff_required": True,
            "language": ["review recommended", "limited evidence found", "ready for manager review", "consider strengthening evidence", "no evidence found"],
            "guardrails": [
                "No automatic Ofsted submission.",
                "No Reg 45 final judgement is generated.",
                "No safeguarding decision is made.",
            ],
        }


inspection_pack_service = InspectionPackService()
