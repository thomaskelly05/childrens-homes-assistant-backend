from __future__ import annotations

from typing import Any


ANNEX_A_SECTIONS = [
    ("home_profile", "Home profile and registration details"),
    ("registered_manager", "Registered manager details"),
    ("responsible_individual", "Responsible individual details"),
    ("staffing", "Staff rota, vacancies, supervision and training"),
    ("children", "Children currently placed and admission/discharge history"),
    ("notifications", "Notifications, complaints, restraints, missing and safeguarding records"),
    ("quality_assurance", "Reg 44, Reg 45, QA activity and action plans"),
    ("policies_checks", "Statement of Purpose, policies, fire, health and safety and medication audits"),
    ("child_documents", "Care plans, risk assessments and locality risk assessment"),
]


class AnnexAReadinessService:
    """Builds Annex A-style readiness drafts from visible operating data."""

    def build(
        self,
        *,
        home_profile: dict[str, Any] | None = None,
        staff: list[dict[str, Any]] | None = None,
        children: list[dict[str, Any]] | None = None,
        records: list[dict[str, Any]] | None = None,
        documents: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        home_profile = home_profile or {}
        staff = staff or []
        children = children or []
        records = records or []
        documents = documents or []
        sections = [self._section(key, title, home_profile, staff, children, records, documents) for key, title in ANNEX_A_SECTIONS]
        missing = [gap for section in sections for gap in section["missing_evidence"]]
        stale = [gap for section in sections for gap in section["stale_evidence"]]
        confidence = self._confidence(sections)
        return {
            "summary": "Annex A readiness draft is populated from visible records and requires manager review.",
            "sections": sections,
            "missing_evidence": missing,
            "stale_evidence": stale,
            "auto_filled_draft_sections": {section["section_id"]: section["draft"] for section in sections},
            "confidence_indicator": confidence,
            "manager_oversight_required": bool(missing or stale),
            "rm_review_required": True,
            "ri_review_required": any(section["section_id"] in {"quality_assurance", "staffing"} for section in sections),
            "never_submit_automatically": True,
            "guardrails": ["Draft only", "Manager must review/sign off", "No Ofsted submission is automated"],
        }

    def _section(
        self,
        key: str,
        title: str,
        home: dict[str, Any],
        staff: list[dict[str, Any]],
        children: list[dict[str, Any]],
        records: list[dict[str, Any]],
        documents: list[dict[str, Any]],
    ) -> dict[str, Any]:
        evidence = self._evidence_for(key, home, staff, children, records, documents)
        missing = [] if evidence else [f"no evidence found for {title}"]
        stale = [f"stale evidence may need review for {title}"] if any(str(item.get("status", "")).lower() in {"overdue", "expired", "stale"} for item in evidence) else []
        return {
            "section_id": key,
            "title": title,
            "evidence_count": len(evidence),
            "draft": self._draft(key, evidence),
            "missing_evidence": missing,
            "stale_evidence": stale,
            "action_required": "ready for manager review" if evidence and not stale else "review recommended",
        }

    def _evidence_for(self, key: str, home: dict[str, Any], staff: list[dict[str, Any]], children: list[dict[str, Any]], records: list[dict[str, Any]], documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if key == "home_profile":
            return [home] if home else []
        if key in {"registered_manager", "responsible_individual"}:
            fields = ("registered_manager", "registered_manager_name") if key == "registered_manager" else ("responsible_individual", "responsible_individual_name")
            return [{"name": home.get(field)} for field in fields if home.get(field)]
        if key == "staffing":
            return [*staff, *self._docs(documents, "training", "supervision", "rota", "vacanc")]
        if key == "children":
            return children
        if key == "notifications":
            return self._records(records, "notification", "complaint", "restraint", "missing", "safeguarding", "allegation")
        if key == "quality_assurance":
            return [*self._docs(documents, "reg 44", "reg44", "reg 45", "reg45", "quality", "qa"), *self._records(records, "manager_review", "qa")]
        if key == "policies_checks":
            return self._docs(documents, "statement of purpose", "policy", "fire", "health", "safety", "medication")
        if key == "child_documents":
            return self._docs(documents, "care plan", "risk assessment", "locality", "placement plan", "matching")
        return []

    def _records(self, records: list[dict[str, Any]], *terms: str) -> list[dict[str, Any]]:
        return [record for record in records if any(term in str(record).lower() for term in terms)]

    def _docs(self, documents: list[dict[str, Any]], *terms: str) -> list[dict[str, Any]]:
        return [document for document in documents if any(term in str(document.get("document_type") or document.get("title") or document).lower() for term in terms)]

    def _draft(self, key: str, evidence: list[dict[str, Any]]) -> dict[str, Any]:
        return {"section": key, "source_count": len(evidence), "source_refs": [item.get("id") or item.get("document_type") or item.get("name") for item in evidence[:8]], "status": "draft_only"}

    def _confidence(self, sections: list[dict[str, Any]]) -> str:
        ready = sum(1 for section in sections if section["evidence_count"] and not section["stale_evidence"])
        ratio = ready / max(1, len(sections))
        if ratio >= 0.8:
            return "ready for manager review"
        if ratio >= 0.45:
            return "partial evidence found"
        return "limited evidence found"


annex_a_readiness_service = AnnexAReadinessService()
