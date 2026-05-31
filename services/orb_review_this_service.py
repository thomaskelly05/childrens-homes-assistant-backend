from __future__ import annotations

"""Review This pathway for ORB Residential.

Reviews user-supplied text against child-centred, safeguarding, recording,
plan impact, leadership, SCCIF and outstanding practice lenses.
Standalone-safe: never accesses live OS records.
"""

from typing import Any


REVIEW_SECTIONS = [
    "Overall View",
    "Strengths",
    "Missing Information",
    "Child Voice",
    "Child Experience",
    "Safeguarding",
    "Professional Curiosity",
    "Impact",
    "Leadership",
    "Ofsted Lens",
    "Outstanding Practice",
    "Suggested Improvements",
]

DOCUMENT_TYPES = {
    "incident": "incident record",
    "care_plan": "care plan",
    "risk_assessment": "risk assessment",
    "chronology": "chronology",
    "supervision": "supervision record",
    "reg44": "Reg 44 report",
    "reg45": "Reg 45 quality review",
    "locality_risk": "locality risk assessment",
    "daily_note": "daily note",
    "safeguarding_record": "safeguarding record",
    "general": "professional document",
}


class OrbReviewThisService:
    def detect(self, message: str, *, mode: str | None = None) -> bool:
        text = f"{message or ''} {mode or ''}".lower()
        if "review this" in text:
            return True
        if "review my" in text or "review the" in text:
            if any(
                term in text
                for term in (
                    "incident",
                    "care plan",
                    "record",
                    "assessment",
                    "chronology",
                    "supervision",
                    "reg 44",
                    "reg 45",
                    "locality",
                    "daily note",
                    "safeguarding",
                )
            ):
                return True
        return False

    def detect_document_type(self, message: str, *, explicit: str | None = None) -> str:
        if explicit and explicit in DOCUMENT_TYPES:
            return explicit
        text = (message or "").lower()
        mapping = [
            ("incident", "incident"),
            ("care plan", "care_plan"),
            ("risk assessment", "risk_assessment"),
            ("chronology", "chronology"),
            ("supervision", "supervision"),
            ("reg 44", "reg44"),
            ("reg 45", "reg45"),
            ("locality", "locality_risk"),
            ("daily note", "daily_note"),
            ("safeguarding", "safeguarding_record"),
        ]
        for phrase, doc_type in mapping:
            if phrase in text:
                return doc_type
        return "general"

    def prompt_block(
        self,
        message: str,
        *,
        document_type: str | None = None,
        document_text: str | None = None,
        role: str | None = None,
    ) -> str:
        if not self.detect(message) and not document_text:
            return ""
        doc_type = document_type or self.detect_document_type(message)
        doc_label = DOCUMENT_TYPES.get(doc_type, "document")
        lines = [
            "ORB Review This pathway:",
            f"- Document type: {doc_label}",
            "- Review ONLY the text the user supplied. Do not invent facts about a child, home or incident.",
            "- If content is missing, say what information is needed rather than guessing.",
            "- Do not claim access to live IndiCare OS records or ISN operational data.",
            "- Do not grade the home or predict Ofsted outcomes; identify practice quality and evidence gaps.",
            "- Use these markdown ## headings in order:",
        ]
        lines.extend(f"  - ## {section}" for section in REVIEW_SECTIONS)
        lines.extend(
            [
                "- Apply: child experience, child voice, safeguarding, professional curiosity, recording quality, "
                "evidence of impact, plan impact, leadership/RI oversight, SCCIF/Quality Standards lens, outstanding practice.",
                "- In 'Suggested Rewrite / Template Where Helpful', name an ORB template ID if useful "
                "(e.g. missing_return_conversation, incident_record, locality_risk_assessment).",
            ]
        )
        if role:
            lines.append(f"- Adapt depth for role: {role}.")
        if document_text:
            preview = document_text.strip()[:4000]
            lines.append("- User-supplied document to review:")
            lines.append(preview)
        return "\n".join(lines)

    def metadata(
        self,
        message: str,
        *,
        document_type: str | None = None,
        document_text: str | None = None,
    ) -> dict[str, Any]:
        active = self.detect(message) or bool(document_text)
        doc_type = document_type or self.detect_document_type(message)
        return {
            "active": active,
            "document_type": doc_type,
            "document_label": DOCUMENT_TYPES.get(doc_type, "document"),
            "review_sections": REVIEW_SECTIONS if active else [],
            "display_labels": ["Review This"] if active else [],
            "reasoning_lenses": [
                "Child Voice",
                "Safeguarding",
                "Recording Quality",
                "Evidence of Impact",
                "Ofsted / SCCIF",
                "Outstanding Practice",
            ]
            if active
            else [],
            "vault_domains": ["review", "recording", "safeguarding"],
            "active_brains": ["review_this_cognition", "recording_quality_cognition", "outstanding_practice_cognition"]
            if active
            else [],
            "standalone": True,
            "os_records_accessed": False,
        }


orb_review_this_service = OrbReviewThisService()
