"""Query classification and unified knowledge-spine retrieval for standalone ORB."""

from __future__ import annotations

import time
from typing import Any

from assistant.knowledge_loader import (
    build_knowledge_source_summary,
    load_knowledge_version,
    select_relevant_python_knowledge,
)
from services.orb_knowledge_source_pack_service import get_source_pack
from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
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

LIVE_LOOKUP_INTENT_TERMS = (
    "weather",
    "forecast",
    "headline",
    "headlines",
    "news",
    "sport",
    "sports",
    "score",
    "scores",
    "fixture",
    "fixtures",
    "cinema",
    "what is on",
    "what's on",
    "nearby",
    "near me",
    "latest",
    "today",
    "current",
    "right now",
    "whitley bay",
    "newcastle",
)

LIVE_LOOKUP_NOTE = (
    "Live weather, news, sports scores, and local search are not connected in standalone ORB yet. "
    "ORB will not guess current facts — check an official source or connect a web/search provider when ready."
)

HIGH_RISK_TERMS = (
    "immediate danger",
    "suicide",
    "self-harm",
    "self harm",
    "abuse",
    "allegation",
    "alleged",
    "exploitation",
    "missing from care",
    "restraint",
    "medication error",
    "overdose",
    "peer-on-peer",
    "peer on peer",
    "sexual harm",
    "weapon",
    "emergency",
    "lado",
    "do not want to be here",
    "don't want to be here",
    "don't want to live",
    "no point being here",
    "can't do this anymore",
    "doesn't want to wake up",
    "want to die",
    "member of staff grabbed",
    "staff grabbed",
    "staff hit me",
    "staff touched me",
    "staff threatened me",
)

RESIDENTIAL_PROMPT_MODES = {
    "Record This Properly",
    "Ofsted Lens",
    "Therapeutic Reframe",
    "Manager Copilot",
    "Staff Coach",
    "Reg 44 / Reg 45 Prep",
    "Behaviour Support",
    "Policy Explainer",
    "Scenario Simulator",
    "Reflect with ORB",
}

DEEP_SAFETY_MODES = {
    "Safeguarding Thinking",
    "Safeguarding",
}

KNOWLEDGE_SPINE_PACK_TYPE = "orb_knowledge_spine"
ORB_OPERATING_BRAIN_PACK_TYPE = "orb_operating_brain"

