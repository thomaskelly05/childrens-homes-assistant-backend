from __future__ import annotations

from typing import Any

from services.indicare_intelligence_surface_router import standalone_guidance_boundary_prefix
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_knowledge_grounding_service import orb_knowledge_grounding_service
from services.orb_professional_curiosity_service import orb_professional_curiosity_service
from services.orb_residential_cognition_router import orb_residential_cognition_router
from services.orb_scenario_playbook_service import orb_scenario_playbook_service
from services.orb_sector_evidence_pipeline_service import orb_sector_evidence_pipeline_service


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
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        boundary = self._boundary(surface)
        routing = orb_residential_cognition_router.route(message=message, mode=mode)
        depth_frame = orb_institutional_depth_frame_service.build_frame(message=message, mode=mode)
        active_brains = list(routing.get("active_brains") or [])
        active_brains = self._merge_depth_brains(active_brains=active_brains, depth_frame=depth_frame)
        sector_evidence = self._sector_evidence_context(
            surface=surface,
            message=message,
            mode=mode,
            active_brains=active_brains,
        )
        active_brains = self._merge_sector_evidence_brains(active_brains, sector_evidence)
        grounding = orb_knowledge_grounding_service.build_grounding(
            message=message,
            mode=mode,
            routing={**routing, "active_brains": active_brains},
        )
        grounded_prompt = grounding.get("prompt_block") or orb_grounded_answer_style_service.prompt_block(message, mode=mode)
        depth_prompt = orb_institutional_depth_frame_service.prompt_block(message=message, mode=mode)
        curiosity_prompt = orb_professional_curiosity_service.prompt_block(message, mode=mode)
        playbook_prompt = orb_scenario_playbook_service.prompt_block(message)
        sector_evidence_prompt = sector_evidence.get("prompt_addendum")
        guidance_prefix = None
        if surface == "standalone_orb":
            prefix = standalone_guidance_boundary_prefix(message, history=history, mode=mode)
            if prefix:
                guidance_prefix = (
                    f"Standalone ORB boundary: open with '{prefix.strip()}' when answering this practice/hypothetical question. "
                    "Do not repeat this boundary phrase again in the same conversation unless the user asks about live records."
                )
        citations = list(grounding.get("citations") or [])
        citations.extend(sector_evidence.get("citations") or [])

        return {
            "surface": surface,
            "mode": mode or "Ask ORB",
            "boundary": boundary,
            "active_brains": active_brains,
            "cognition_display_labels": self._merge_display_labels(
                routing.get("cognition_display_labels") or [],
                sector_evidence.get("display_labels") or [],
            ),
            "routing": routing,
            "knowledge_grounding": grounding,
            "sector_evidence": sector_evidence,
            "depth_frame": depth_frame,
            "prompt_blocks": [
                block
                for block in (guidance_prefix, playbook_prompt, sector_evidence_prompt, grounded_prompt, depth_prompt, curiosity_prompt)
                if block
            ],
            "guidance_boundary_prefix": guidance_prefix,
            "professional_curiosity": orb_professional_curiosity_service.context_payload(message, mode=mode),
            "scenario_playbook": orb_scenario_playbook_service.routing_metadata(message),
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
                "reasoning_lenses": self._merge_display_labels(
                    (depth_frame.get("required_lenses") or routing.get("reasoning_lenses") or [])[:8],
                    sector_evidence.get("reasoning_lenses") or [],
                ),
                "cognition_mode": mode or "Ask ORB",
                "cognition_display_labels": self._merge_display_labels(
                    routing.get("cognition_display_labels") or [],
                    sector_evidence.get("display_labels") or [],
                ),
                "vault_domains": self._merge_display_labels(
                    grounding.get("vault_domains") or [],
                    sector_evidence.get("vault_domains") or [],
                ),
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
        history: list[dict[str, Any]] | None = None,
    ) -> str:
        context = self.build_context(
            surface=surface,
            message=message,
            mode=mode,
            operational_context=operational_context,
            history=history,
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
        sector = context.get("sector_evidence") or {}
        if sector.get("active"):
            lines.extend(
                [
                    "- Sector evidence pipelines: " + "; ".join(sector.get("pipeline_ids") or []),
                    "- Sector evidence boundary: use public learning themes as professional prompts; do not claim a user's scenario matches a named report or review.",
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
                "use a standalone boundary phrase only when clarifying limits — at most once per conversation."
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

    def _sector_evidence_context(
        self,
        *,
        surface: str,
        message: str,
        mode: str | None,
        active_brains: list[str],
    ) -> dict[str, Any]:
        if surface != "standalone_orb":
            return {"active": False, "reason": "not_standalone_orb"}
        prompt = orb_sector_evidence_pipeline_service.build_prompt_addendum(
            message,
            mode=mode,
            limit=4,
        )
        pipeline_ids = self._sector_pipeline_ids(message=message, mode=mode, active_brains=active_brains)
        if not prompt and not pipeline_ids:
            return {"active": False, "reason": "no_sector_evidence_trigger"}
        pipelines = []
        for pipeline_id in pipeline_ids:
            pipeline = orb_sector_evidence_pipeline_service.get_pipeline(pipeline_id)
            if pipeline:
                pipelines.append(pipeline)
        display_labels = [p["label"] for p in pipelines[:5]]
        reasoning_lenses = []
        vault_domains = []
        for pipeline in pipelines:
            reasoning_lenses.extend(pipeline.get("strengthens_lenses") or [])
            vault_domains.extend(pipeline.get("source_kinds") or [])
        return {
            "active": True,
            "prompt_addendum": prompt,
            "pipeline_ids": pipeline_ids,
            "pipelines": pipelines,
            "display_labels": display_labels,
            "reasoning_lenses": self._merge_display_labels([], reasoning_lenses),
            "vault_domains": self._merge_display_labels([], vault_domains),
            "active_brains": [f"sector_evidence:{pid}" for pid in pipeline_ids],
            "citations": [],
            "standalone": True,
            "os_records_accessed": False,
        }

    def _sector_pipeline_ids(self, *, message: str, mode: str | None, active_brains: list[str]) -> list[str]:
        text = f"{message or ''} {mode or ''}".lower()
        brain_text = " ".join(active_brains).lower()
        selected: list[str] = []
        def add(*ids: str) -> None:
            for pid in ids:
                if pid not in selected:
                    selected.append(pid)
        if any(term in text or term in brain_text for term in ("ofsted", "inspection", "sccif", "reg 44", "reg 45", "regulatory")):
            add("ofsted_current_cycle", "inspection_language_benchmark", "leadership_governance_ri")
        if any(term in text or term in brain_text for term in ("safeguard", "risk", "what am i missing", "professional curiosity", "allegation", "missing", "exploitation")):
            add("safeguarding_review_learning", "pfd_system_learning", "missing_exploitation_contextual_safeguarding")
        if any(term in text or term in brain_text for term in ("record", "recording", "daily note", "incident", "chronology", "wording")):
            add("recording_quality_learning", "inspection_language_benchmark")
        if any(term in text or term in brain_text for term in ("child voice", "lived experience", "wishes", "feelings", "advocacy", "complaint")):
            add("child_voice_lived_experience", "rights_advocacy_complaints")
        if any(term in text or term in brain_text for term in ("therapeutic", "trauma", "behaviour", "repair", "restorative", "attachment")):
            add("research_practice_evidence", "restrictive_practice_behaviour")
        if any(term in text or term in brain_text for term in ("manager", "leadership", "oversight", "ri", "responsible individual", "governance", "audit")):
            add("leadership_governance_ri", "ombudsman_complaints_learning")
        if any(term in text or term in brain_text for term in ("staff", "supervision", "training", "safer recruitment", "workforce", "induction")):
            add("workforce_safer_recruitment")
        if any(term in text for term in ("school", "education", "attendance", "pep", "send", "exclusion")):
            add("education_attendance_send")
        if any(term in text for term in ("health", "medication", "wellbeing", "mental health", "sleep", "eating")):
            add("health_medication_wellbeing")
        if any(term in text for term in ("equality", "identity", "autism", "neurodiv", "disability", "culture", "language")):
            add("equality_identity_neurodiversity")
        if any(term in text for term in ("restraint", "restrictive", "physical intervention", "de-escalation")):
            add("restrictive_practice_behaviour")
        if any(term in text for term in ("statistics", "sector trend", "market", "national picture", "data")):
            add("social_care_statistics")
        if any(term in text for term in ("consultation", "policy", "reform", "future", "bill")):
            add("policy_consultation_tracker", "guidance_change_tracker")
        if any(term in text for term in ("legal", "rights", "deprivation", "liberty", "court", "tribunal")):
            add("legal_boundary_learning")
        return selected[:8]

    def _merge_sector_evidence_brains(self, active_brains: list[str], sector_evidence: dict[str, Any]) -> list[str]:
        brains = list(active_brains)
        brains.extend(sector_evidence.get("active_brains") or [])
        return list(dict.fromkeys(brains))

    def _merge_display_labels(self, base: list[str], additions: list[str]) -> list[str]:
        values: list[str] = []
        for item in list(base or []) + list(additions or []):
            text = str(item or "").strip()
            if text and text not in values:
                values.append(text)
        return values

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
            "self_harm": ["safeguarding_cognition", "therapeutic_reflective_cognition", "recording_quality_cognition"],
            "exploitation": ["safeguarding_cognition", "chronology_cognition", "governance_cognition"],
            "behaviour": ["therapeutic_reflective_cognition", "recording_quality_cognition"],
            "family_time": ["therapeutic_reflective_cognition", "child_journey_cognition"],
            "staff culture": ["workforce_cognition", "governance_cognition"],
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
        if any(str(brain).startswith("sector_evidence:") for brain in active_brains):
            requirements.extend(
                [
                    "- Where public sector evidence is retrieved, use it as learning themes and professional prompts — not as a claim that this situation matches a named report, review or inspection.",
                    "- Make the practical relevance clear: what it changes about safeguarding thinking, recording, child voice, oversight or Ofsted evidence.",
                ]
            )
        if depth_frame:
            requirements.extend(
                [
                    "- Apply the institutional depth frame rather than giving a generic summary.",
                    "- Show practical professional reasoning, not just definitions.",
                    "- For high-attention topics, use markdown ## headings that render cleanly (e.g. ## Why this matters, "
                    "## What patterns to explore, ## Evidence to review, ## What a Registered Manager should ask, "
                    "## What an RI should ask, ## What Ofsted would look for, ## What not to assume, "
                    "## Immediate safe next steps). Use **bold** for emphasis inside sections.",
                    "- For high-attention topics, structure the answer through: practical meaning; safeguarding thinking; "
                    "recording expectations; leadership/oversight; therapeutic/emotional meaning; inspection lens; "
                    "professional boundary — only where relevant, not as empty headings.",
                ]
            )
            if depth_frame.get("response_structure"):
                requirements.append(
                    "- Follow the required response structure from the depth frame using markdown ## section headings."
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
        topic = curiosity.get("topic")
        playbook_meta = orb_scenario_playbook_service.routing_metadata(message)
        playbook_topic = playbook_meta.get("topic")
        if playbook_topic == "live_safeguarding_incident" or topic == "live_safeguarding_incident":
            requirements.extend([
                "- Live safeguarding cognition: use scenario playbook markdown ## headings.",
                "- Open with live safeguarding anchor; cover manager/DSL, police if immediate risk, vehicle details.",
                "- Physical intervention only if immediate risk — lawful, necessary, proportionate, least restrictive.",
                "- Do not give blanket yes/no; end with professional boundary not coaching questions.",
            ])
        if topic == "medication":
            requirements.extend(
                [
                    "- Medication cognition: registered-manager incident thinking — time-critical dose, MAR, health advice, monitoring, transparent recording, notifications, manager review, pattern/policy learning.",
                    "- Use markdown ## Immediate safety, ## Recording, ## Manager oversight, ## What to review afterwards, ## Professional boundary.",
                    "- Use [Reg 12] [Reg 13] [Recording quality] [Medication / health] inline; do not give clinical treatment advice.",
                    "- Open with: 'This needs a calm safety-first response, because medication errors are both health events and governance events.' when using a standalone opener.",
                    "- End with medication safety/MAR/handover closer — not generic coaching questions.",
                ]
            )
        if topic == "missing":
            requirements.extend(
                [
                    "- Missing cognition: welfare on return, push/pull factors, exploitation/contextual safeguarding, routes, unknown adults, return conversation, chronology and manager/Ofsted lens.",
                    "- Use markdown ## Immediate safety, ## Return conversation, ## What to record, ## Patterns to explore, ## Manager oversight and Ofsted lens, ## Next safe steps.",
                    "- Open with: 'The key is to understand both the immediate safety picture and why the young person went missing.' when using a standalone opener.",
                    "- End with welfare/return/risk/chronology/manager oversight closer — not generic coaching questions.",
                ]
            )
        if topic == "therapeutic":
            requirements.extend(
                [
                    "- Therapeutic cognition: emotional meaning, co-regulation, repair, child-centred recording — not safeguarding threshold closers unless risk is indicated.",
                    "- Use markdown ## What the behaviour may be communicating, ## How staff can respond, ## How to record it, ## What to review if this repeats.",
                    "- Open with behaviour-as-communication framing (e.g. family-time cancellation as emotional loss) — not generic five-layer opener.",
                    "- End with emotional meaning/recording/repair closer — never LADO/threshold/RI boundary unless safeguarding risk language is present.",
                ]
            )
        if topic == "recording":
            requirements.extend(
                [
                    "- Recording cognition: separate fact from interpretation; add child voice, staff response, outcome and manager review before sign-off.",
                    "- Open with: 'The first task is to separate what happened from interpretation or judgement.' when using a standalone opener.",
                    "- End with sign-off closer — not cumulative/LADO threshold boundary unless safeguarding risk language is present.",
                ]
            )
        if topic == "leadership":
            requirements.extend(
                [
                    "- Leadership cognition: evidence of impact, drift, triangulation and whether children are safer because of provider action.",
                    "- End with RI/RM governance closer — not generic coaching questions.",
                ]
            )
        if curiosity.get("topic") == "cumulative_concern":
            requirements.extend(
                [
                    "- This is cumulative safeguarding cognition: name convergence of allegations, missing episodes and restraints (same adult where given).",
                    "- Use the nine-part structure from the depth frame; weave [Reg 12], [Reg 13], [SCCIF], [LADO], [Working Together] and [Recording quality] inline with brief 'because' explanations.",
                    "- Include specific patterns, evidence lists, RM questions, RI questions, Ofsted lens, avoid-assuming, and immediate safe next steps.",
                    "- Open with: 'The concern here is the convergence, not any single incident.' when using a standalone opener.",
                    "- Do not append a generic Sources/basis list if inline anchors already ground the answer; end with cumulative safeguarding closer — not 'would you like to explore further?'",
                ]
            )
        if curiosity.get("high_attention"):
            requirements.append(
                "- End with a clear professional conclusion or next step — never generic reflective coaching questions."
            )
        if not boundary["can_use_live_records"]:
            requirements.append("- Do not claim access to live care records or OS context.")
            requirements.extend(
                [
                    "- For hypothetical or practice questions, answer with general professional guidance.",
                    "- Use the long standalone boundary ('I cannot see the actual live child record…') only once per conversation, "
                    "or when the user asks about live records; otherwise use a shorter opener such as "
                    "'Generally, I would think about this in five layers…' or begin directly with the structured answer.",
                    "- Vary openings — do not start every answer the same way.",
                ]
            )
        return requirements


shared_institutional_cognition_runtime = SharedInstitutionalCognitionRuntime()
