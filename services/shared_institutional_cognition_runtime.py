from __future__ import annotations

from typing import Any

from services.indicare_intelligence_surface_router import standalone_guidance_boundary_prefix
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_official_source_anchor_service import orb_official_source_anchor_service
from services.orb_professional_curiosity_service import orb_professional_curiosity_service


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
        depth_frame = orb_institutional_depth_frame_service.build_frame(message=message, mode=mode)
        active_brains = self._merge_depth_brains(active_brains=active_brains, depth_frame=depth_frame)
        grounded_prompt = orb_grounded_answer_style_service.prompt_block(message, mode=mode)
        depth_prompt = orb_institutional_depth_frame_service.prompt_block(message=message, mode=mode)
        curiosity_prompt = orb_professional_curiosity_service.prompt_block(message, mode=mode)
        official_prompt = orb_official_source_anchor_service.source_prompt()
        guidance_prefix = None
        if surface == "standalone_orb":
            prefix = standalone_guidance_boundary_prefix(message)
            if prefix:
                guidance_prefix = (
                    f"Standalone ORB boundary: open with '{prefix.strip()}' when answering this practice/hypothetical question."
                )
        citations = []
        citations.extend(orb_grounded_answer_style_service.citation_payload(message, mode=mode))
        if citations:
            citations.extend(orb_official_source_anchor_service.citation_payload())

        return {
            "surface": surface,
            "mode": mode or "Ask ORB",
            "boundary": boundary,
            "active_brains": active_brains,
            "depth_frame": depth_frame,
            "prompt_blocks": [
                block
                for block in (guidance_prefix, official_prompt, grounded_prompt, depth_prompt, curiosity_prompt)
                if block
            ],
            "guidance_boundary_prefix": guidance_prefix,
            "professional_curiosity": orb_professional_curiosity_service.context_payload(message, mode=mode),
            "citations": citations,
            "operational_context_available": bool(operational_context),
            "operational_context_used": bool(operational_context and boundary["can_use_live_records"]),
            "response_requirements": self._response_requirements(
                message=message,
                mode=mode,
                active_brains=active_brains,
                boundary=boundary,
                depth_frame=depth_frame,
            ),
            "explainability": {
                "framework_grounding": bool(citations),
                "official_source_anchors": bool(citations),
                "data_boundary": boundary["summary"],
                "depth_topic": depth_frame.get("topic") if depth_frame else None,
                "reasoning_lenses": depth_frame.get("required_lenses", []) if depth_frame else [],
                "cognition_mode": mode or "Ask ORB",
                "safeguarding_boundaries": list(boundary.get("safeguarding_boundaries", []))
                if isinstance(boundary.get("safeguarding_boundaries"), list)
                else [],
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
        depth_frame = context.get("depth_frame") or {}
        if depth_frame:
            lines.extend(
                [
                    f"- Depth topic: {depth_frame.get('topic')}",
                    f"- Depth purpose: {depth_frame.get('purpose')}",
                ]
            )
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
            "summary": (
                "Standalone ORB is guidance-first and must not access live OS records. "
                "Answer hypothetical, practice, recording, Ofsted-expectation and therapeutic questions generally — "
                "preface with 'I cannot see the actual live child record, but generally…' when useful."
            ),
            "can_use_live_records": False,
            "can_write_records": False,
            "must_not_claim_unseen_context": True,
            "safeguarding_boundaries": [
                "Only block or redirect when the user asks to inspect, summarise, retrieve, analyse or use live IndiCare OS records.",
                "Do not block general hypotheticals, practice questions, recording advice, Ofsted expectations or therapeutic interpretation.",
            ],
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
        if any(
            term in text
            for term in (
                "pattern",
                "repeated",
                "again",
                "escalat",
                "chronology",
                "timeline",
                "over time",
                "history of",
                "drift",
                "theme",
            )
        ):
            brains.append("chronology_cognition")
        return list(dict.fromkeys(brains))

    def _merge_depth_brains(self, *, active_brains: list[str], depth_frame: dict[str, Any]) -> list[str]:
        brains = list(active_brains)
        topic = str((depth_frame or {}).get("topic") or "").lower()
        topic_map = {
            "allegations": [
                "safeguarding_cognition",
                "regulatory_cognition",
                "governance_cognition",
                "recording_quality_cognition",
                "therapeutic_reflective_cognition",
                "professional_curiosity_cognition",
            ],
            "cumulative": [
                "safeguarding_cognition",
                "chronology_cognition",
                "governance_cognition",
                "professional_curiosity_cognition",
            ],
            "missing": [
                "safeguarding_cognition",
                "regulatory_cognition",
                "governance_cognition",
                "therapeutic_reflective_cognition",
                "chronology_cognition",
            ],
            "restraint": [
                "safeguarding_cognition",
                "regulatory_cognition",
                "recording_quality_cognition",
                "therapeutic_reflective_cognition",
                "chronology_cognition",
            ],
            "recording": ["recording_quality_cognition", "therapeutic_reflective_cognition"],
            "chronology": ["chronology_cognition", "regulatory_cognition", "governance_cognition"],
            "inspection": ["regulatory_cognition", "governance_cognition", "evidence_confidence"],
            "therapeutic": ["therapeutic_reflective_cognition", "emotional_climate"],
            "leadership": ["governance_cognition", "provider_cognition", "regulatory_cognition"],
            "workforce": ["workforce_cognition", "governance_cognition", "emotional_climate"],
            "general residential": ["chronology_cognition"],
        }
        for key, additions in topic_map.items():
            if key in topic:
                brains.extend(additions)
        if depth_frame and "general intelligence" not in topic:
            brains.append("institutional_depth_frame")
        return list(dict.fromkeys(brains))

    def _response_requirements(
        self,
        *,
        message: str,
        mode: str | None,
        active_brains: list[str],
        boundary: dict[str, Any],
        depth_frame: dict[str, Any] | None = None,
    ) -> list[str]:
        requirements = [
            "- Give a direct useful answer first.",
            "- Use calm British English and child-centred professional wording.",
            "- Explain uncertainty and do not overstate confidence.",
            "- Apply professional curiosity: ask what may be missing, what an inspector or DSL might explore, "
            "what patterns matter, what oversight is needed, what emotional meaning exists, and what evidence "
            "would strengthen confidence — without making threshold decisions.",
        ]
        if depth_frame:
            requirements.extend(
                [
                    "- Apply the institutional depth frame rather than giving a generic summary.",
                    "- Show practical professional reasoning, not just definitions.",
                    "- For high-attention topics, structure the answer through: practical meaning; safeguarding thinking; "
                    "recording expectations; leadership/oversight; therapeutic/emotional meaning; inspection lens; "
                    "professional boundary — only where relevant, not as empty headings.",
                ]
            )
        if "chronology_cognition" in active_brains:
            requirements.extend(
                [
                    "- Think longitudinally where relevant: patterns, escalation, repeated themes, emotional drift, "
                    "placement instability, relationship changes, staff culture and repeated oversight gaps.",
                    "- Be story-aware without inventing facts the user has not provided.",
                ]
            )
        if "regulatory_cognition" in active_brains:
            requirements.append("- Use inline framework anchors and explain why they matter in practice.")
        if "safeguarding_cognition" in active_brains:
            requirements.extend(
                [
                    "- Keep decision-making human-led and local-procedure-led.",
                    "- For safeguarding or allegations topics, weave [Reg 12], [Reg 13], [SCCIF], [Working Together], [LADO] and [Recording quality] into the reasoning — not a generic summary list.",
                    "- Explain management oversight, evidence expectations, recording quality, therapeutic/emotional safety and escalation thinking in practical residential-home terms.",
                ]
            )
        if "recording_quality_cognition" in active_brains:
            requirements.append("- Separate fact, interpretation, child voice, adult response and outcome.")
        curiosity = orb_professional_curiosity_service.context_payload(message, mode=mode)
        if curiosity.get("high_attention"):
            requirements.append(
                "- Apply the Professional Curiosity Engine: explore missing information, minimisation, hidden patterns, "
                "RM/DSL/RI/Ofsted lenses, evidence needs, follow-up and longitudinal meaning."
            )
        if not boundary["can_use_live_records"]:
            requirements.append("- Do not claim access to live care records or OS context.")
            requirements.append(
                "- For hypothetical or practice questions, answer with general professional guidance; "
                "use 'I cannot see the actual live child record, but generally…' when clarifying the standalone boundary."
            )
        return requirements


shared_institutional_cognition_runtime = SharedInstitutionalCognitionRuntime()
