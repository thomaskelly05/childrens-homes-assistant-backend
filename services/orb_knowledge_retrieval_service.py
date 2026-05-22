"""Query classification and built-in source-pack retrieval for standalone ORB."""

from __future__ import annotations

import re
from typing import Any

from services.orb_knowledge_source_pack_service import get_source_pack

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


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(message: str) -> str:
    return _text(message).lower()


class OrbKnowledgeRetrievalService:
    """Classifies standalone queries and selects honest built-in source packs."""

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
        }

        pack_keys = self._pack_keys_from_intents(intents, mode=mode_name)
        return {
            "intents": intents,
            "pack_keys": pack_keys,
            "mode": mode_name,
            "research_intent": intents["research_intent"],
            "research_note": RESEARCH_NOTE if intents["research_intent"] else None,
            "routing_hint": self._routing_hint(intents, mode=mode_name),
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
        if classification.get("research_intent"):
            for pack in packs:
                pack["research_intent"] = True
        return packs

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
        lines = [
            "Grounding context (built-in source packs — not live OS records or web browsing):",
        ]
        for pack in packs:
            lines.append(
                f"- {pack['source_label']}: {pack['description']} "
                f"(reliability: {pack['reliability']}; live_retrieved: {pack['live_retrieved']})"
            )
            if pack.get("guidance_notes"):
                lines.append(f"  Guidance: {pack['guidance_notes']}")
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
        if (mode or "").strip() in {"Behaviour Support", "Reflect"}:
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
        }

    def _has_research_intent(self, lower: str) -> bool:
        return any(term in lower for term in RESEARCH_INTENT_TERMS)

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
        if intents.get("general_knowledge"):
            return "general_assistant_brain"
        return "general_assistant_brain"


orb_knowledge_retrieval_service = OrbKnowledgeRetrievalService()
