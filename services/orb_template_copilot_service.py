from __future__ import annotations

"""Standalone ORB template copilot.

This service turns natural-language requests such as "build me a safeguarding
template" or "help me write a locality risk assessment" into structured,
residential-childcare templates. It is intentionally standalone: it does not
read or write IndiCare OS records.
"""

from typing import Any


TEMPLATE_SECTIONS: dict[str, list[str]] = {
    "incident_review": [
        "Basic details",
        "What happened",
        "Immediate safety and welfare response",
        "Child voice and lived experience",
        "Safeguarding considerations",
        "Professional curiosity questions",
        "Recording quality check",
        "Manager oversight",
        "Learning and plan updates",
    ],
    "risk_assessment": [
        "Identified risk",
        "Known triggers and context",
        "Protective factors",
        "Current controls",
        "Child voice",
        "Staff response plan",
        "Escalation and notifications",
        "Review date and evidence of impact",
    ],
    "locality_risk_assessment": [
        "Home and locality profile",
        "Local safeguarding context",
        "Missing-from-care and exploitation risks",
        "Transport, routes and risky locations",
        "Education, community and peer-group risks",
        "Online and contextual safeguarding risks",
        "Protective factors and local partnerships",
        "Staff guidance and escalation arrangements",
        "Manager review and evidence of impact",
    ],
    "care_plan": [
        "About the child",
        "What matters to the child",
        "Needs, strengths and protective factors",
        "Daily support plan",
        "Relationships and emotional safety",
        "Safeguarding and risk support",
        "Education, health and family time",
        "Child voice and participation",
        "Review and evidence of impact",
    ],
    "safeguarding_template": [
        "Concern or incident",
        "Immediate safety actions",
        "What is known",
        "What is not yet known",
        "Child voice and presentation",
        "Professional curiosity",
        "Escalation and notifications",
        "Management oversight",
        "Follow-up and learning",
    ],
    "supervision_reflection": [
        "Situation discussed",
        "Emotional impact on adult and child",
        "Practice strengths",
        "Learning points",
        "Safeguarding or recording considerations",
        "Support needed",
        "Agreed actions",
        "Review date",
    ],
}


class OrbTemplateCopilotService:
    def detect_template_type(self, message: str) -> str | None:
        text = str(message or "").lower()
        if "locality" in text and "risk" in text:
            return "locality_risk_assessment"
        if "risk assessment" in text:
            return "risk_assessment"
        if "care plan" in text or "placement plan" in text:
            return "care_plan"
        if "incident" in text and ("template" in text or "review" in text):
            return "incident_review"
        if "safeguarding" in text and "template" in text:
            return "safeguarding_template"
        if "supervision" in text and ("template" in text or "reflection" in text):
            return "supervision_reflection"
        if "template" in text:
            return "safeguarding_template"
        return None

    def prompt_block(self, message: str, *, role: str | None = None) -> str:
        template_type = self.detect_template_type(message)
        if not template_type:
            return ""
        sections = TEMPLATE_SECTIONS.get(template_type, [])
        lines = [
            "ORB Template Copilot:",
            f"- Detected template type: {template_type.replace('_', ' ')}",
            "- If the user asks for a template, create a usable template rather than only giving advice.",
            "- Keep it residential-childcare specific, child-centred and inspection-aware.",
            "- Include placeholders the adult can complete; do not invent facts about a child, home or location.",
            "- Build in child voice, safeguarding, professional curiosity, manager oversight, review date and evidence of impact where relevant.",
        ]
        if role:
            lines.append(f"- Adapt complexity for role: {role}.")
        if sections:
            lines.append("- Suggested sections:")
            lines.extend(f"  - {section}" for section in sections)
        return "\n".join(lines)

    def build_template(self, template_type: str, *, title: str | None = None) -> dict[str, Any]:
        key = template_type if template_type in TEMPLATE_SECTIONS else "safeguarding_template"
        return {
            "template_type": key,
            "title": title or key.replace("_", " ").title(),
            "sections": [
                {
                    "heading": section,
                    "prompt": self._section_prompt(key, section),
                    "placeholder": "[Complete this section]",
                }
                for section in TEMPLATE_SECTIONS[key]
            ],
            "standalone": True,
            "os_records_accessed": False,
        }

    def _section_prompt(self, template_type: str, section: str) -> str:
        lower = section.lower()
        if "child voice" in lower:
            return "Record the child's own words, presentation, wishes, feelings or what they may be communicating."
        if "impact" in lower:
            return "Explain what changed for the child and how adults know the action made a difference."
        if "manager" in lower or "oversight" in lower:
            return "Record management review, challenge, rationale, actions and follow-up date."
        if "safeguarding" in lower:
            return "Consider risk, protective factors, escalation, professional curiosity and local safeguarding procedures."
        if "local" in lower or "location" in lower:
            return "Use local knowledge and verified public/location information; do not rely on assumptions."
        return "Complete factually, using child-centred and non-judgemental language."


orb_template_copilot_service = OrbTemplateCopilotService()
