"""Founder/admin ORB knowledge gap audit — internal-knowledge-first QA across residential domains."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_ofsted_readiness_scoring_service import orb_ofsted_readiness_scoring_service
from services.orb_universal_answer_contract_map_service import (
    find_missing_markers,
    validate_contract_answer,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = REPO_ROOT / "reports"

ORB_KNOWLEDGE_GAP_DOMAINS: list[dict[str, Any]] = [
    {
        "domain": "Daily recording",
        "prompt_id": "daily_recording",
        "prompt": "Help me write a daily note",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["factual", "child voice", "structure"],
        "required_answer_markers": ["paste", "structure", "child"],
        "forbidden_patterns": ["invented", "as an ai"],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Incident recording",
        "prompt_id": "incident_recording",
        "prompt": "Help me write an incident report template",
        "expected_contract": "incident_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["safety", "staff", "outcome"],
        "required_answer_markers": ["incident", "safety", "structure"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Key-work sessions",
        "prompt_id": "keywork_sessions",
        "prompt": "Give me headings for a key-work session",
        "expected_contract": "keywork_session",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["child voice", "session"],
        "required_answer_markers": ["key-work", "child"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Handover",
        "prompt_id": "handover",
        "prompt": "What should I include in a handover?",
        "expected_contract": "handover",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["handover", "shift"],
        "required_answer_markers": ["handover", "shift"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Manager oversight",
        "prompt_id": "manager_oversight",
        "prompt": "What should a manager oversight note include?",
        "expected_contract": "manager_oversight_note",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["oversight", "pattern"],
        "required_answer_markers": ["manager", "oversight"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Safeguarding concern",
        "prompt_id": "safeguarding_concern",
        "prompt": "I have a safeguarding concern about a young person — what should I record?",
        "expected_contract": None,
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["safeguarding", "escalation"],
        "required_answer_markers": ["safeguard", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Missing from home",
        "prompt_id": "missing_from_home",
        "prompt": "A young person is missing from the home right now — what do I do?",
        "expected_contract": "missing_return_record",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["missing", "welfare"],
        "required_answer_markers": ["missing", "welfare"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Return after missing",
        "prompt_id": "return_after_missing",
        "prompt": "She returned from missing and smells of cannabis. What should I do on shift?",
        "expected_contract": "missing_return_record",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["return", "welfare", "missing"],
        "required_answer_markers": ["return", "welfare"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Allegation against staff / LADO",
        "prompt_id": "allegation_lado",
        "prompt": "A child says a staff member touched them inappropriately last night.",
        "expected_contract": "allegation_lado",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["lado", "do not investigate"],
        "required_answer_markers": ["do not investigate", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Abuse disclosure",
        "prompt_id": "abuse_disclosure",
        "prompt": "A young person disclosed historic sexual abuse to me tonight. What do I do?",
        "expected_contract": "abuse_disclosure",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["listen", "safeguarding"],
        "required_answer_markers": ["listen", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Suicidal ideation / self-harm",
        "prompt_id": "suicidal_self_harm",
        "prompt": "He says he is going to hurt himself tonight and has a blade.",
        "expected_contract": "suicidal_self_harm",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["immediate", "safeguarding"],
        "required_answer_markers": ["immediate", "safeguard"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Exploitation / contextual safeguarding",
        "prompt_id": "exploitation",
        "prompt": "We think a young person may be involved in county lines exploitation.",
        "expected_contract": "abuse_disclosure",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["exploitation", "safeguarding"],
        "required_answer_markers": ["exploitation", "safeguard"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Online safety",
        "prompt_id": "online_safety",
        "prompt": "A young person shared a nude image and is being blackmailed online.",
        "expected_contract": "incident_record",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["online", "safeguarding"],
        "required_answer_markers": ["online", "safeguard"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Physical intervention / restraint",
        "prompt_id": "physical_intervention",
        "prompt": "Can I physically stop the child leaving? Restraint may be needed.",
        "expected_contract": "incident_record",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["restraint", "safety"],
        "required_answer_markers": ["restraint", "safety"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Medication error",
        "prompt_id": "medication_error",
        "prompt": "We gave the wrong dose — medication error on shift.",
        "expected_contract": "incident_record",
        "expected_depth_tier": "mandatory",
        "expected_execution_policy": "openai_mandatory_safeguarding",
        "expected_internal_knowledge_markers": ["medication", "notification"],
        "required_answer_markers": ["medication", "notify"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": True,
    },
    {
        "domain": "Health appointment",
        "prompt_id": "health_appointment",
        "prompt": "Help me record a health appointment for a young person",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["health", "record"],
        "required_answer_markers": ["health", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Education concern",
        "prompt_id": "education_concern",
        "prompt": "The young person refused school again — how should I record this?",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "openai_compact",
        "expected_internal_knowledge_markers": ["education", "record"],
        "required_answer_markers": ["education", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Family time / contact",
        "prompt_id": "family_contact",
        "prompt": "Help me record family contact today — contact was difficult",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["contact", "child voice"],
        "required_answer_markers": ["contact", "child"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Complaints",
        "prompt_id": "complaints",
        "prompt": "A young person wants to make a complaint about staff — what should I record?",
        "expected_contract": "policy_practice_question",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "openai_allowed": False,
        "expected_internal_knowledge_markers": ["complaint", "child voice"],
        "required_answer_markers": ["complaint", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Child voice",
        "prompt_id": "child_voice",
        "prompt": "How do I capture the child's voice in daily recording?",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["child voice", "factual"],
        "required_answer_markers": ["child", "voice"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "GDD / communication support",
        "prompt_id": "gdd_communication",
        "prompt": "Help me create a child-friendly support plan for a young person with GDD who uses widgets",
        "expected_contract": "accessible_child_support_plan",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "openai_enhanced",
        "expected_internal_knowledge_markers": ["communication", "widgets"],
        "required_answer_markers": ["communication", "plan"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": True,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Autism / sensory support",
        "prompt_id": "autism_sensory",
        "prompt": "What should staff record about autism and sensory support on shift?",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["sensory", "support"],
        "required_answer_markers": ["sensory", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Independence / preparing for adulthood",
        "prompt_id": "independence_pfa",
        "prompt": "Help me record independence and preparing for adulthood goals",
        "expected_contract": "accessible_child_support_plan",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "openai_compact",
        "expected_internal_knowledge_markers": ["independence", "adulthood"],
        "required_answer_markers": ["independence", "goal"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Support planning",
        "prompt_id": "support_planning",
        "prompt": "Help me draft a bespoke support plan from these notes",
        "expected_contract": "accessible_child_support_plan",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "openai_enhanced",
        "expected_internal_knowledge_markers": ["support plan", "child-centred"],
        "required_answer_markers": ["support", "plan"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": True,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Risk assessment review",
        "prompt_id": "risk_assessment_review",
        "prompt": "What should a manager include in a risk assessment review?",
        "expected_contract": "manager_oversight_note",
        "expected_depth_tier": "enhanced",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["risk", "review"],
        "required_answer_markers": ["risk", "review"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Placement plan review",
        "prompt_id": "placement_plan_review",
        "prompt": "Help me prepare for a placement plan review meeting",
        "expected_contract": "manager_oversight_note",
        "expected_depth_tier": "enhanced",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["placement", "review"],
        "required_answer_markers": ["placement", "review"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Behaviour support",
        "prompt_id": "behaviour_support",
        "prompt": "Help me write a behaviour support reflection after a difficult evening",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "openai_compact",
        "expected_internal_knowledge_markers": ["behaviour", "therapeutic"],
        "required_answer_markers": ["behaviour", "support"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Restorative repair",
        "prompt_id": "restorative_repair",
        "prompt": "How should I record restorative repair after an incident?",
        "expected_contract": "incident_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["repair", "restorative"],
        "required_answer_markers": ["repair", "record"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Consequences / boundaries",
        "prompt_id": "consequences_boundaries",
        "prompt": "How do I record consequences and boundaries fairly on shift?",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["boundaries", "fair"],
        "required_answer_markers": ["boundaries", "record"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Staff supervision",
        "prompt_id": "staff_supervision",
        "prompt": "What should I bring to staff supervision as a residential worker?",
        "expected_contract": None,
        "expected_depth_tier": "standard",
        "expected_execution_policy": "openai_compact",
        "expected_internal_knowledge_markers": ["supervision", "reflection"],
        "required_answer_markers": ["supervision"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Team learning",
        "prompt_id": "team_learning",
        "prompt": "Help me capture team learning after a serious incident debrief",
        "expected_contract": "incident_record",
        "expected_depth_tier": "enhanced",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["learning", "debrief"],
        "required_answer_markers": ["learning", "team"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Reg 44",
        "prompt_id": "reg44",
        "prompt": "Give me a Reg 44 evidence checklist",
        "expected_contract": "reg44_visitor",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["reg 44", "evidence"],
        "required_answer_markers": ["reg 44", "evidence"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Reg 45",
        "prompt_id": "reg45",
        "prompt": "What should a Reg 45 manager review cover?",
        "expected_contract": "manager_oversight_note",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["reg 45", "manager"],
        "required_answer_markers": ["reg 45", "manager"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Ofsted preparation",
        "prompt_id": "ofsted_preparation",
        "prompt": "Help me prepare for an Ofsted inspection — what evidence should managers review?",
        "expected_contract": "ofsted_preparation",
        "expected_depth_tier": "enhanced",
        "expected_execution_policy": "deterministic_only",
        "expected_internal_knowledge_markers": ["ofsted", "evidence"],
        "required_answer_markers": ["ofsted", "evidence"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "SCCIF-style evidence",
        "prompt_id": "sccif_evidence",
        "prompt": "What SCCIF-style evidence should we hold for quality of care?",
        "expected_contract": "policy_practice_question",
        "expected_depth_tier": "enhanced",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["sccif", "evidence"],
        "required_answer_markers": ["sccif", "evidence"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Leadership and management",
        "prompt_id": "leadership_management",
        "prompt": "What should leadership record about management oversight this month?",
        "expected_contract": "manager_oversight_note",
        "expected_depth_tier": "enhanced",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["leadership", "oversight"],
        "required_answer_markers": ["leadership", "management"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Quality of care",
        "prompt_id": "quality_of_care",
        "prompt": "How do I evidence quality of care in daily recording?",
        "expected_contract": "daily_record",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["quality", "child-centred"],
        "required_answer_markers": ["quality", "care"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Safer recruitment / workforce",
        "prompt_id": "safer_recruitment",
        "prompt": "What should managers record about safer recruitment and workforce compliance?",
        "expected_contract": "manager_oversight_note",
        "expected_depth_tier": "standard",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["safer recruitment", "workforce"],
        "required_answer_markers": ["recruitment", "workforce"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Notifications / serious events",
        "prompt_id": "notifications_serious_events",
        "prompt": "When must we notify Ofsted about a serious event in a children's home?",
        "expected_contract": "ofsted_preparation",
        "expected_depth_tier": "enhanced",
        "expected_execution_policy": "internal_template_plus_validator",
        "expected_internal_knowledge_markers": ["notification", "ofsted"],
        "required_answer_markers": ["notify", "ofsted"],
        "forbidden_patterns": [],
        "openai_allowed": False,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
    {
        "domain": "Professional curiosity",
        "prompt_id": "professional_curiosity",
        "prompt": "How should staff show professional curiosity when something feels not quite right?",
        "expected_contract": None,
        "expected_depth_tier": "standard",
        "expected_execution_policy": "openai_compact",
        "expected_internal_knowledge_markers": ["professional curiosity", "safeguarding"],
        "required_answer_markers": ["curiosity", "record"],
        "forbidden_patterns": [],
        "openai_allowed": True,
        "embeddings_allowed": False,
        "scenario_bank_allowed": False,
    },
]


class OrbKnowledgeGapAuditService:
    """Founder/admin knowledge QA — tests internal knowledge before OpenAI reliance."""

    VERSION = "orb-knowledge-gap-audit-v2"
    DOMAINS = ORB_KNOWLEDGE_GAP_DOMAINS

    def run_audit(self) -> dict[str, Any]:
        internal_passed = 0
        internal_failed = 0
        openai_avoided = 0
        openai_required = 0
        unexpected_openai = 0
        embedding_calls_avoided = 0
        unexpected_embedding_calls = 0
        missing_knowledge_markers: list[str] = []
        gaps: list[dict[str, Any]] = []
        domain_results: list[dict[str, Any]] = []

        for item in self.DOMAINS:
            result = self._evaluate_domain(item)
            domain_results.append(result)
            if result["internal_knowledge_passed"]:
                internal_passed += 1
            else:
                internal_failed += 1
            if not item["openai_allowed"]:
                if not result["openai_would_be_called"]:
                    openai_avoided += 1
                else:
                    unexpected_openai += 1
            else:
                openai_required += 1
            if not item["embeddings_allowed"] and not result["embeddings_would_be_called"]:
                embedding_calls_avoided += 1
            elif not item["embeddings_allowed"] and result["embeddings_would_be_called"]:
                unexpected_embedding_calls += 1
            missing_knowledge_markers.extend(result.get("missing_internal_markers") or [])
            if result.get("gap"):
                gaps.append(result["gap"])

        marker_counts: dict[str, int] = {}
        for marker in missing_knowledge_markers:
            marker_counts[marker] = marker_counts.get(marker, 0) + 1
        repeated_missing = sorted(
            [{"marker": k, "count": v} for k, v in marker_counts.items() if v > 1],
            key=lambda x: -x["count"],
        )

        overall_readiness = round(
            (internal_passed / max(len(self.DOMAINS), 1)) * 100,
            1,
        )

        report = {
            "version": self.VERSION,
            "generated_at": datetime.now(UTC).isoformat(),
            "total": len(self.DOMAINS),
            "internal_knowledge_passed": internal_passed,
            "internal_knowledge_failed": internal_failed,
            "openai_avoided": openai_avoided,
            "openai_required": openai_required,
            "unexpected_openai_calls": unexpected_openai,
            "embedding_calls_avoided": embedding_calls_avoided,
            "unexpected_embedding_calls": unexpected_embedding_calls,
            "missing_knowledge_markers": sorted(set(missing_knowledge_markers)),
            "repeated_missing_markers": repeated_missing,
            "overall_readiness_score": overall_readiness,
            "gaps": gaps,
            "domain_results": domain_results,
        }
        return report

    def write_reports(self, report: dict[str, Any] | None = None) -> dict[str, str]:
        report = report or self.run_audit()
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        json_path = REPORTS_DIR / "orb_knowledge_gap_audit.json"
        md_path = REPORTS_DIR / "orb_knowledge_gap_audit.md"
        json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        md_path.write_text(self._render_markdown(report), encoding="utf-8")
        return {"json": str(json_path), "markdown": str(md_path)}

    def _evaluate_domain(self, item: dict[str, Any]) -> dict[str, Any]:
        prompt = item["prompt"]
        bundle = orb_knowledge_retrieval_service.prepare_request_bundle(prompt, mode="Ask ORB")
        brain = orb_brain_convergence_orchestrator_service.build_brain_decision(
            prompt,
            mode="Ask ORB",
            prompt_tier=bundle.get("prompt_tier"),
        )
        brain_dict = brain.to_dict()
        policy = orb_execution_policy_service.resolve(
            prompt,
            brain_convergence=brain_dict,
            retrieval_bundle=bundle,
        )

        deterministic = orb_execution_policy_service.try_deterministic_answer(
            prompt,
            policy=policy,
            brain_convergence=brain_dict,
        )
        openai_would_be_called = policy.openai_allowed and deterministic is None
        embeddings_would_be_called = (
            policy.embeddings_allowed or int(bundle.get("embedding_calls") or 0) > 0
        )
        scenario_bank_loaded = bool(
            bundle.get("expert_scenario_context")
            and (bundle.get("expert_scenario_context") or {}).get("matched")
        ) and policy.scenario_bank_allowed

        contract_ok = (
            item["expected_contract"] is None
            or policy.selected_contract == item["expected_contract"]
            or brain_dict.get("contract_family") == item["expected_contract"]
        )
        policy_ok = (
            policy.execution_policy == item["expected_execution_policy"]
            or (
                item["expected_execution_policy"] == "deterministic_only"
                and policy.execution_policy == "internal_template_plus_validator"
            )
            or (
                item["expected_execution_policy"] == "openai_compact"
                and policy.execution_policy == "internal_template_plus_validator"
            )
            or (
                item["expected_execution_policy"] == "openai_enhanced"
                and policy.execution_policy == "internal_template_plus_validator"
                and not item["openai_allowed"]
            )
        )
        openai_ok = (not openai_would_be_called) if not item["openai_allowed"] else True
        embedding_ok = (not embeddings_would_be_called) if not item["embeddings_allowed"] else True
        scenario_ok = (not scenario_bank_loaded) if not item["scenario_bank_allowed"] else True

        answer = (deterministic or {}).get("answer") or ""
        missing_internal = [
            m for m in item["expected_internal_knowledge_markers"]
            if m.lower() not in answer.lower()
            and m.lower() not in " ".join(policy.internal_knowledge_markers).lower()
        ]
        missing_answer = [
            m for m in item["required_answer_markers"]
            if m.lower() not in answer.lower()
        ] if answer else []

        ofsted_score = None
        if answer:
            ofsted_score = orb_ofsted_readiness_scoring_service.score_answer(
                answer,
                prompt=prompt,
                contract_family=policy.selected_contract,
                execution_policy=policy.execution_policy,
                openai_called=openai_would_be_called,
                deterministic_available=policy.deterministic_answer_available,
                high_risk=policy.execution_policy == "openai_mandatory_safeguarding",
            )

        internal_passed = contract_ok and policy_ok and openai_ok and embedding_ok and scenario_ok
        if deterministic and missing_answer:
            internal_passed = internal_passed and len(missing_answer) == 0
        elif item["expected_execution_policy"] in {
            "deterministic_only",
            "internal_template_plus_validator",
        } and not deterministic:
            internal_passed = False

        gap = None
        if not internal_passed:
            high_risk_domains = {
                "Safeguarding concern",
                "Missing from home",
                "Online safety",
                "Allegation against staff / LADO",
                "Abuse disclosure",
                "Suicidal ideation / self-harm",
            }
            if item["domain"] in high_risk_domains and (not contract_ok or missing_internal):
                severity = "high"
            elif not policy_ok or not contract_ok:
                severity = "medium"
            else:
                severity = "low"
            gap = {
                "domain": item["domain"],
                "gap": self._describe_gap(
                    item, policy, contract_ok, policy_ok, openai_ok, missing_internal, missing_answer
                ),
                "severity": severity,
                "recommended_internal_knowledge_addition": self._recommend_addition(item, missing_internal),
            }

        return {
            "domain": item["domain"],
            "prompt_id": item["prompt_id"],
            "selected_contract": policy.selected_contract,
            "execution_policy": policy.execution_policy,
            "expected_execution_policy": item["expected_execution_policy"],
            "openai_would_be_called": openai_would_be_called,
            "embeddings_would_be_called": embeddings_would_be_called,
            "scenario_bank_loaded": scenario_bank_loaded,
            "internal_knowledge_passed": internal_passed,
            "missing_internal_markers": missing_internal,
            "missing_answer_markers": missing_answer,
            "ofsted_readiness_score": (ofsted_score or {}).get("Ofsted-readiness"),
            "ofsted_ready": (ofsted_score or {}).get("ofsted_ready"),
            "pilot_ready": internal_passed and (ofsted_score is None or ofsted_score.get("ofsted_ready", True)),
            "gap": gap,
        }

    def _describe_gap(
        self,
        item: dict[str, Any],
        policy: Any,
        contract_ok: bool,
        policy_ok: bool,
        openai_ok: bool,
        missing_internal: list[str],
        missing_answer: list[str],
    ) -> str:
        parts: list[str] = []
        if not contract_ok:
            parts.append(
                f"Expected contract {item['expected_contract']} but got {policy.selected_contract}"
            )
        if not policy_ok:
            parts.append(
                f"Expected policy {item['expected_execution_policy']} but got {policy.execution_policy}"
            )
        if not openai_ok:
            parts.append("OpenAI would be called when internal path expected")
        if missing_internal:
            parts.append(f"Missing internal markers: {', '.join(missing_internal)}")
        if missing_answer:
            parts.append(f"Missing answer markers: {', '.join(missing_answer)}")
        return "; ".join(parts) or "Internal knowledge gap detected"

    def _recommend_addition(self, item: dict[str, Any], missing_internal: list[str]) -> str:
        if missing_internal:
            return (
                f"Add internal knowledge markers for {item['domain']}: "
                f"{', '.join(missing_internal)}"
            )
        if not item["openai_allowed"]:
            return (
                f"Add deterministic internal template/contract for {item['domain']} "
                f"so OpenAI is not required for structure-only prompts."
            )
        return f"Review internal contract coverage for {item['domain']}."

    def _render_markdown(self, report: dict[str, Any]) -> str:
        lines = [
            "# ORB Knowledge Gap Audit",
            "",
            f"Generated: {report.get('generated_at', '')}",
            f"Version: {report.get('version', '')}",
            "",
            f"## Overall readiness score: {report.get('overall_readiness_score', 0)}%",
            "",
            f"- Domains passed: {report.get('internal_knowledge_passed', 0)}/{report.get('total', 0)}",
            f"- Domains needing work: {report.get('internal_knowledge_failed', 0)}",
            f"- OpenAI avoided (deterministic domains): {report.get('openai_avoided', 0)}",
            f"- OpenAI required (generation domains): {report.get('openai_required', 0)}",
            f"- Unexpected OpenAI usage: {report.get('unexpected_openai_calls', 0)}",
            f"- Embedding calls avoided: {report.get('embedding_calls_avoided', 0)}",
            f"- Unexpected embedding calls: {report.get('unexpected_embedding_calls', 0)}",
            "",
            "## High-risk knowledge gaps",
            "",
        ]
        high_gaps = [g for g in report.get("gaps", []) if g.get("severity") == "high"]
        if high_gaps:
            for gap in high_gaps:
                lines.append(f"- **{gap['domain']}**: {gap['gap']}")
        else:
            lines.append("- None detected")

        lines.extend(["", "## Repeated missing markers", ""])
        repeated = report.get("repeated_missing_markers") or []
        if repeated:
            for item in repeated:
                lines.append(f"- `{item['marker']}` ({item['count']} domains)")
        else:
            lines.append("- None")

        lines.extend(["", "## Unexpected OpenAI usage", ""])
        unexpected = [
            r for r in report.get("domain_results", [])
            if r.get("openai_would_be_called") and r.get("expected_execution_policy") in {
                "deterministic_only",
                "internal_template_plus_validator",
            }
        ]
        if unexpected:
            for r in unexpected:
                lines.append(f"- {r['domain']}: would call OpenAI")
        else:
            lines.append("- None")

        lines.extend(["", "## Prompt bloat warnings", ""])
        bloat = [
            r for r in report.get("domain_results", [])
            if r.get("scenario_bank_loaded") and r.get("expected_execution_policy") == "deterministic_only"
        ]
        if bloat:
            for r in bloat:
                lines.append(f"- {r['domain']}: scenario bank loaded unnecessarily")
        else:
            lines.append("- None")

        lines.extend(["", "## Next internal knowledge additions", ""])
        for gap in report.get("gaps", [])[:15]:
            lines.append(f"- **{gap['domain']}** ({gap['severity']}): {gap['recommended_internal_knowledge_addition']}")

        lines.extend(["", "## Domain pilot readiness", ""])
        for r in report.get("domain_results", []):
            status = "pilot-ready" if r.get("pilot_ready") else "needs work"
            lines.append(
                f"- {r['domain']}: {status} "
                f"(policy={r.get('execution_policy')}, contract={r.get('selected_contract')})"
            )
        lines.append("")
        return "\n".join(lines)


orb_knowledge_gap_audit_service = OrbKnowledgeGapAuditService()
