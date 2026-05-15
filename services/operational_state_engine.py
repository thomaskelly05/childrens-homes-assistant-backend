from __future__ import annotations

from typing import Any

from schemas.operational_state import OperationalStateAssessment, OperationalStateDefinition


STATE_IDS = [
    "pre_shift",
    "active_shift",
    "daily_recording",
    "medication_round",
    "incident_response",
    "post_incident_recovery",
    "missing_episode",
    "return_from_missing",
    "safeguarding_review",
    "keywork_direct_work",
    "family_contact_recovery",
    "education_concern",
    "emotional_dysregulation",
    "handover",
    "manager_qa",
    "reg44_follow_up",
    "reg45_review",
    "inspection_preparation",
    "crisis_stabilisation",
    "document_review",
    "risk_assessment_review",
]


class OperationalStateEngine:
    """Determines the current operating phase and returns safe, review-only prompts."""

    def definitions(self) -> list[OperationalStateDefinition]:
        return [self.definition(state_id) for state_id in STATE_IDS]

    def definition(self, state_id: str) -> OperationalStateDefinition:
        key = state_id.replace("-", "_")
        builders = {
            "missing_episode": self._missing_episode,
            "return_from_missing": self._return_from_missing,
            "incident_response": self._incident_response,
            "post_incident_recovery": self._post_incident_recovery,
            "safeguarding_review": self._safeguarding_review,
            "inspection_preparation": self._inspection_preparation,
            "reg44_follow_up": self._reg44_follow_up,
            "reg45_review": self._reg45_review,
            "manager_qa": self._manager_qa,
            "risk_assessment_review": self._risk_review,
            "document_review": self._document_review,
            "emotional_dysregulation": self._emotional_dysregulation,
            "education_concern": self._education_concern,
            "family_contact_recovery": self._family_contact_recovery,
            "handover": self._handover,
            "medication_round": self._medication_round,
            "keywork_direct_work": self._keywork,
        }
        return builders.get(key, self._default)(key)

    def assess(
        self,
        *,
        event_type: str | None = None,
        record: dict[str, Any] | None = None,
        records: list[dict[str, Any]] | None = None,
        current_state: str | None = None,
    ) -> OperationalStateAssessment:
        record = record or {}
        records = records or []
        state_id, signals = self._infer(event_type=event_type, record=record, current_state=current_state)
        definition = self.definition(state_id)
        existing_types = {str(item.get("record_type") or item.get("type") or "").lower() for item in [record, *records]}
        missing = [item for item in definition.required_records if item.replace(" ", "_").lower() not in existing_types]
        repeated_missing = state_id == "missing_episode" and self._count_type(records, "missing_episode") >= 2
        manager_review = bool(definition.manager_oversight_needs or record.get("manager_review_required") or repeated_missing)
        actions = list(definition.actions_to_consider)
        if state_id == "missing_episode":
            actions.extend([
                "check known locations and safe return plan",
                "check return home interview requirement",
                "update chronology and missing risk review prompt",
                "prepare a concise handover prompt",
            ])
            if repeated_missing:
                actions.append("review repeated missing pattern with manager oversight")
        return OperationalStateAssessment(
            active_state=definition,
            matched_signals=signals,
            required_records_missing=missing,
            suggested_next_actions=actions,
            manager_review_required=manager_review,
            draft_only=True,
            automation_guardrails=[
                "No safeguarding decision, referral, approval or signature is automated.",
                "Prompts are draft support for staff and managers to review.",
                "Use records indicate / review recommended language.",
            ],
            evidence=[self._citation(item) for item in [record, *records] if item][:8],
        )

    def _infer(self, *, event_type: str | None, record: dict[str, Any], current_state: str | None) -> tuple[str, list[str]]:
        text = " ".join(str(record.get(key) or "") for key in ("record_type", "type", "title", "summary", "description", "status", "category", "outcome")).lower()
        raw = " ".join(filter(None, [str(event_type or ""), str(current_state or ""), text]))
        checks = [
            ("return_from_missing", ("return home interview", "returned from missing", "returned safely")),
            ("missing_episode", ("missing", "abscond", "unauthorised absence")),
            ("safeguarding_review", ("safeguarding", "lado", "strategy", "allegation")),
            ("incident_response", ("incident", "restraint", "physical intervention", "injury")),
            ("post_incident_recovery", ("debrief", "repair", "restorative", "recovery")),
            ("medication_round", ("medication", "medicine", "administered")),
            ("education_concern", ("school", "education", "attendance", "teacher")),
            ("family_contact_recovery", ("family contact", "mum", "dad", "sibling")),
            ("emotional_dysregulation", ("heightened", "distressed", "dysregulated", "meltdown", "shutdown")),
            ("handover", ("handover", "next shift")),
            ("reg44_follow_up", ("reg 44", "reg44")),
            ("reg45_review", ("reg 45", "reg45")),
            ("inspection_preparation", ("inspection", "ofsted", "sccif", "annex a")),
            ("document_review", ("document", "policy", "plan review")),
            ("risk_assessment_review", ("risk assessment", "risk review", "locality risk")),
            ("keywork_direct_work", ("keywork", "direct work")),
        ]
        for state_id, terms in checks:
            matched = [term for term in terms if term in raw]
            if matched:
                return state_id, matched
        return current_state or "active_shift", [current_state or "default_active_shift"]

    def _default(self, state_id: str) -> OperationalStateDefinition:
        title = state_id.replace("_", " ").title()
        return OperationalStateDefinition(
            state_id=state_id,
            title=title,
            required_records=["daily_note"],
            suggested_documents=["Care Plan", "Placement Plan"],
            chronology_links=["daily story", "shift chronology"],
            actions_to_consider=["record what happened, what helped and what still needs follow-up"],
            safe_language=["records indicate", "consider adding", "review may be helpful"],
            regulatory_relevance=["Reg 5", "Reg 6", "SCCIF experiences and progress"],
        )

    def _missing_episode(self, state_id: str) -> OperationalStateDefinition:
        return OperationalStateDefinition(
            state_id=state_id,
            title="Missing episode",
            required_records=["missing_episode", "chronology_event"],
            suggested_documents=["Missing From Care Protocol", "Individual Risk Assessment", "Locality Risk Assessment"],
            risk_assessments_to_review=["Missing risk", "Exploitation risk", "Dynamic child risk", "Locality risk"],
            plans_to_check=["Care Plan", "Placement Plan", "Safety Plan"],
            chronology_links=["missing episode timeline", "known locations", "return context"],
            actions_to_consider=["check missing protocol", "check known locations", "prepare return home interview prompt"],
            manager_oversight_needs=["repeated missing episodes", "unknown adult/location indicators", "return interview missing"],
            orb_tone="calm, steady, safeguarding cautious",
            orb_prompts=["Would you like me to draft a handover note?", "Consider reviewing missing risk and known locations."],
            safe_language=["records indicate", "possible indicator", "review recommended"],
            escalation_reminders=["follow local missing protocol", "record police/social worker updates where applicable"],
            regulatory_relevance=["Reg 12", "Reg 40", "SCCIF help and protection", "Reg 45 evidence"],
        )

    def _return_from_missing(self, state_id: str) -> OperationalStateDefinition:
        base = self._missing_episode(state_id)
        return base.model_copy(update={
            "title": "Return from missing",
            "required_records": ["return_home_interview", "missing_episode", "chronology_event"],
            "actions_to_consider": ["record presentation on return", "offer debrief", "review missing risk", "link chronology"],
            "orb_prompts": ["What helped the child settle after returning?", "Was a return home interview arranged or completed?"],
        })

    def _incident_response(self, state_id: str) -> OperationalStateDefinition:
        return self._default(state_id).model_copy(update={
            "required_records": ["incident", "chronology_event"],
            "suggested_documents": ["Positive Behaviour Support Plan", "Individual Risk Assessment"],
            "actions_to_consider": ["record immediate safety steps", "identify follow-up owner", "avoid unsupported conclusions"],
            "manager_oversight_needs": ["restraint", "injury", "safeguarding concern", "police involvement"],
            "regulatory_relevance": ["Reg 12", "Reg 35", "SCCIF help and protection"],
        })

    def _post_incident_recovery(self, state_id: str) -> OperationalStateDefinition:
        return self._incident_response(state_id).model_copy(update={
            "title": "Post-incident recovery",
            "required_records": ["incident", "debrief", "daily_note"],
            "actions_to_consider": ["record repair offered", "record what helped regulation", "check child voice"],
            "orb_prompts": ["This could be strengthened by noting emotional safety and repair."],
        })

    def _safeguarding_review(self, state_id: str) -> OperationalStateDefinition:
        return self._incident_response(state_id).model_copy(update={
            "title": "Safeguarding review",
            "required_records": ["safeguarding_concern", "chronology_event", "manager_review"],
            "manager_oversight_needs": ["all safeguarding reviews require manager oversight"],
            "actions_to_consider": ["link source records", "check escalation record", "record professional advice"],
            "regulatory_relevance": ["Reg 12", "Reg 40", "SCCIF safeguarding culture"],
        })

    def _inspection_preparation(self, state_id: str) -> OperationalStateDefinition:
        return self._default(state_id).model_copy(update={
            "required_records": ["inspection_readiness", "document_readiness", "annex_a_readiness"],
            "suggested_documents": ["Statement of Purpose", "Reg 44 Reports", "Reg 45 Reviews", "Training Matrix"],
            "actions_to_consider": ["sample source links", "check child voice", "review overdue actions", "prepare Annex A draft"],
            "manager_oversight_needs": ["Annex A draft", "weak evidence", "stale documents", "overdue Reg 44 actions"],
            "regulatory_relevance": ["SCCIF", "Reg 44", "Reg 45", "Quality Standards"],
        })

    def _reg44_follow_up(self, state_id: str) -> OperationalStateDefinition:
        return self._inspection_preparation(state_id).model_copy(update={"title": "Reg 44 follow-up", "required_records": ["reg44_report", "action"]})

    def _reg45_review(self, state_id: str) -> OperationalStateDefinition:
        return self._inspection_preparation(state_id).model_copy(update={"title": "Reg 45 review", "required_records": ["reg45_review", "evidence_pack"]})

    def _manager_qa(self, state_id: str) -> OperationalStateDefinition:
        return self._inspection_preparation(state_id).model_copy(update={"title": "Manager QA", "required_records": ["manager_review", "action"]})

    def _risk_review(self, state_id: str) -> OperationalStateDefinition:
        return self._missing_episode(state_id).model_copy(update={"title": "Risk assessment review", "required_records": ["risk_assessment", "chronology_event"]})

    def _document_review(self, state_id: str) -> OperationalStateDefinition:
        return self._inspection_preparation(state_id).model_copy(update={"title": "Document review", "required_records": ["document", "review"]})

    def _emotional_dysregulation(self, state_id: str) -> OperationalStateDefinition:
        return self._post_incident_recovery(state_id).model_copy(update={"title": "Emotional dysregulation", "required_records": ["daily_note", "chronology_event"]})

    def _education_concern(self, state_id: str) -> OperationalStateDefinition:
        return self._default(state_id).model_copy(update={"required_records": ["education", "daily_note"], "suggested_documents": ["Education Plan", "PEP support documents"], "regulatory_relevance": ["Reg 8", "SCCIF experiences and progress"]})

    def _family_contact_recovery(self, state_id: str) -> OperationalStateDefinition:
        return self._default(state_id).model_copy(update={"required_records": ["family_time_contact", "daily_note"], "suggested_documents": ["Family Contact Plan"], "actions_to_consider": ["record how the child felt after contact", "check regulation support"], "regulatory_relevance": ["Reg 11", "Reg 6"]})

    def _handover(self, state_id: str) -> OperationalStateDefinition:
        return self._default(state_id).model_copy(update={"required_records": ["handover", "daily_note"], "actions_to_consider": ["include what changed", "include open actions", "include what helped the child settle"]})

    def _medication_round(self, state_id: str) -> OperationalStateDefinition:
        return self._default(state_id).model_copy(update={"required_records": ["health_medication"], "suggested_documents": ["Medication Plan", "Medication Policy"], "regulatory_relevance": ["Reg 10"]})

    def _keywork(self, state_id: str) -> OperationalStateDefinition:
        return self._default(state_id).model_copy(update={"required_records": ["keywork_direct_work"], "suggested_documents": ["Keywork Plan", "Child Voice Evidence"], "actions_to_consider": ["record the child's words and choices", "link action or plan update if needed"]})

    def _count_type(self, records: list[dict[str, Any]], record_type: str) -> int:
        return sum(1 for item in records if str(item.get("record_type") or item.get("type") or "").lower() == record_type)

    def _citation(self, record: dict[str, Any]) -> dict[str, Any]:
        return {"id": record.get("id") or record.get("record_id"), "record_type": record.get("record_type") or record.get("type"), "title": record.get("title") or record.get("summary")}


operational_state_engine = OperationalStateEngine()
