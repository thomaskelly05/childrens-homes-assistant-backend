from __future__ import annotations

import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from services.care_signal_service import care_signal_service
from services.metadata_extraction_service import metadata_extraction_service
from services.regulatory_metadata_service import regulatory_metadata_service


NO_EVIDENCE_FOUND = "no evidence found"
DRAFT_NOTICE = "AI and rule-based outputs are editable drafts for human review; never auto-finalised."

MANAGER_ROLES = {
    "deputy_manager",
    "deputy manager",
    "registered_manager",
    "registered manager",
    "manager",
    "responsible_individual",
    "responsible individual",
    "ri",
    "provider",
    "provider_admin",
    "admin",
    "super_admin",
    "superadmin",
}

ROLE_METADATA: dict[str, dict[str, Any]] = {
    "rsw": {"label": "RSW", "level": "child", "can_sign_off": False, "safeguarding_sensitive": False},
    "senior_rsw": {"label": "Senior RSW", "level": "home", "can_sign_off": False, "safeguarding_sensitive": True},
    "deputy_manager": {"label": "Deputy Manager", "level": "home", "can_sign_off": True, "safeguarding_sensitive": True},
    "registered_manager": {"label": "Registered Manager", "level": "home", "can_sign_off": True, "safeguarding_sensitive": True},
    "responsible_individual": {"label": "Responsible Individual", "level": "provider", "can_sign_off": True, "safeguarding_sensitive": True},
    "provider": {"label": "Provider", "level": "provider", "can_sign_off": True, "safeguarding_sensitive": True},
    "admin": {"label": "Admin", "level": "system", "can_sign_off": True, "safeguarding_sensitive": True},
}


TEMPLATE_GROUPS: dict[str, list[str]] = {
    "child_journey": [
        "referral_assessment",
        "matching_assessment",
        "impact_risk_assessment",
        "admission_plan",
        "placement_plan",
        "child_friendly_placement_plan",
        "care_plan_summary",
        "placement_stability_plan",
        "transition_plan",
        "discharge_plan",
        "independence_pathway_plan",
    ],
    "risk_and_safeguarding": [
        "dynamic_risk_assessment",
        "individual_risk_assessment",
        "missing_from_care_protocol",
        "return_home_interview_tracker",
        "exploitation_risk_assessment",
        "online_safety_plan",
        "self_harm_safety_plan",
        "suicide_self_injury_risk_plan",
        "substance_misuse_risk_plan",
        "violence_aggression_risk_plan",
        "harmful_sexual_behaviour_risk_assessment",
        "safeguarding_concern_form",
        "lado_referral_tracker",
        "body_map",
        "incident_debrief",
        "physical_intervention_record",
        "restraint_review",
        "police_contact_log",
        "strategy_meeting_record",
    ],
    "therapeutic": [
        "behaviour_support_plan",
        "regulation_support_plan",
        "sensory_profile",
        "trauma_informed_formulation",
        "trigger_and_recovery_plan",
        "relationship_map",
        "repair_and_restorative_plan",
        "keywork_plan",
        "wishes_and_feelings_record",
        "life_story_identity_record",
        "cultural_identity_plan",
    ],
    "health": [
        "health_plan",
        "medication_profile",
        "medication_administration_record",
        "medication_error_form",
        "appointment_record",
        "camhs_therapy_contact_log",
        "sleep_tracker",
        "food_nutrition_plan",
        "menstrual_health_support_plan",
        "substance_health_support_plan",
    ],
    "education": [
        "education_plan",
        "pep_tracker",
        "attendance_tracker",
        "exclusion_suspension_record",
        "alternative_provision_plan",
        "learning_support_plan",
        "achievement_record",
    ],
    "family": [
        "family_time_plan",
        "family_contact_record",
        "contact_risk_assessment",
        "sibling_relationship_plan",
        "important_people_map",
        "contact_review",
    ],
    "staff_leadership": [
        "staff_supervision_template",
        "probation_review",
        "competency_assessment",
        "induction_checklist",
        "training_matrix",
        "safer_recruitment_checklist",
        "shift_handover",
        "team_meeting_minutes",
        "management_monitoring_report",
        "regulation_45_review",
        "regulation_44_action_plan",
        "ri_oversight_visit_record",
        "provider_quality_assurance_report",
        "home_development_plan",
    ],
}

