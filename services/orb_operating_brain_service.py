from __future__ import annotations

"""Runtime access to ORB-only operating brain knowledge.

The ORB operating brain is separate from OS templates and live records. It gives
standalone ORB its answer standards, safety rules, routing map, hidden checks,
role behaviours, confidence rules and evaluation expectations.
"""

from typing import Any

from assistant.knowledge.orb_operating_brain import KNOWLEDGE


def _lower(text: str | None) -> str:
    return str(text or "").lower().strip()


class OrbOperatingBrainService:
    def get_knowledge(self) -> dict[str, Any]:
        return KNOWLEDGE

    def source_summary(self) -> dict[str, Any]:
        return {
            "module": "orb_operating_brain",
            "source_type": "orb_control_knowledge",
            "label": "ORB Operating Brain",
            "standalone_safe": True,
            "live_os_records": False,
        }

    def relevant_sections(self, message: str, *, mode: str | None = None) -> dict[str, Any]:
        text = _lower(f"{mode or ''} {message or ''}")
        knowledge = self.get_knowledge()
        sections: dict[str, Any] = {
            "product_statement": knowledge["product_statement"],
            "answer_standard": knowledge["answer_standard"],
            "safety_rules": knowledge["safety_rules"],
            "confidence_levels": knowledge["confidence_levels"],
            "source_referencing_rules": knowledge["source_referencing_rules"],
        }

        if any(term in text for term in ("missing", "absent", "where is", "ran", "missing episode")):
            sections["routing_map_missing_episode"] = knowledge["routing_map"].get("missing_episode")
            sections["review_checklist_missing_episode"] = knowledge["review_checklists"].get("missing_episode")
        if any(term in text for term in ("restraint", "physical intervention", "hold", "restrictive")):
            sections["routing_map_restraint"] = knowledge["routing_map"].get("restraint")
            sections["review_checklist_restraint"] = knowledge["review_checklists"].get("restraint")
            sections["evaluation_restraint"] = knowledge["evaluation_tests"].get("restraint_recording")
        if any(term in text for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45")):
            sections["routing_map_ofsted"] = knowledge["routing_map"].get("ofsted")
            sections["coverage_matrix_areas"] = knowledge["coverage_matrix_areas"]
            sections["evaluation_ofsted_leadership"] = knowledge["evaluation_tests"].get("ofsted_leadership")
        if any(term in text for term in ("record", "recording", "daily log", "incident", "write this", "wording")):
            sections["routing_map_recording"] = knowledge["routing_map"].get("recording")
            sections["review_checklist_incident"] = knowledge["review_checklists"].get("incident")
            sections["hidden_template_checks"] = knowledge["hidden_template_checks"]
        if any(term in text for term in ("safeguard", "allegation", "disclosure", "lado", "abuse", "risk")):
            sections["routing_map_safeguarding"] = knowledge["routing_map"].get("safeguarding")
            sections["review_checklist_safeguarding"] = knowledge["review_checklists"].get("safeguarding_concern")
        if any(term in text for term in ("manager", "oversight", "ri", "responsible individual", "governance")):
            sections["routing_map_manager_oversight"] = knowledge["routing_map"].get("manager_oversight")
            sections["review_checklist_manager_oversight"] = knowledge["review_checklists"].get("manager_oversight")
            sections["role_based_behaviour"] = knowledge["role_based_behaviour"]
        if any(term in text for term in ("what am i missing", "anything missing", "missing here", "what have i missed")):
            sections["what_am_i_missing_checks"] = knowledge["what_am_i_missing_checks"]
            sections["evaluation_what_am_i_missing"] = knowledge["evaluation_tests"].get("what_am_i_missing")
        return sections

    def build_prompt_block(self, message: str, *, mode: str | None = None) -> str:
        sections = self.relevant_sections(message, mode=mode)
        lines = [
            "ORB Operating Brain (ORB-only control knowledge — not live OS records):",
            f"- Product purpose: {sections['product_statement']}",
            "- Use the answer standard where relevant: " + ", ".join(sections["answer_standard"]["required_when_relevant"]),
            "- Safety boundary: ORB can support, draft, review and suggest, but must not make final safeguarding, legal, medical or registered-manager decisions.",
            "- Confidence rules: high, medium, low, or cannot answer safely depending on evidence supplied.",
            "- Standalone boundary: cite ORB Knowledge Spine, data vaults, built-in guidance, uploaded documents or user-provided context only; do not imply live OS record access.",
        ]
        for key, value in sections.items():
            if key in {"product_statement", "answer_standard", "safety_rules", "confidence_levels", "source_referencing_rules"}:
                continue
            lines.append(f"- {key}: {value}")
        return "\n".join(lines)


orb_operating_brain_service = OrbOperatingBrainService()
