from __future__ import annotations

from typing import Any

from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_official_source_anchor_service import orb_official_source_anchor_service


class SharedInstitutionalCognitionRuntime:
    """Shared ORB/OS cognition runtime.

    This runtime provides one institutional brain with different data boundaries:
    - standalone_orb: guidance-first, no live care-record access
    - os_orb: permissioned operational context where the OS provides it
    """

    def build_context(
        self,
        *,
        surface: str,
        message: str,
        mode: str | None = None,
        operational_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        boundary = self._boundary(surface)
        active_brains = self._active_brains(message=message, mode=mode)
        grounded_prompt = orb_grounded_answer_style_service.prompt_block(message, mode=mode)
        official_prompt = orb_official_source_anchor_service.source_prompt()
        citations = []
        citations.extend(orb_grounded_answer_style_service.citation_payload(message, mode=mode))
        if citations:
            citations.extend(orb_official_source_anchor_service.citation_payload())

        return {
            "surface": surface,
            "mode": mode or "Ask ORB",
            "boundary": boundary,
            "active_brains": active_brains,
            "prompt_blocks": [block for block in (official_prompt, grounded_prompt) if block],
            "citations": citations,
            "operational_context_available": bool(operational_context),
            "operational_context_used": bool(operational_context and boundary["can_use_live_records"]),
            "response_requirements": self._response_requirements(active_brains=active_brains, boundary=boundary),
            "explainability": {
                "framework_grounding": bool(citations),
                "official_source_anchors": bool(citations),
                "data_boundary": boundary["summary"],
            },
        }

    def prompt_addendum(
        self,
        *,
        surface: str,
        message: str,
        mode: str | None = None,
        operational_context: dict[str, Any] | None = None,
    ) -> str:
        context = self.build_context(
            surface=surface,
            message=message,
            mode=mode,
            operational_context=operational_context,
        )
        lines = [
            "Shared institutional cognition runtime:",
            f"- Surface: {context['surface']}",
            f"- Boundary: {context['boundary']['summary']}",
            "- Active brains: " + "; ".join(context["active_brains"]),
        ]
        lines.extend(context["response_requirements"])
        lines.extend(context["prompt_blocks"])
        return "\n\n".join(lines)

    def _boundary(self, surface: str) -> dict[str, Any]:
        if surface == "os_orb":
            return {
                "summary": "OS ORB may use permissioned operational context supplied by IndiCare OS.",
                "can_use_live_records": True,
                "can_write_records": False,
                "must_not_claim_unseen_context": True,
            }
        return {
            "summary": "Standalone ORB is guidance-first and must not access live OS records.",
            "can_use_live_records": False,
            "can_write_records": False,
            "must_not_claim_unseen_context": True,
        }

    def _active_brains(self, *, message: str, mode: str | None = None) -> list[str]:
        text = str(message or "").lower()
        mode_text = str(mode or "").lower()
        brains = ["general_intelligence", "residential_practice"]
        if any(term in text or term in mode_text for term in ("ofsted", "sccif", "regulation", "quality standard", "evidence")):
            brains.append("regulatory_cognition")
        if any(term in text or term in mode_text for term in ("safeguard", "risk", "allegation", "missing", "harm")):
            brains.append("safeguarding_cognition")
        if any(term in text or term in mode_text for term in ("trauma", "therapeutic", "behaviour", "repair", "regulated", "reflect")):
            brains.append("therapeutic_reflective_cognition")
        if any(term in text or term in mode_text for term in ("record", "wording", "chronology", "daily note", "incident")):
            brains.append("recording_quality_cognition")
        if any(term in text or term in mode_text for term in ("manager", "oversight", "audit", "reg 44", "reg 45", "leadership")):
            brains.append("governance_cognition")
        return list(dict.fromkeys(brains))

    def _response_requirements(self, *, active_brains: list[str], boundary: dict[str, Any]) -> list[str]:
        requirements = [
            "- Give a direct useful answer first.",
            "- Use calm British English and child-centred professional wording.",
            "- Explain uncertainty and do not overstate confidence.",
        ]
        if "regulatory_cognition" in active_brains:
            requirements.append("- Use inline framework anchors and explain why they matter in practice.")
        if "safeguarding_cognition" in active_brains:
            requirements.append("- Keep decision-making human-led and local-procedure-led.")
        if "recording_quality_cognition" in active_brains:
            requirements.append("- Separate fact, interpretation, child voice, adult response and outcome.")
        if not boundary["can_use_live_records"]:
            requirements.append("- Do not claim access to live care records or OS context.")
        return requirements


shared_institutional_cognition_runtime = SharedInstitutionalCognitionRuntime()