COMMON_FIELD_SETS: dict[str, list[dict[str, Any]]] = {
    "standard": [
        {"field_id": "child_voice", "label": "Child voice and lived experience", "required": True},
        {"field_id": "known_evidence", "label": "Known source evidence", "required": True},
        {"field_id": "risk_and_safety", "label": "Risk, safeguarding and safety", "required": True},
        {"field_id": "relational_context", "label": "Relationships and trusted adults", "required": False},
        {"field_id": "actions_review", "label": "Actions, review and oversight", "required": True},
        {"field_id": "manager_signoff", "label": "Manager sign-off", "required": True},
    ],
    "staff": [
        {"field_id": "reflective_practice", "label": "Reflective practice", "required": True},
        {"field_id": "wellbeing_support", "label": "Wellbeing, support and accountability", "required": True},
        {"field_id": "evidence_reviewed", "label": "Evidence reviewed", "required": True},
        {"field_id": "manager_signoff", "label": "Manager sign-off", "required": True},
    ],
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def humanise(value: str) -> str:
    return value.replace("_", " ").title()


def actor_id(current_user: dict[str, Any] | None) -> Any:
    current_user = current_user or {}
    return current_user.get("id") or current_user.get("user_id") or current_user.get("sub")


def normalise_role(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_")


def evidence_ref(record: dict[str, Any], *, reason: str | None = None) -> dict[str, Any]:
    return {
        "source_table": record.get("source_table") or record.get("record_type") or record.get("type") or "provided_records",
        "source_id": record.get("source_id") or record.get("id") or record.get("record_id"),
        "title": record.get("title") or record.get("summary") or "Evidence item",
        "reason": reason or "evidence found",
    }


def text_from_record(record: dict[str, Any]) -> str:
    parts: list[str] = []
    for value in record.values():
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, (list, tuple)):
            parts.extend(str(item) for item in value if isinstance(item, str))
    return " ".join(parts)


def record_matches(record: dict[str, Any], terms: tuple[str, ...]) -> bool:
    text = text_from_record(record).lower()
    return any(term in text for term in terms)


def matching_records(records: list[dict[str, Any]], terms: tuple[str, ...]) -> list[dict[str, Any]]:
    return [record for record in records if record_matches(record, terms)]


class DocumentTemplateRegistry:
    """Canonical Documents OS registry for editable evidence-linked templates."""

    def list_templates(self, *, category: str | None = None) -> list[dict[str, Any]]:
        templates = [self._template(category_name, template_id) for category_name, ids in TEMPLATE_GROUPS.items() for template_id in ids]
        if category:
            templates = [item for item in templates if item["category"] == category]
        return templates

    def get_template(self, template_id: str) -> dict[str, Any]:
        for template in self.list_templates():
            if template["template_id"] == template_id:
                return template
        raise KeyError(f"Unknown document template: {template_id}")

    def validate_uniqueness(self) -> dict[str, Any]:
        ids = [template["template_id"] for template in self.list_templates()]
        duplicates = sorted([item for item, count in Counter(ids).items() if count > 1])
        return {"ok": not duplicates, "template_count": len(ids), "duplicate_template_ids": duplicates}

    def role_metadata(self) -> dict[str, dict[str, Any]]:
        return ROLE_METADATA

    def blank_document(self, template_id: str, *, current_user: dict[str, Any] | None = None, context: dict[str, Any] | None = None) -> dict[str, Any]:
        template = self.get_template(template_id)
        context = context or {}
        return {
            "document_id": str(uuid4()),
            "template_id": template_id,
            "title": template["title"],
            "status": "draft",
            "editable": True,
            "draft_only": True,
            "auto_finalised": False,
            "signoff_required": True,
            "fields": {field["field_id"]: "" for field in template["fields"]},
            "links": [],
            "created_by": actor_id(current_user),
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "metadata": {"context": context, "safety_notice": DRAFT_NOTICE, **template["metadata"]},
        }

    def _template(self, category: str, template_id: str) -> dict[str, Any]:
        staff_scope = category == "staff_leadership"
        safeguarding = category == "risk_and_safeguarding" or any(term in template_id for term in ("risk", "safeguarding", "missing", "police", "restraint"))
        fields = COMMON_FIELD_SETS["staff" if staff_scope else "standard"]
        care = care_signal_service.extract(record_type="document_template", record={"title": humanise(template_id), "safeguarding_concern": safeguarding})
        regulatory = regulatory_metadata_service.map_metadata(record_type="document", care=care)
        return {
            "template_id": template_id,
            "title": humanise(template_id),
            "category": category,
            "scope": "staff" if staff_scope else "child",
            "supports_digital_form": True,
            "supports_upload_extraction": True,
            "editable": True,
            "manager_signoff_required": True,
            "human_review_required": True,
            "ai_outputs_draft_only": True,
            "fields": [dict(field) for field in fields],
            "therapeutic_language_guidance": [
                "Use therapeutic, non-blaming language.",
                "Separate observed evidence from professional reflection.",
                "Record child voice and relational context wherever it is known.",
                "If evidence is absent, write no evidence found.",
            ],
            "metadata": {
                "quality_standards": regulatory.quality_standard_ids,
                "sccif": regulatory.sccif_area_ids,
                "regulations": regulatory.children_home_regulation_ids,
                "provider_oversight": staff_scope or safeguarding or category in {"staff_leadership", "child_journey"},
                "safeguarding_sensitive": safeguarding,
            },
        }


class DocumentExtractionService:
    """Deterministic first upload extraction into editable draft form fields."""

    DATE_RE = re.compile(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b")
    HEADING_RE = re.compile(r"^\s*([A-Za-z][A-Za-z \-/&]{2,60})\s*[:\-]\s*(.+)$")
    SYNONYMS = {
        "child_voice": ("child said", "young person said", "wishes", "feelings", "voice", "asked", "told staff"),
        "known_evidence": ("evidence", "source", "recorded", "observed", "reported", "chronology"),
        "risk_and_safety": ("risk", "safeguarding", "missing", "harm", "police", "restraint", "unsafe", "exploitation"),
        "relational_context": ("trusted adult", "relationship", "family", "staff", "repair", "co-regulation"),
        "actions_review": ("action", "review", "follow up", "manager", "due", "next steps", "recommend"),
        "manager_signoff": ("signed", "sign-off", "manager", "approved", "reviewed by"),
    }

    def extract(
        self,
        *,
        template_id: str,
        source_text: str,
        current_user: dict[str, Any] | None = None,
        upload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        template = document_template_registry.get_template(template_id)
        fields = {field["field_id"]: "" for field in template["fields"]}
        raw = str(source_text or "")
        heading_matches = self._heading_matches(raw)
        for field in fields:
            fields[field] = heading_matches.get(field) or self._synonym_match(raw, field)
        dates = self.DATE_RE.findall(raw)
        care = care_signal_service.extract(record_type=template_id, record={"document_text": raw}, text=raw)
        metadata = metadata_extraction_service.extract_metadata(
            record_type="document",
            record={"document_text": raw, "template_id": template_id, "created_by": actor_id(current_user)},
            current_user=current_user or {},
        )
        populated = sum(1 for value in fields.values() if value.strip())
        confidence = min(0.96, 0.28 + populated / max(len(fields), 1) * 0.55 + min(len(dates), 3) * 0.04)
        ai_enabled = os.getenv("AI_EXTERNAL_PROCESSING_ENABLED", "").lower() in {"1", "true", "yes", "on"}
        return {
            "ok": True,
            "template_id": template_id,
            "editable_draft": True,
            "draft_only": True,
            "auto_finalised": False,
            "requires_human_review": True,
            "requires_manager_signoff": True,
            "extraction_method": "deterministic_rules" if not ai_enabled else "deterministic_rules_ai_available_but_not_auto_finalised",
            "confidence_score": round(confidence, 2),
            "fields": fields,
            "dates": dates,
            "signals": care.detected_signals,
            "metadata": metadata.model_dump(mode="json"),
            "upload": upload or {},
            "review_notes": self._review_notes(fields),
            "safety_notice": DRAFT_NOTICE,
        }

    def _heading_matches(self, text: str) -> dict[str, str]:
        found: dict[str, str] = {}
        for line in text.splitlines():
            match = self.HEADING_RE.match(line)
            if not match:
                continue
            heading = match.group(1).lower()
            value = match.group(2).strip()
            for field, synonyms in self.SYNONYMS.items():
                if field.replace("_", " ") in heading or any(term in heading for term in synonyms):
                    found[field] = value
        return found

    def _synonym_match(self, text: str, field: str) -> str:
        sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
        terms = self.SYNONYMS.get(field, ())
        matches = [sentence.strip() for sentence in sentences if any(term in sentence.lower() for term in terms)]
        return " ".join(matches[:3])

    def _review_notes(self, fields: dict[str, str]) -> list[str]:
        notes = ["Manager must review extraction before sign-off."]
        for field, value in fields.items():
            if not value.strip():
                notes.append(f"{field}: {NO_EVIDENCE_FOUND}")
        return notes


class DocumentSignoffService:
    STATUSES = [
        "draft",
        "submitted_for_review",
        "returned_for_changes",
        "deputy_reviewed",
        "manager_signed_off",
        "ri_review_required",
        "ri_reviewed",
        "provider_review_required",
        "provider_reviewed",
        "archived",
    ]

    TRANSITIONS = {
        "draft": {"submitted_for_review", "archived"},
        "submitted_for_review": {"returned_for_changes", "deputy_reviewed", "manager_signed_off", "ri_review_required"},
        "returned_for_changes": {"draft", "submitted_for_review"},
        "deputy_reviewed": {"manager_signed_off", "returned_for_changes", "ri_review_required"},
        "manager_signed_off": {"ri_review_required", "provider_review_required", "archived"},
        "ri_review_required": {"ri_reviewed", "returned_for_changes"},
        "ri_reviewed": {"provider_review_required", "archived"},
        "provider_review_required": {"provider_reviewed", "returned_for_changes"},
        "provider_reviewed": {"archived"},
        "archived": set(),
    }

    def transition(
        self,
        *,
        document: dict[str, Any],
        target_status: str,
        current_user: dict[str, Any],
        comments: str | None = None,
        evidence_reviewed: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        current = str(document.get("status") or "draft")
        if target_status not in self.STATUSES:
            raise HTTPException(status_code=400, detail="Unsupported sign-off status.")
        if target_status not in self.TRANSITIONS.get(current, set()) and target_status != current:
            raise HTTPException(status_code=400, detail=f"Cannot move document from {current} to {target_status}.")
        if target_status in {"deputy_reviewed", "manager_signed_off", "ri_reviewed", "provider_reviewed"} and normalise_role(current_user.get("role")) not in MANAGER_ROLES:
            raise HTTPException(status_code=403, detail="Manager or provider oversight role required for sign-off.")
        event = {
            "event_id": str(uuid4()),
            "from_status": current,
            "to_status": target_status,
            "actor": actor_id(current_user),
            "role": current_user.get("role"),
            "timestamp": utc_now(),
            "comments": comments or "",
            "evidence_reviewed": evidence_reviewed or [],
            "escalation_history": document.get("escalation_history") or [],
            "human_reviewed": True,
        }
        history = [*(document.get("signoff_history") or []), event]
        return {"status": target_status, "signoff_history": history, "event": event, "auto_signed_off": False}


class DocumentDecisionAccountabilityService:
    def record_decision(
        self,
        *,
        suggestion: dict[str, Any],
        decision: str,
        current_user: dict[str, Any],
        rationale: str,
        evidence: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return {
            "decision_id": str(uuid4()),
            "ai_suggestion": suggestion,
            "evidence_triggers": evidence or [],
            "confidence": suggestion.get("confidence_score") or suggestion.get("confidence") or 0,
            "decision": decision,
            "rationale": rationale,
            "approved_by": actor_id(current_user) if decision == "approved" else None,
            "rejected_by": actor_id(current_user) if decision == "rejected" else None,
            "final_outcome": "editable_draft_updated" if decision == "approved" else "no_record_change",
            "draft_only": True,
            "auto_finalised": False,
            "created_at": utc_now(),
        }


class ForensicAuditService:
    def event(self, *, action: str, actor: dict[str, Any] | None = None, resource: dict[str, Any] | None = None, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        return {
            "audit_event_id": str(uuid4()),
            "action": action,
            "actor": actor_id(actor),
            "actor_role": (actor or {}).get("role"),
            "resource_type": (resource or {}).get("source_table") or (resource or {}).get("type"),
            "resource_id": (resource or {}).get("source_id") or (resource or {}).get("id"),
            "created_at": utc_now(),
            "metadata": metadata or {},
            "legal_defensibility": {"editable_history_required": True, "source_evidence_required": True},
        }


class PermissionsEngineService:
    def can_access(self, *, current_user: dict[str, Any], resource: dict[str, Any], action: str = "read") -> dict[str, Any]:
        role = normalise_role(current_user.get("role"))
        meta = ROLE_METADATA.get(role, ROLE_METADATA.get(role.replace("_", ""), {}))
        sensitive = bool(resource.get("safeguarding_sensitive") or resource.get("metadata", {}).get("safeguarding_sensitive"))
        allowed = bool(meta) and (not sensitive or meta.get("safeguarding_sensitive"))
        if action in {"signoff", "provider_review"}:
            allowed = allowed and bool(meta.get("can_sign_off"))
        scope_checks = {
            "provider_id": current_user.get("provider_id") in {None, resource.get("provider_id"), str(resource.get("provider_id"))},
            "home_id": resource.get("home_id") in {None, current_user.get("home_id"), str(current_user.get("home_id"))},
            "child_id": action != "read" or resource.get("child_id") is not None or meta.get("level") in {"provider", "system"},
        }
        allowed = allowed and all(scope_checks.values())
        return {"allowed": allowed, "role": role, "scope_checks": scope_checks, "auditable": True}


class EvidenceLinkingMixin:
    LINK_TERMS = {
        "chronology": ("chronology", "timeline", "daily note", "daily_note", "incident", "missing"),
        "safeguarding": ("safeguarding", "risk", "harm", "missing", "exploitation", "police", "lado"),
        "risks": ("risk", "unsafe", "restraint", "self-harm", "substance"),
        "plans": ("plan", "placement", "care plan", "risk assessment", "health plan"),
        "tasks": ("action", "follow up", "due", "review"),
        "reg44": ("reg 44", "independent visitor"),
        "reg45": ("reg 45", "quality of care"),
        "inspections": ("ofsted", "inspection", "sccif"),
        "provider_qa": ("provider", "qa", "quality assurance"),
        "staff_supervision": ("supervision", "reflective practice"),
        "emotional_wellbeing": ("mood", "sleep", "distressed", "settled", "wellbeing"),
        "child_journey": ("admission", "transition", "discharge", "lived experience"),
        "placement_stability": ("placement", "stability", "notice", "breakdown", "strain"),
        "relational_intelligence": ("trusted adult", "relationship", "repair", "attachment"),
        "workforce_intelligence": ("staff", "agency", "burnout", "punitive", "supervision"),
    }

    def build_links(self, *, document: dict[str, Any], records: list[dict[str, Any]]) -> dict[str, Any]:
        links: dict[str, list[dict[str, Any]]] = {}
        gaps: list[dict[str, str]] = []
        for link_type, terms in self.LINK_TERMS.items():
            matches = matching_records(records, terms)
            links[link_type] = [evidence_ref(record, reason=f"evidence found for {link_type}") for record in matches[:8]]
            if not matches:
                gaps.append({"link_type": link_type, "message": NO_EVIDENCE_FOUND})
        return {
            "document_id": document.get("document_id") or document.get("id"),
            "links": links,
            "evidence_gaps": gaps,
            "never_invent_evidence": True,
        }


class AnnexAGeneratorService(EvidenceLinkingMixin):
    SECTIONS = {
        "admissions_discharges": ("admission", "discharge", "transition"),
        "incidents": ("incident", "damage", "assault"),
        "safeguarding": ("safeguarding", "exploitation", "lado", "mash"),
        "restraints": ("restraint", "physical intervention"),
        "missing": ("missing", "abscond", "returned"),
        "complaints": ("complaint", "concern"),
        "medication": ("medication", "medicine", "mar"),
        "staffing": ("staff", "rota", "agency", "training", "supervision"),
        "reg44": ("reg 44", "independent visitor"),
        "reg45": ("reg 45", "quality of care"),
        "ofsted_notifications": ("ofsted", "notification"),
        "provider_learning": ("provider", "learning", "quality assurance"),
        "evidence_gaps": ("gap", "missing evidence", "not recorded"),
        "leadership_commentary": ("manager", "leadership", "oversight"),
    }

    def generate(self, *, records: list[dict[str, Any]], current_user: dict[str, Any] | None = None) -> dict[str, Any]:
        sections = []
        for key, terms in self.SECTIONS.items():
            matches = matching_records(records, terms)
            sections.append(
                {
                    "section_id": key,
                    "title": humanise(key),
                    "editable": True,
                    "summary": self._summary(matches),
                    "evidence_links": [evidence_ref(record, reason=f"Annex A {key}") for record in matches[:12]],
                }
            )
        return {
            "annex_a_id": str(uuid4()),
            "status": "draft",
            "editable": True,
            "draft_only": True,
            "auto_finalised": False,
            "created_by": actor_id(current_user),
            "created_at": utc_now(),
            "sections": sections,
            "safety_notice": DRAFT_NOTICE,
        }

    def _summary(self, matches: list[dict[str, Any]]) -> str:
        if not matches:
            return NO_EVIDENCE_FOUND
        return f"{len(matches)} evidence item(s) found for manager review."


class SafeguardingFlowchartService:
    STEPS = [
        {"step_id": "immediate_safety", "title": "Immediate safety", "requires_manager_review": True},
        {"step_id": "threshold_decision", "title": "Threshold decision", "requires_manager_review": True},
        {"step_id": "external_referral", "title": "Police, LADO or MASH referral", "requires_manager_review": True},
        {"step_id": "record_updates", "title": "Body map, chronology, risk and plan updates", "requires_manager_review": True},
        {"step_id": "oversight", "title": "RI/provider visibility where threshold met", "requires_manager_review": True},
    ]

    def start(self, *, concern: dict[str, Any], current_user: dict[str, Any] | None = None) -> dict[str, Any]:
        text = text_from_record(concern).lower()
        threshold = "high" if any(term in text for term in ("immediate", "harm", "police", "lado", "exploitation", "missing")) else "review"
        return {
            "flow_instance_id": str(uuid4()),
            "status": "draft",
            "threshold": threshold,
            "steps": self.STEPS,
            "next_actions": self.actions_for_threshold(threshold),
            "created_by": actor_id(current_user),
            "human_review_required": True,
            "auto_referred": False,
        }

    def actions_for_threshold(self, threshold: str) -> list[dict[str, Any]]:
        if threshold == "high":
            return [
                {"action": "manager_review_now", "draft_only": True},
                {"action": "consider_external_referral", "draft_only": True},
                {"action": "update_chronology_risk_and_plan", "draft_only": True},
            ]
        return [{"action": "manager_threshold_review", "draft_only": True}]


class PatternIntelligenceService:
    PATTERNS = {
        "repeated_missing": ("missing", "abscond", "returned"),
        "exploitation_themes": ("exploitation", "unknown adult", "hotel", "station", "county lines"),
        "restraint_escalation": ("restraint", "physical intervention"),
        "emotional_deterioration": ("distressed", "low mood", "self-harm", "not sleeping", "withdrawn"),
        "police_involvement": ("police", "arrest", "crime reference"),
        "education_disruption": ("school refusal", "excluded", "attendance", "suspension"),
        "placement_strain": ("placement strain", "notice", "breakdown", "discharge risk"),
        "positive_progress": ("achievement", "settled", "proud", "progress", "enjoyed"),
    }

    def analyse(self, *, records: list[dict[str, Any]], young_person_id: Any | None = None) -> dict[str, Any]:
        alerts = []
        for key, terms in self.PATTERNS.items():
            matches = matching_records(records, terms)
            if len(matches) >= (2 if key != "positive_progress" else 1):
                alerts.append(
                    {
                        "pattern": key,
                        "severity": "oversight_prompt" if key == "positive_progress" else "review_prompt",
                        "summary": f"{len(matches)} linked evidence item(s) found.",
                        "evidence_links": [evidence_ref(record, reason=key) for record in matches[:8]],
                    }
                )
        return {"young_person_id": young_person_id, "alerts": alerts, "no_evidence": NO_EVIDENCE_FOUND if not alerts else None}


class ContextualSafeguardingService:
    TERMS = ("peer", "hotel", "station", "unknown adult", "online", "phone", "county lines", "location")

    def map_context(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        nodes = []
        for term in self.TERMS:
            matches = matching_records(records, (term,))
            if matches:
                nodes.append({"type": term, "evidence_links": [evidence_ref(record, reason=f"contextual safeguarding: {term}") for record in matches[:6]]})
        return {"nodes": nodes, "summary": f"{len(nodes)} contextual safeguarding node(s) found." if nodes else NO_EVIDENCE_FOUND, "draft_only": True}


class TimelineService:
    TERMS = ("mood", "regulation", "sleep", "trigger", "recovery", "trusted adult", "protective factor")

    def build(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        entries = []
        for record in records:
            if record_matches(record, self.TERMS):
                entries.append({"date": record.get("date") or record.get("created_at"), "summary": record.get("summary") or record.get("title") or text_from_record(record)[:120], "evidence": evidence_ref(record)})
        return {"entries": entries, "summary": f"{len(entries)} wellbeing entry(ies) found." if entries else NO_EVIDENCE_FOUND}


class WorkforceCultureIntelligenceService:
    PUNITIVE = ("refused", "attention seeking", "manipulative", "naughty", "kicked off", "consequence")

    def analyse(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        flags = []
        for record in records:
            text = text_from_record(record).lower()
            found = [term for term in self.PUNITIVE if term in text]
            if found:
                flags.append({"flag": "punitive_wording_review", "terms": found, "evidence": evidence_ref(record), "guidance": "Use curious, therapeutic language and describe observed behaviour."})
        supervision_gaps = matching_records(records, ("supervision overdue", "missed supervision", "agency dependency", "burnout"))
        flags.extend({"flag": "workforce_follow_up", "evidence": evidence_ref(record)} for record in supervision_gaps)
        return {"flags": flags, "summary": f"{len(flags)} workforce culture prompt(s)." if flags else NO_EVIDENCE_FOUND}


class RelationalIntelligenceService:
    TERMS = ("attachment", "trusted adult", "rupture", "repair", "shame", "survival behaviour", "consistency", "relationship")

    def analyse(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        events = []
        for record in records:
            if record_matches(record, self.TERMS):
                events.append(
                    {
                        "event_id": str(uuid4()),
                        "summary": record.get("summary") or record.get("title") or "Relational observation",
                        "evidence": evidence_ref(record, reason="relational intelligence"),
                        "draft_only": True,
                    }
                )
        return {"events": events, "summary": f"{len(events)} relational event(s) found." if events else NO_EVIDENCE_FOUND}


class NotificationEscalationService:
    ESCALATION_TERMS = ("safeguarding", "overdue", "reg 44", "medication error", "staffing", "missing", "restraint")

    def build(self, *, records: list[dict[str, Any]], current_user: dict[str, Any] | None = None) -> dict[str, Any]:
        notifications = []
        escalations = []
        for record in records:
            if record_matches(record, self.ESCALATION_TERMS):
                item = {
                    "notification_id": str(uuid4()),
                    "title": record.get("title") or record.get("summary") or "Review required",
                    "evidence": evidence_ref(record, reason="notification escalation"),
                    "status": "draft",
                    "created_by": actor_id(current_user),
                }
                notifications.append(item)
                if record_matches(record, ("safeguarding", "overdue", "missing", "medication error")):
                    escalations.append({**item, "escalation_required": True, "human_review_required": True})
        return {"notifications": notifications, "escalations": escalations, "auto_escalated": False}


class InspectionReadinessService:
    AREAS = ("annex a", "safeguarding", "complaint", "staffing", "reg 44", "reg 45", "ri oversight", "action plan", "evidence gap")

    def snapshot(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        packs = {}
        for area in self.AREAS:
            matches = matching_records(records, (area,))
            packs[area.replace(" ", "_")] = {
                "summary": f"{len(matches)} evidence item(s) found." if matches else NO_EVIDENCE_FOUND,
                "evidence_links": [evidence_ref(record, reason=f"inspection readiness: {area}") for record in matches[:10]],
            }
        return {"status": "draft", "editable": True, "packs": packs, "known_weaknesses": packs["evidence_gap"], "human_review_required": True}


class ChildJourneySynthesisService:
    AREAS = ("lived experience", "emotional", "relationship", "identity", "education", "safeguarding", "progress")

    def synthesise(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        sections = []
        for area in self.AREAS:
            matches = matching_records(records, (area, area.replace("relationship", "trusted adult")))
            sections.append({"area": area, "summary": self._draft_summary(matches), "evidence_links": [evidence_ref(record, reason=f"child journey: {area}") for record in matches[:8]], "editable": True})
        return {"status": "draft", "draft_only": True, "auto_finalised": False, "sections": sections}

    def _draft_summary(self, matches: list[dict[str, Any]]) -> str:
        return f"{len(matches)} evidence item(s) found for reflective manager review." if matches else NO_EVIDENCE_FOUND


class PlacementStabilityService:
    TERMS = ("incident", "missing", "wellbeing", "relationship", "education", "complaint", "safeguarding")

    def indicators(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        indicators = []
        for term in self.TERMS:
            matches = matching_records(records, (term,))
            if matches:
                indicators.append({"indicator": term, "count": len(matches), "evidence_links": [evidence_ref(record, reason=f"placement stability: {term}") for record in matches[:6]]})
        protective = matching_records(records, ("trusted adult", "settled", "achievement", "repair", "routine"))
        return {"indicators": indicators, "protective_factors": [evidence_ref(record, reason="protective factor") for record in protective[:8]], "early_intervention_prompts": self._prompts(indicators)}

    def _prompts(self, indicators: list[dict[str, Any]]) -> list[str]:
        if len(indicators) >= 3:
            return ["Review placement stability with the manager and update plans using linked evidence."]
        return ["Continue relational monitoring and record protective factors."] if indicators else [NO_EVIDENCE_FOUND]


class ChildFriendlyOutputService:
    def generate(self, *, records: list[dict[str, Any]], output_type: str = "my_plan") -> dict[str, Any]:
        strengths = matching_records(records, ("proud", "achievement", "enjoyed", "safe", "trusted"))
        goals = matching_records(records, ("goal", "wish", "would like", "next"))
        return {
            "output_type": output_type,
            "status": "draft",
            "editable": True,
            "child_friendly": True,
            "content": {
                "about_me": self._plain(strengths, "What people know helps me"),
                "my_safe_people": self._plain(matching_records(records, ("trusted adult", "safe people", "staff")), "People who help me feel safe"),
                "goals": self._plain(goals, "Things I am working towards"),
                "achievements": self._plain(strengths, "Things I have done well"),
            },
            "evidence_links": [evidence_ref(record, reason="child-friendly draft") for record in [*strengths, *goals][:8]],
            "human_review_required": True,
        }

    def _plain(self, matches: list[dict[str, Any]], fallback: str) -> str:
        return fallback if matches else NO_EVIDENCE_FOUND


class ProviderStructureService:
    def describe(self, *, provider: dict[str, Any], homes: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        return {"provider": provider, "homes": homes or [], "oversight_levels": ["provider", "home", "child", "document"], "auditable": True}


class PolicyIntelligenceService:
    def review(self, *, policies: list[dict[str, Any]], records: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        records = records or []
        due = [policy for policy in policies if record_matches(policy, ("review due", "expired", "breach"))]
        breaches = matching_records(records, ("policy breach", "not followed", "procedure not followed"))
        return {"review_due": due, "possible_breaches": [evidence_ref(record, reason="policy breach detection") for record in breaches], "summary": NO_EVIDENCE_FOUND if not due and not breaches else "Policy review prompts found."}


class QualityAssuranceService:
    def audit(self, *, records: list[dict[str, Any]], audit_type: str = "file") -> dict[str, Any]:
        gaps = matching_records(records, ("missing evidence", "not signed", "overdue", "gap"))
        strengths = matching_records(records, ("good practice", "positive", "effective"))
        return {"audit_type": audit_type, "status": "draft", "gaps": [evidence_ref(record, reason="QA gap") for record in gaps], "strengths": [evidence_ref(record, reason="QA strength") for record in strengths], "action_plan": self._actions(gaps)}

    def _actions(self, gaps: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [{"title": "Review QA evidence gap", "draft_only": True, "evidence": evidence_ref(record)} for record in gaps] or [{"title": NO_EVIDENCE_FOUND, "draft_only": True}]


class SmartSearchService:
    def search(self, *, query: str, records: list[dict[str, Any]]) -> dict[str, Any]:
        terms = tuple(term for term in re.findall(r"[a-zA-Z][a-zA-Z-]{2,}", query.lower()) if term not in {"show", "linked", "last", "months"})
        results = matching_records(records, terms) if terms else []
        return {"query": query, "results": [evidence_ref(record, reason=f"search: {query}") for record in results], "summary": f"{len(results)} result(s) found." if results else NO_EVIDENCE_FOUND}


class ChronologyVisualisationService:
    CATEGORIES = ("safeguarding", "missing", "incident", "wellbeing", "achievement", "restraint", "education", "health")

    def timeline(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        events = []
        for record in records:
            category = next((item for item in self.CATEGORIES if record_matches(record, (item,))), "other")
            events.append({"date": record.get("date") or record.get("created_at"), "category": category, "title": record.get("title") or record.get("summary") or "Chronology item", "evidence": evidence_ref(record)})
        return {"events": sorted(events, key=lambda item: str(item.get("date") or "")), "categories": list(self.CATEGORIES)}


class ExternalProfessionalCollaborationService:
    PROFESSIONALS = ("social worker", "camhs", "school", "police", "therapist", "iro")

    def links(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        links = defaultdict(list)
        for professional in self.PROFESSIONALS:
            for record in matching_records(records, (professional,)):
                links[professional].append(evidence_ref(record, reason=f"external collaboration: {professional}"))
        return {"links": dict(links), "summary": NO_EVIDENCE_FOUND if not links else "External professional evidence found."}


class MeetingsReviewsService:
    TYPES = ("lac review", "strategy meeting", "safeguarding meeting", "professionals meeting", "supervision", "team meeting")

    def summarise(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        meetings = []
        for meeting_type in self.TYPES:
            matches = matching_records(records, (meeting_type,))
            meetings.extend({"meeting_type": meeting_type, "evidence": evidence_ref(record, reason=meeting_type)} for record in matches)
        return {"meetings": meetings, "summary": f"{len(meetings)} meeting/review record(s)." if meetings else NO_EVIDENCE_FOUND}


class OfflineResilienceService:
    def draft_envelope(self, *, payload: dict[str, Any], current_user: dict[str, Any] | None = None) -> dict[str, Any]:
        return {"offline_draft_id": str(uuid4()), "payload": payload, "created_by": actor_id(current_user), "encrypted_local_cache_required": True, "conflict_resolution": "human_review_required", "status": "draft"}


class OutcomesAnalyticsService:
    OUTCOMES = ("emotional wellbeing", "education", "safeguarding", "restraint", "missing", "placement stability")

    def analyse(self, *, records: list[dict[str, Any]]) -> dict[str, Any]:
        trends = []
        for outcome in self.OUTCOMES:
            matches = matching_records(records, tuple(outcome.split()))
            trends.append({"outcome": outcome, "evidence_count": len(matches), "evidence_links": [evidence_ref(record, reason=f"outcome: {outcome}") for record in matches[:6]]})
        return {"trends": trends, "summary": "Outcomes analytics draft for provider and manager review."}


document_template_registry = DocumentTemplateRegistry()
document_extraction_service = DocumentExtractionService()
document_signoff_service = DocumentSignoffService()
decision_accountability_service = DocumentDecisionAccountabilityService()
forensic_audit_service = ForensicAuditService()
permissions_engine_service = PermissionsEngineService()
annex_a_generator_service = AnnexAGeneratorService()
safeguarding_flowchart_service = SafeguardingFlowchartService()
chronology_intelligence_service = PatternIntelligenceService()
contextual_safeguarding_service = ContextualSafeguardingService()
emotional_wellbeing_timeline_service = TimelineService()
workforce_culture_intelligence_service = WorkforceCultureIntelligenceService()
relational_intelligence_service = RelationalIntelligenceService()
notification_escalation_service = NotificationEscalationService()
inspection_readiness_service = InspectionReadinessService()
child_journey_synthesis_service = ChildJourneySynthesisService()
placement_stability_service = PlacementStabilityService()
child_friendly_output_service = ChildFriendlyOutputService()
provider_structure_service = ProviderStructureService()
policy_intelligence_service = PolicyIntelligenceService()
quality_assurance_service = QualityAssuranceService()
smart_search_service = SmartSearchService()
chronology_visualisation_service = ChronologyVisualisationService()
external_professional_collaboration_service = ExternalProfessionalCollaborationService()
meetings_reviews_service = MeetingsReviewsService()
offline_resilience_service = OfflineResilienceService()
outcomes_analytics_service = OutcomesAnalyticsService()
