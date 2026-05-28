"""Query classification and unified knowledge-spine retrieval for standalone ORB."""

from __future__ import annotations

from typing import Any

from assistant.knowledge_loader import (
    build_knowledge_source_summary,
    load_knowledge_version,
    select_relevant_python_knowledge,
)
from services.orb_knowledge_source_pack_service import get_source_pack
from services.orb_operating_brain_service import orb_operating_brain_service

RESEARCH_INTENT_TERMS = (
    "research",
    "find sources",
    "cited answer",
    "give me cited",
    "what does guidance say",
    "ofsted says",
    "regulation says",
    "official guidance",
    "source says",
)

RESEARCH_NOTE = (
    "I can give a source-basis answer from built-in knowledge. "
    "Live web/source retrieval is not enabled in this standalone mode yet."
)

KNOWLEDGE_SPINE_PACK_TYPE = "orb_knowledge_spine"
ORB_OPERATING_BRAIN_PACK_TYPE = "orb_operating_brain"


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(message: str) -> str:
    return _text(message).lower()


def _clip(text: str, limit: int = 900) -> str:
    text = _text(text)
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


class OrbKnowledgeRetrievalService:
    """Classifies standalone queries and selects honest built-in knowledge.

    This is the convergence bridge between the rich /orb experience, the
    assistant/knowledge spine, ORB data vaults and the ORB-only operating brain.
    Source packs remain as high-level source labels, while the Knowledge Spine
    and Operating Brain provide the detailed runtime control knowledge.
    """

    def classify_query(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
    ) -> dict[str, Any]:
        lower = _lower(message)
        mode_name = _text(mode) or "Ask ORB"
        has_images = bool(attachments)
        selected_modules = select_relevant_python_knowledge(message, max_modules=8)
        module_sources = build_knowledge_source_summary(selected_modules)
        operating_sections = orb_operating_brain_service.relevant_sections(message, mode=mode_name)

        intents = {
            "product_context": self.should_use_product_knowledge(message, mode=mode_name),
            "regulatory_framework": self.should_use_regulatory_knowledge(message, mode=mode_name),
            "recording_quality": self.should_use_recording_quality(message, mode=mode_name),
            "safeguarding_principles": self.should_use_safeguarding_boundary(message, mode=mode_name),
            "therapeutic_practice": self._should_use_therapeutic(message, mode=mode_name),
            "residential_childrens_homes": self._should_use_residential_practice(message, mode=mode_name),
            "general_knowledge": self.should_use_general_knowledge(message, mode=mode_name),
            "user_provided_context": profile_context
            or "standalone context profiles" in lower
            or "profile:" in lower
            or has_images,
            "standalone_boundary": True,
            "research_intent": self._has_research_intent(lower),
            "knowledge_spine": bool(selected_modules),
            "orb_operating_brain": bool(operating_sections),
        }

        pack_keys = self._pack_keys_from_intents(intents, mode=mode_name)
        return {
            "intents": intents,
            "pack_keys": pack_keys,
            "mode": mode_name,
            "research_intent": intents["research_intent"],
            "research_note": RESEARCH_NOTE if intents["research_intent"] else None,
            "routing_hint": self._routing_hint(intents, mode=mode_name),
            "knowledge_spine": {
                "enabled": True,
                "version": load_knowledge_version(),
                "selected_modules": list(selected_modules.keys()),
                "source_summary": module_sources,
            },
            "orb_operating_brain": {
                "enabled": True,
                "selected_sections": list(operating_sections.keys()),
                "source_summary": orb_operating_brain_service.source_summary(),
            },
        }

    def retrieve_sources(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
    ) -> list[dict[str, Any]]:
        classification = self.classify_query(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=attachments,
        )
        packs: list[dict[str, Any]] = []
        for key in classification["pack_keys"]:
            pack = get_source_pack(key)
            if pack:
                packs.append(dict(pack))

        operating_pack = self._build_operating_brain_pack(message, mode=classification["mode"])
        spine_pack = self._build_knowledge_spine_pack(message, mode=classification["mode"])
        insert_at = 1 if packs and packs[0].get("pack_key") == "standalone_boundary" else 0
        if operating_pack:
            packs.insert(insert_at, operating_pack)
            insert_at += 1
        if spine_pack:
            packs.insert(insert_at, spine_pack)

        if classification.get("research_intent"):
            for pack in packs:
                pack["research_intent"] = True
        return packs

    def retrieve_knowledge_spine(
        self,
        message: str,
        *,
        mode: str | None = None,
        max_modules: int = 8,
    ) -> dict[str, Any]:
        selected_modules = select_relevant_python_knowledge(message, max_modules=max_modules)
        operating_sections = orb_operating_brain_service.relevant_sections(message, mode=mode)
        return {
            "enabled": True,
            "version": load_knowledge_version(),
            "mode": _text(mode) or "Ask ORB",
            "selected_modules": list(selected_modules.keys()),
            "modules": selected_modules,
            "source_summary": build_knowledge_source_summary(selected_modules),
            "orb_operating_brain": {
                "enabled": True,
                "selected_sections": list(operating_sections.keys()),
                "sections": operating_sections,
                "source_summary": orb_operating_brain_service.source_summary(),
            },
        }

    def build_grounding_context(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
    ) -> str:
        classification = self.classify_query(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=attachments,
        )
        packs = self.retrieve_sources(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=attachments,
        )
        spine = self.retrieve_knowledge_spine(message, mode=mode)
        lines = [
            "Grounding context (unified ORB Knowledge Spine — not live OS records or web browsing):",
        ]
        for pack in packs:
            lines.append(
                f"- {pack['source_label']}: {pack['description']} "
                f"(reliability: {pack['reliability']}; live_retrieved: {pack['live_retrieved']})"
            )
            if pack.get("guidance_notes"):
                lines.append(f"  Guidance: {pack['guidance_notes']}")
        operating = spine.get("orb_operating_brain") or {}
        if operating.get("enabled"):
            lines.append("\nORB Operating Brain selected:")
            lines.append(orb_operating_brain_service.build_prompt_block(message, mode=mode))
        if spine["selected_modules"]:
            lines.append("\nDetailed knowledge modules selected:")
            for module_name, module_text in spine["modules"].items():
                lines.append(f"\n[{module_name}]\n{_clip(module_text, 1600)}")
        lines.append(
            "Answer using this source basis. Cite honest labels in structured sources; do not fabricate URLs or exact quotes."
        )
        if classification.get("research_note"):
            lines.append(f"Research note for the user: {classification['research_note']}")
        return "\n".join(lines)

    def should_use_product_knowledge(self, message: str, *, mode: str | None = None) -> bool:
        lower = _lower(message)
        terms = (
            "indicare",
            "orb care companion",
            "care companion",
            "/orb",
            "intelligence spine",
            "care hub",
            "what is indicare",
            "tell me about indicare",
        )
        return any(term in lower for term in terms)

    def should_use_regulatory_knowledge(self, message: str, *, mode: str | None = None) -> bool:
        lower = _lower(message)
        if (mode or "").strip() == "Ofsted Lens":
            return True
        terms = (
            "ofsted",
            "sccif",
            "quality standard",
            "children's homes regulation",
            "childrens homes regulation",
            "reg 44",
            "reg 45",
            "inspection",
            "what would ofsted",
        )
        return any(term in lower for term in terms)

    def should_use_recording_quality(self, message: str, *, mode: str | None = None) -> bool:
        if (mode or "").strip() == "Record This Properly":
            return True
        lower = _lower(message)
        terms = (
            "daily note",
            "write a note",
            "record this",
            "wording",
            "incident report",
            "log entry",
            "recording quality",
            "how should i record",
        )
        return any(term in lower for term in terms)

    def should_use_safeguarding_boundary(self, message: str, *, mode: str | None = None) -> bool:
        if (mode or "").strip() == "Safeguarding":
            return True
        lower = _lower(message)
        terms = (
            "safeguarding",
            "does this need safeguarding",
            "abuse",
            "exploitation",
            "missing from care",
            "self-harm",
            "self harm",
            "child protection",
        )
        return any(term in lower for term in terms)

    def should_use_general_knowledge(self, message: str, *, mode: str | None = None) -> bool:
        lower = _lower(message)
        specialist = (
            self.should_use_product_knowledge(message, mode=mode)
            or self.should_use_regulatory_knowledge(message, mode=mode)
            or self.should_use_recording_quality(message, mode=mode)
            or self.should_use_safeguarding_boundary(message, mode=mode)
            or self._should_use_therapeutic(message, mode=mode)
        )
        if specialist:
            return False
        general_markers = (
            "quantum",
            "what is ",
            "explain ",
            "how does ",
            "calculate",
            "summarise",
            "summarize",
            "email",
            "plan",
        )
        return any(marker in lower for marker in general_markers) or len(lower.split()) <= 12

    def _should_use_therapeutic(self, message: str, *, mode: str | None = None) -> bool:
        if (mode or "").strip() in {"Behaviour Support", "Reflect", "Therapeutic Reframe"}:
            return True
        lower = _lower(message)
        terms = (
            "trauma",
            "therapeutic",
            "behaviour support",
            "behavior support",
            "restorative",
            "repair",
            "regulation",
            "meltdown",
            "dysregulated",
        )
        return any(term in lower for term in terms)

    def _should_use_residential_practice(self, message: str, *, mode: str | None = None) -> bool:
        lower = _lower(message)
        terms = (
            "children's home",
            "childrens home",
            "residential",
            "young person",
            "looked after",
            "placement",
            "keywork",
            "child voice",
            "daily note",
            "registered home",
        )
        return any(term in lower for term in terms) or (mode or "").strip() in {
            "Record This Properly",
            "Ofsted Lens",
            "Behaviour Support",
            "Therapeutic Reframe",
            "Manager Copilot",
        }

    def _has_research_intent(self, lower: str) -> bool:
        return any(term in lower for term in RESEARCH_INTENT_TERMS)

    def _build_operating_brain_pack(self, message: str, *, mode: str | None = None) -> dict[str, Any] | None:
        sections = orb_operating_brain_service.relevant_sections(message, mode=mode)
        if not sections:
            return None
        return {
            "id": "orb_operating_brain",
            "pack_key": "orb_operating_brain",
            "title": "ORB operating brain",
            "source_type": ORB_OPERATING_BRAIN_PACK_TYPE,
            "description": "ORB-only answer standards, safety rules, routing map, hidden checks and evaluation criteria.",
            "source_label": "ORB Operating Brain",
            "reliability": "built_in_orb_control_knowledge",
            "applies_to_modes": [mode or "Ask ORB"],
            "short_citation_label": "ORB Operating Brain",
            "guidance_notes": f"Selected sections: {', '.join(sections.keys())}",
            "live_retrieved": False,
            "category": "orb_control",
            "official_source": False,
            "confidence_level": "high",
            "governance_status": "approved",
            "selected_sections": list(sections.keys()),
            "source_summary": orb_operating_brain_service.source_summary(),
        }

    def _build_knowledge_spine_pack(self, message: str, *, mode: str | None = None) -> dict[str, Any] | None:
        spine = self.retrieve_knowledge_spine(message, mode=mode)
        modules = spine.get("selected_modules") or []
        if not modules:
            return None
        return {
            "id": "orb_unified_knowledge_spine",
            "pack_key": "orb_knowledge_spine",
            "title": "ORB unified knowledge spine",
            "source_type": KNOWLEDGE_SPINE_PACK_TYPE,
            "description": "Routed assistant/knowledge modules selected for this ORB answer.",
            "source_label": "ORB Knowledge Spine",
            "reliability": "built_in_routed_practice_knowledge",
            "applies_to_modes": [mode or "Ask ORB"],
            "short_citation_label": "ORB Knowledge Spine",
            "guidance_notes": f"Selected modules: {', '.join(modules)}",
            "live_retrieved": False,
            "category": "knowledge_spine",
            "official_source": False,
            "confidence_level": "high",
            "governance_status": "approved",
            "selected_modules": modules,
            "knowledge_version": spine.get("version"),
            "source_summary": spine.get("source_summary"),
        }

    def _pack_keys_from_intents(self, intents: dict[str, bool], *, mode: str) -> list[str]:
        keys: list[str] = ["standalone_boundary"]
        if intents.get("product_context"):
            keys.append("indicare_product")
        if intents.get("regulatory_framework"):
            keys.extend(["ofsted_sccif", "childrens_homes_regulations", "quality_standards"])
        if intents.get("residential_childrens_homes"):
            keys.append("residential_childrens_homes")
        if intents.get("safeguarding_principles"):
            keys.append("safeguarding_principles")
        if intents.get("recording_quality"):
            keys.append("recording_quality")
        if intents.get("therapeutic_practice"):
            keys.append("therapeutic_practice")
        if intents.get("user_provided_context"):
            keys.append("user_provided_context")
        if intents.get("general_knowledge"):
            keys.append("general_knowledge")
        elif not any(
            intents.get(flag)
            for flag in (
                "product_context",
                "regulatory_framework",
                "recording_quality",
                "safeguarding_principles",
                "therapeutic_practice",
                "knowledge_spine",
                "orb_operating_brain",
            )
        ):
            keys.append("general_knowledge")

        seen: set[str] = set()
        ordered: list[str] = []
        for key in keys:
            if key in seen:
                continue
            seen.add(key)
            ordered.append(key)
        return ordered

    def _routing_hint(self, intents: dict[str, bool], *, mode: str) -> str:
        if intents.get("research_intent"):
            return "deep_research_foundation"
        if intents.get("safeguarding_principles") or mode == "Safeguarding":
            return "safeguarding_reflection_brain"
        if intents.get("regulatory_framework") or mode == "Ofsted Lens":
            return "regulatory_reflection_brain"
        if intents.get("recording_quality") or mode == "Record This Properly":
            return "recording_quality_brain"
        if intents.get("product_context"):
            return "product_explanation_brain"
        if intents.get("orb_operating_brain"):
            return "orb_operating_brain"
        if intents.get("knowledge_spine"):
            return "orb_knowledge_spine_brain"
        if intents.get("general_knowledge"):
            return "general_assistant_brain"
        return "general_assistant_brain"


orb_knowledge_retrieval_service = OrbKnowledgeRetrievalService()