SIMPLE_STANDARD_CONTRACT_FAMILIES = frozenset(
    {
        "accessible_child_support_plan",
        "template_generation",
        "daily_record",
        "school_refusal_recording",
        "contact_distress_recording",
        "medication_refusal_guidance",
        "keywork_session",
        "policy_practice_question",
        "make_more_concise",
        "convert_to_recording_wording",
        "voice_response",
    }
)


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
        from services.orb_universal_answer_contract_map_service import (
            detect_contract_family,
            get_contract_family,
        )

        family_id = detect_contract_family(message)
        family = get_contract_family(family_id) or {}
        is_simple_standard = (
            family_id in SIMPLE_STANDARD_CONTRACT_FAMILIES
            and family.get("depth_tier") == "standard"
            and not any(term in lower for term in HIGH_RISK_TERMS)
        )
        module_cap = 1 if is_simple_standard else 8
        selected_modules = select_relevant_python_knowledge(message, max_modules=module_cap)
        module_sources = build_knowledge_source_summary(selected_modules)
        operating_sections = orb_operating_brain_service.relevant_sections(message, mode=mode_name)

        intents = {
            "product_context": self.should_use_product_knowledge(message, mode=mode_name),
            "regulatory_framework": False if is_simple_standard else self.should_use_regulatory_knowledge(message, mode=mode_name),
            "recording_quality": self.should_use_recording_quality(message, mode=mode_name),
            "safeguarding_principles": False if is_simple_standard else self.should_use_safeguarding_boundary(message, mode=mode_name),
            "therapeutic_practice": self._should_use_therapeutic(message, mode=mode_name) if not is_simple_standard else bool(
                family_id == "accessible_child_support_plan"
            ),
            "residential_childrens_homes": self._should_use_residential_practice(message, mode=mode_name),
            "academy_nvq_learning": False if is_simple_standard else self._should_use_academy_nvq_learning(message, mode=mode_name),
            "general_knowledge": self.should_use_general_knowledge(message, mode=mode_name),
            "user_provided_context": profile_context
            or "standalone context profiles" in lower
            or "profile:" in lower
            or has_images,
            "standalone_boundary": True,
            "research_intent": self._has_research_intent(lower),
            "live_lookup_intent": self._has_live_lookup_intent(lower),
            "knowledge_spine": bool(selected_modules),
            "orb_operating_brain": bool(operating_sections) and not is_simple_standard,
            "simple_standard_contract": is_simple_standard,
            "contract_family": family_id,
        }

        pack_keys = self._pack_keys_from_intents(intents, mode=mode_name)
        return {
            "intents": intents,
            "pack_keys": pack_keys,
            "mode": mode_name,
            "research_intent": intents["research_intent"],
            "research_note": RESEARCH_NOTE if intents["research_intent"] else None,
            "live_lookup_intent": intents["live_lookup_intent"],
            "live_lookup_note": LIVE_LOOKUP_NOTE if intents["live_lookup_intent"] else None,
            "recording_intent": bool(intents.get("recording_quality")),
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

    def resolve_prompt_tier(
        self,
        message: str,
        *,
        mode: str | None = None,
        classification: dict[str, Any] | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
    ) -> str:
        """Return fast | residential | deep for tiered standalone prompting."""
        mode_name = _text(mode) or "Ask ORB"
        if classification is None:
            classification = self.classify_query(
                message,
                mode=mode,
                profile_context=profile_context,
                attachments=attachments,
            )
        intents = classification.get("intents") or {}
        lower = _lower(message)

        if mode_name in DEEP_SAFETY_MODES:
            return "deep"
        if any(term in lower for term in HIGH_RISK_TERMS):
            if "restraint" in lower and any(
                phrase in lower
                for phrase in (
                    "record",
                    "recording",
                    "write",
                    "wording",
                    "note",
                    "log",
                    "what do i",
                    "what should i",
                )
            ):
                if not any(
                    marker in lower
                    for marker in (
                        "injury",
                        "hurt",
                        "hospital",
                        "abuse",
                        "allegation",
                        "serious",
                        "escalat",
                    )
                ):
                    return "residential"
            return "deep"
        if mode_name in RESIDENTIAL_PROMPT_MODES:
            return "residential"
        if intents.get("safeguarding_principles"):
            return "deep"
        if intents.get("regulatory_framework") or intents.get("recording_quality"):
            return "residential"
        if intents.get("therapeutic_practice") or intents.get("residential_childrens_homes"):
            return "residential"
        if profile_context or attachments:
            return "residential"
        if intents.get("product_context"):
            return "residential"
        if intents.get("live_lookup_intent"):
            return "fast"
        if intents.get("general_knowledge"):
            return "fast"
        return "fast"

    def prepare_request_bundle(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
        profile_role: str | None = None,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Single retrieval pass per request (classification, packs, grounding, tier)."""
        started = time.perf_counter()
        classification = self.classify_query(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=attachments,
        )
        prompt_tier = self.resolve_prompt_tier(
            message,
            mode=mode,
            classification=classification,
            profile_context=profile_context,
            attachments=attachments,
        )
        if prompt_tier == "fast":
            packs: list[dict[str, Any]] = []
        else:
            packs = self.retrieve_sources(
                message,
                mode=mode,
                profile_context=profile_context,
                attachments=attachments,
                classification=classification,
            )
        max_modules = {"fast": 0, "residential": 3, "deep": 8}.get(prompt_tier, 3)
        is_simple_standard = bool((classification.get("intents") or {}).get("simple_standard_contract"))
        if is_simple_standard:
            max_modules = min(max_modules, 1)
            prompt_tier = "residential" if prompt_tier == "deep" else prompt_tier
        if max_modules:
            spine = self.retrieve_knowledge_spine(message, mode=mode, max_modules=max_modules)
        else:
            spine = {
                "enabled": False,
                "version": load_knowledge_version(),
                "mode": _text(mode) or "Ask ORB",
                "selected_modules": [],
                "modules": {},
                "source_summary": [],
                "orb_operating_brain": {
                    "enabled": False,
                    "selected_sections": [],
                    "sections": {},
                    "source_summary": orb_operating_brain_service.source_summary(),
                },
            }
        grounding_context = self._build_grounding_for_tier(
            classification=classification,
            packs=packs,
            spine=spine,
            message=message,
            mode=mode,
            prompt_tier=prompt_tier,
            simple_standard_contract=is_simple_standard,
        )
        retrieval_elapsed_ms = int((time.perf_counter() - started) * 1000)
        expert_context = orb_expert_scenario_bank_service.detect_expert_context(message)
        expert_packet: dict[str, Any] = {"active": False}
        expert_block = ""
        expert_brain_9: dict[str, Any] = {"active": False}
        indicare_intelligence: dict[str, Any] = {"active": False}
        from services.indicare_intelligence_core_service import indicare_intelligence_core_service

        indicare_intelligence = indicare_intelligence_core_service.build_intelligence_packet(
            message,
            mode=mode,
            profile_role=profile_role,
            history=history,
            profile_context=profile_context,
        )
        expert_brain_9 = indicare_intelligence.get("orb9_packet") or expert_brain_9
        expert_packet = expert_brain_9.get("expert_packet") or expert_packet
        expert_block = indicare_intelligence.get("prompt_block") or ""
        depth = indicare_intelligence.get("expert_depth") or "general_light"
        from services.orb_universal_answer_contract_map_service import (
            detect_contract_family,
            get_contract_family,
        )

        family_id = detect_contract_family(message)
        family = get_contract_family(family_id)
        if is_simple_standard and expert_block:
            expert_block = self._trim_prompt_block_for_simple_contract(expert_block, family_id=family_id)
            indicare_intelligence = {**indicare_intelligence, "prompt_block": expert_block}
        simple_contract_families = SIMPLE_STANDARD_CONTRACT_FAMILIES
        skip_expert_bank = family_id in simple_contract_families and prompt_tier != "deep"
        if not expert_block and prompt_tier != "fast" and not skip_expert_bank:
            expert_block = orb_expert_answer_engine_service.build_prompt_block(expert_packet)
            if not expert_block:
                expert_block = orb_expert_scenario_bank_service.expert_prompt_block(message)
        if expert_block:
            grounding_context = f"{expert_block}\n\n{grounding_context}".strip()
        family = get_contract_family(family_id)
        family_prompt_cap = (family or {}).get("prompt_tier_cap")
        tier_order = ("fast", "residential", "deep")
        if depth in ("residential_deep", "safeguarding_critical") and prompt_tier != "deep":
            if family_prompt_cap != "residential":
                prompt_tier = "deep"
        elif depth in ("residential_light", "residential_standard") and prompt_tier == "fast":
            prompt_tier = "residential"
        if family_prompt_cap and tier_order.index(prompt_tier) > tier_order.index(str(family_prompt_cap)):
            prompt_tier = str(family_prompt_cap)
        if family_id in {
            "accessible_child_support_plan",
            "template_generation",
            "daily_record",
            "school_refusal_recording",
            "contact_distress_recording",
            "medication_refusal_guidance",
            "keywork_session",
            "policy_practice_question",
        } and prompt_tier == "deep":
            prompt_tier = "residential"
        retrieval_count = len(packs) + len((spine.get("modules") or {}))
        if expert_block:
            retrieval_count += 1
        prompt_char_estimate = len(grounding_context) + len(expert_block)
        indicare_intelligence = {
            **indicare_intelligence,
            "selected_contract": family_id,
            "prompt_char_estimate": prompt_char_estimate,
            "retrieval_count": retrieval_count,
            "embedding_calls": 0,
        }
        return {
            "classification": classification,
            "prompt_tier": prompt_tier,
            "source_packs": packs,
            "grounding_context": grounding_context,
            "retrieval_elapsed_ms": retrieval_elapsed_ms,
            "grounding_char_count": len(grounding_context),
            "expert_scenario_context": expert_context,
            "expert_answer_packet": expert_packet,
            "expert_brain_9": expert_brain_9,
            "indicare_intelligence": indicare_intelligence,
            "expert_depth": indicare_intelligence.get("expert_depth"),
            "care_relevance_score": indicare_intelligence.get("care_relevance_score"),
            "selected_contract": family_id,
            "retrieval_count": retrieval_count,
            "embedding_calls": 0,
            "prompt_char_estimate": prompt_char_estimate,
            "simple_standard_contract": is_simple_standard,
        }

    def retrieve_sources(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        attachments: list[Any] | None = None,
        classification: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        if classification is None:
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
        prompt_tier: str | None = None,
    ) -> str:
        bundle = self.prepare_request_bundle(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=attachments,
        )
        if prompt_tier and prompt_tier != bundle["prompt_tier"]:
            return self._build_grounding_for_tier(
                classification=bundle["classification"],
                packs=bundle["source_packs"],
                spine=self.retrieve_knowledge_spine(
                    message,
                    mode=mode,
                    max_modules={"fast": 0, "residential": 3, "deep": 8}.get(prompt_tier, 3) or 1,
                ),
                message=message,
                mode=mode,
                prompt_tier=prompt_tier,
            )
        return bundle["grounding_context"]

    def _trim_prompt_block_for_simple_contract(self, block: str, *, family_id: str | None) -> str:
        """Keep only concise standalone + contract-relevant guidance for simple templates."""
        from services.orb_universal_answer_contract_map_service import build_contract_prompt_block

        contract_block = build_contract_prompt_block(family_id)
        lines = [
            "IndiCare Intelligence (simple standard contract — concise path):",
            "- ORB does not diagnose, predict Ofsted grades, or claim live OS access.",
            "- Child-centred, communication-aware residential guidance only.",
        ]
        if contract_block:
            lines.append(contract_block)
        trimmed = "\n".join(lines)
        return trimmed if len(trimmed) < len(block) else _clip(block, 1200)

    def estimate_prompt_assembly_chars(
        self,
        message: str,
        *,
        mode: str | None = None,
        contract_prompt_block: str = "",
        standalone_framing: str = "",
    ) -> dict[str, Any]:
        """Estimate prompt assembly size for QA/tests (retrieval bundle + contract block)."""
        bundle = self.prepare_request_bundle(message, mode=mode)
        total = (
            bundle.get("prompt_char_estimate", 0)
            + len(contract_prompt_block)
            + len(standalone_framing)
        )
        from services.orb_universal_answer_contract_map_service import STANDARD_DEPTH_PROMPT_CHAR_CAP

        return {
            "prompt_chars": total,
            "grounding_chars": bundle.get("grounding_char_count", 0),
            "retrieval_count": bundle.get("retrieval_count", 0),
            "embedding_calls": bundle.get("embedding_calls", 0),
            "selected_contract": bundle.get("selected_contract"),
            "prompt_tier": bundle.get("prompt_tier"),
            "simple_standard_contract": bundle.get("simple_standard_contract"),
            "exceeds_standard_cap": total > STANDARD_DEPTH_PROMPT_CHAR_CAP,
            "standard_cap": STANDARD_DEPTH_PROMPT_CHAR_CAP,
        }

    def _build_grounding_for_tier(
        self,
        *,
        classification: dict[str, Any],
        packs: list[dict[str, Any]],
        spine: dict[str, Any],
        message: str,
        mode: str | None,
        prompt_tier: str,
        simple_standard_contract: bool = False,
    ) -> str:
        if prompt_tier == "fast":
            return (
                "Grounding (fast path): standalone ORB only — no live IndiCare OS records or web browsing. "
                "Use concise, accurate answers; add residential care boundaries only when the question needs them."
            )

        if simple_standard_contract:
            lines = [
                "Grounding (simple standard contract — concise residential framing only):",
                "- Standalone ORB: no live OS records, no web browsing.",
                "- Child-centred planning and communication-aware practice.",
                "- Use the answer contract shape; do not load deep safeguarding or regulatory banks.",
            ]
            for pack in packs[:2]:
                lines.append(f"- {pack['source_label']}: {pack['description']}")
            return "\n".join(lines)

        from services.orb_knowledge_answer_priority_service import orb_knowledge_answer_priority_service

        lines = [
            "Grounding context (unified ORB Knowledge Spine — not live OS records or web browsing):",
            orb_knowledge_answer_priority_service.build_priority_prompt_block(topic=message[:120]),
        ]
        pack_limit = 4 if prompt_tier == "residential" else len(packs)
        for pack in packs[:pack_limit]:
            lines.append(
                f"- {pack['source_label']}: {pack['description']} "
                f"(reliability: {pack['reliability']}; live_retrieved: {pack['live_retrieved']})"
            )
            if pack.get("guidance_notes") and prompt_tier == "deep":
                lines.append(f"  Guidance: {pack['guidance_notes']}")

        operating = spine.get("orb_operating_brain") or {}
        if operating.get("enabled"):
            if prompt_tier == "deep":
                lines.append("\nORB Operating Brain selected:")
                lines.append(orb_operating_brain_service.build_prompt_block(message, mode=mode))
            else:
                sections = operating.get("selected_sections") or list(
                    (operating.get("sections") or {}).keys()
                )
                if sections:
                    lines.append(
                        f"\nORB Operating Brain sections (summary): {', '.join(sections[:6])}"
                    )

        modules = spine.get("modules") or {}
        if modules:
            clip = 700 if prompt_tier == "residential" else 1600
            lines.append("\nDetailed knowledge modules selected:")
            for module_name, module_text in modules.items():
                lines.append(f"\n[{module_name}]\n{_clip(module_text, clip)}")

        lines.append(
            "Answer using this source basis. Cite honest labels in structured sources; do not fabricate URLs or exact quotes."
        )
        if classification.get("research_note") and prompt_tier != "fast":
            lines.append(f"Research note for the user: {classification['research_note']}")
        if classification.get("live_lookup_note") and prompt_tier != "fast":
            lines.append(f"Live lookup note for the user: {classification['live_lookup_note']}")
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
        from services.orb_therapeutic_language_contract_service import is_residential_incident_scenario

        if (mode or "").strip() == "Record This Properly":
            return True
        if is_residential_incident_scenario(message):
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
            "family time",
            "family contact",
            "kicked off",
            "kicking off",
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
        mode_name = _text(mode)
        if mode_name == "General Knowledge":
            return True
        lower = _lower(message)
        specialist = (
            self.should_use_product_knowledge(message, mode=mode)
            or self.should_use_regulatory_knowledge(message, mode=mode)
            or self.should_use_recording_quality(message, mode=mode)
            or self.should_use_safeguarding_boundary(message, mode=mode)
            or self._should_use_therapeutic(message, mode=mode)
            or self._should_use_residential_practice(message, mode=mode)
            or self._has_live_lookup_intent(lower)
        )
        if specialist:
            return False
        return True

    def _should_use_therapeutic(self, message: str, *, mode: str | None = None) -> bool:
        from services.orb_therapeutic_language_contract_service import is_residential_incident_scenario

        if (mode or "").strip() in {"Behaviour Support", "Reflect", "Therapeutic Reframe"}:
            return True
        if is_residential_incident_scenario(message):
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
            "kicked off",
            "kicking off",
            "played up",
        )
        return any(term in lower for term in terms)

    def _should_use_residential_practice(self, message: str, *, mode: str | None = None) -> bool:
        from services.orb_therapeutic_language_contract_service import is_residential_incident_scenario

        if is_residential_incident_scenario(message):
            return True
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
            "family time",
            "family contact",
        )
        return any(term in lower for term in terms) or (mode or "").strip() in {
            "Record This Properly",
            "Ofsted Lens",
            "Behaviour Support",
            "Therapeutic Reframe",
            "Manager Copilot",
        }

    def _should_use_academy_nvq_learning(self, message: str, *, mode: str | None = None) -> bool:
        lower = _lower(message)
        terms = (
            "nvq",
            "diploma",
            "qualification",
            "workbook",
            "portfolio",
            "assessor",
            "learner",
            "reflective account",
            "professional discussion",
            "witness testimony",
            "competency",
            "level 3",
            "level 4",
            "level 5",
            "academy",
            "evidence mapping",
        )
        return any(term in lower for term in terms) or (mode or "").strip() == "Staff Coach"

    def _has_research_intent(self, lower: str) -> bool:
        return any(term in lower for term in RESEARCH_INTENT_TERMS)

    def _has_live_lookup_intent(self, lower: str) -> bool:
        bare_temporal_terms = ("today", "current", "right now", "latest")
        residential_context_terms = (
            "incident",
            "young person",
            "child",
            "family contact",
            "safeguarding",
            "children's home",
            "childrens home",
            "residential",
            "kicking off",
            "kicked off",
            "restraint",
            "daily note",
            "incident report",
            "write the",
            "help me to write",
            "help me write",
        )
        if any(term in lower for term in bare_temporal_terms):
            if any(term in lower for term in residential_context_terms):
                return False
        return any(term in lower for term in LIVE_LOOKUP_INTENT_TERMS)

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
        if intents.get("academy_nvq_learning"):
            keys.extend(
                [
                    "academy_learning",
                    "nvq_diploma_support",
                    "workforce_development",
                    "qualification_evidence",
                    "reflective_practice_learning",
                ]
            )
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
        if intents.get("live_lookup_intent"):
            return "live_lookup_extension"
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
        if intents.get("orb_operating_brain"):
            return "orb_operating_brain"
        if intents.get("knowledge_spine"):
            return "orb_knowledge_spine_brain"
        return "general_assistant_brain"


orb_knowledge_retrieval_service = OrbKnowledgeRetrievalService()
