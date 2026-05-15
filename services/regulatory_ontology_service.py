from __future__ import annotations

from functools import lru_cache
from typing import Any

from schemas.regulatory_ontology import RegulatoryOntologyNode, RegulatoryOntologySummary


SOURCE_DOCUMENTS = [
    {
        "id": "children_homes_regulations_guide_2015",
        "title": "Guide to the Children's Homes Regulations including the Quality Standards",
        "source": "Department for Education, April 2015",
        "ingestion": "PDF text fetched and mapped into deterministic ontology nodes.",
    },
    {
        "id": "sccif_childrens_homes",
        "title": "Social care common inspection framework: children's homes",
        "source": "Ofsted/GOV.UK",
        "ingestion": "Direct fetch returned 403; SCCIF judgement areas mapped from public framework wording and existing inspection-readiness services.",
    },
]


QUALITY_STANDARDS: list[tuple[str, str, str, str]] = [
    ("quality_and_purpose_of_care", "Quality and purpose of care", "Reg 6", "Care must be purposeful, personalised, dignified and linked to the home's Statement of Purpose."),
    ("views_wishes_and_feelings", "Children's views, wishes and feelings", "Reg 7", "Children should be heard, helped to express views, and see how adults respond."),
    ("education", "Education", "Reg 8", "The home should promote attendance, learning, aspiration and education partnership working."),
    ("enjoyment_and_achievement", "Enjoyment and achievement", "Reg 9", "Children should have opportunities, hobbies, friendships and visible progress from their starting points."),
    ("health_and_wellbeing", "Health and wellbeing", "Reg 10", "Children's physical, emotional and mental health needs should be understood and supported."),
    ("positive_relationships", "Positive relationships", "Reg 11", "Adults should support safe, constructive relationships and repair after conflict."),
    ("protection_of_children", "Protection of children", "Reg 12", "Safeguarding, risk, missing, restraint and allegations must be recorded, reviewed and acted on."),
    ("leadership_and_management", "Leadership and management", "Reg 13", "Leaders must evidence oversight, staffing, learning, monitoring and quality improvement."),
    ("care_planning", "Care planning", "Reg 14", "The child's plans should guide care, review and placement decision-making."),
]


REGULATIONS: list[tuple[str, str, str]] = [
    ("reg_5", "Reg 5 - engaging with the wider system", "Work with placing authorities, families and professionals and challenge when needs are not met."),
    ("reg_6", "Reg 6 - quality and purpose of care", "Deliver care aligned to the Statement of Purpose and the child's assessed needs."),
    ("reg_7", "Reg 7 - children's views, wishes and feelings", "Record and respond to children's views and advocacy needs."),
    ("reg_8", "Reg 8 - education", "Support attendance, attainment and educational progress."),
    ("reg_9", "Reg 9 - enjoyment and achievement", "Promote interests, confidence, friendships and positive routines."),
    ("reg_10", "Reg 10 - health and wellbeing", "Support health, emotional wellbeing and access to services."),
    ("reg_11", "Reg 11 - positive relationships", "Support positive relationships, boundaries and restorative care."),
    ("reg_12", "Reg 12 - protection of children", "Protect children, understand risks and respond to safeguarding concerns."),
    ("reg_13", "Reg 13 - leadership and management", "Ensure effective leadership, monitoring, staff support and quality assurance."),
    ("reg_14", "Reg 14 - care planning", "Ensure care follows relevant plans and placement objectives."),
    ("reg_35", "Reg 35 - behaviour management", "Record and review behaviour management, restraint and consequences appropriately."),
    ("reg_40", "Reg 40 - notifications", "Notify significant events to the right agencies without delay."),
    ("reg_44", "Reg 44 - independent person visits", "Track independent visitor findings and actions."),
    ("reg_45", "Reg 45 - quality of care review", "Review quality of care and improvement evidence at least six-monthly."),
]


SCCIF_AREAS: list[tuple[str, str, str]] = [
    ("sccif_experiences_and_progress", "Overall experiences and progress of children", "Evidence should show lived experience, progress from starting points and daily quality of care."),
    ("sccif_help_and_protection", "How well children are helped and protected", "Evidence should show safeguarding culture, risk response, missing episodes and escalation."),
    ("sccif_effectiveness_of_leaders", "Effectiveness of leaders and managers", "Evidence should show oversight, workforce stability, QA, learning and action completion."),
    ("sccif_quality_and_purpose", "Quality and purpose of care", "Evidence should connect the Statement of Purpose to actual child experience."),
    ("sccif_safeguarding_culture", "Safeguarding culture", "Evidence should show curiosity, professional challenge and timely protection."),
    ("sccif_workforce_stability", "Workforce stability and development", "Evidence should show staffing, induction, supervision, training and competence."),
    ("sccif_management_oversight", "Management oversight", "Evidence should show manager review, closure of actions and impact."),
    ("sccif_childrens_voice", "Children's voice and lived experience", "Evidence should show words, choices, wishes, feelings and adult response."),
    ("sccif_progress_from_starting_points", "Progress from starting points", "Evidence should show change over time, strengths and barriers."),
    ("sccif_matching_and_planning", "Matching and placement planning", "Evidence should show matching, impact risk and care planning."),
    ("sccif_records_monitoring_review", "Records, monitoring and review", "Evidence should show accurate records, source links, review and QA."),
]


class RegulatoryOntologyService:
    """Static regulatory graph used by metadata, Orb and inspection readiness."""

    @lru_cache(maxsize=1)
    def nodes(self) -> list[RegulatoryOntologyNode]:
        nodes: list[RegulatoryOntologyNode] = []
        nodes.extend(self._quality_standard_nodes())
        nodes.extend(self._regulation_nodes())
        nodes.extend(self._sccif_nodes())
        return nodes

    def summary(self) -> RegulatoryOntologySummary:
        nodes = self.nodes()
        return RegulatoryOntologySummary(
            node_count=len(nodes),
            quality_standard_ids=[node.id for node in nodes if node.node_type == "quality_standard"],
            regulation_ids=[node.id for node in nodes if node.node_type == "regulation"],
            sccif_area_ids=[node.id for node in nodes if node.node_type == "sccif_area"],
            source_documents=SOURCE_DOCUMENTS,
            guardrails=[
                "Ontology links evidence to review prompts; it does not make safeguarding decisions.",
                "Reg 44, Reg 45, Annex A and Ofsted outputs remain manager-reviewed drafts.",
                "Orb may explain gaps and suggest drafting support, not final judgements.",
            ],
        )

    def get_node(self, node_id: str) -> RegulatoryOntologyNode | None:
        return next((node for node in self.nodes() if node.id == node_id), None)

    def linked_nodes_for_metadata(self, metadata: dict[str, Any]) -> list[RegulatoryOntologyNode]:
        regulatory = metadata.get("regulatory", metadata)
        ids = set(regulatory.get("quality_standard_ids") or [])
        for item in regulatory.get("children_home_regulation_ids") or []:
            value = str(item)
            if value.startswith("regulation_"):
                parts = value.split("_", 2)
                if len(parts) > 1 and parts[1].isdigit():
                    ids.add(f"reg_{parts[1]}")
                    continue
            ids.add(value)
        ids.update(regulatory.get("sccif_area_ids") or [])
        return [node for node in self.nodes() if node.id in ids or any(related in ids for related in node.related_node_ids)]

    def gap_detection_for_record(self, *, record_type: str, metadata: dict[str, Any]) -> list[dict[str, Any]]:
        nodes = self.linked_nodes_for_metadata(metadata)
        care = metadata.get("care", {})
        gaps: list[dict[str, Any]] = []
        for node in nodes:
            for rule in node.gap_detection_rules:
                if "child voice" in rule.lower() and care.get("child_voice_missing"):
                    gaps.append(self._gap(node, "child_voice_missing", "limited evidence found for child voice."))
                if "manager" in rule.lower() and care.get("manager_review_required") is False and record_type in {"incident", "missing_episode", "safeguarding_concern"}:
                    gaps.append(self._gap(node, "manager_oversight_not_visible", "review recommended where oversight is not visible."))
                if "recovery" in rule.lower() and care.get("incident_marker") and not care.get("trauma_informed_support"):
                    gaps.append(self._gap(node, "recovery_or_repair_not_visible", "this could be strengthened by recovery, repair or debrief evidence."))
        return gaps

    def _quality_standard_nodes(self) -> list[RegulatoryOntologyNode]:
        return [
            self._node(
                id=identifier,
                title=title,
                node_type="quality_standard",
                meaning=meaning,
                regulation=regulation,
                related=[regulation.lower().replace(" ", "_").replace("-", "").replace("__", "_")],
            )
            for identifier, title, regulation, meaning in QUALITY_STANDARDS
        ]

    def _regulation_nodes(self) -> list[RegulatoryOntologyNode]:
        return [
            self._node(
                id=identifier,
                title=title,
                node_type="regulation",
                meaning=meaning,
                regulation=title.split(" - ")[0],
                related=self._related_standards(identifier),
            )
            for identifier, title, meaning in REGULATIONS
        ]

    def _sccif_nodes(self) -> list[RegulatoryOntologyNode]:
        return [
            self._node(
                id=identifier,
                title=title,
                node_type="sccif_area",
                meaning=meaning,
                regulation="SCCIF",
                related=self._related_sccif(identifier),
            )
            for identifier, title, meaning in SCCIF_AREAS
        ]

    def _node(self, *, id: str, title: str, node_type: str, meaning: str, regulation: str, related: list[str]) -> RegulatoryOntologyNode:
        return RegulatoryOntologyNode(
            id=id,
            title=title,
            node_type=node_type,
            plain_english_meaning=meaning,
            required_evidence=self._required_evidence(id, node_type),
            linked_record_types=self._record_types(id),
            linked_document_types=self._document_types(id),
            linked_actions=self._actions(id),
            linked_roles=self._roles(id),
            linked_orb_behaviour=[
                "use active child context only",
                "speak cautiously using records indicate / review recommended",
                "offer drafting or evidence-strengthening help without deciding",
            ],
            linked_daily_note_metadata=self._metadata_fields(id),
            linked_inspection_evidence=self._inspection_evidence(id),
            review_frequency=self._frequency(id, node_type),
            evidence_strength_rules=[
                "strong evidence has source links, child impact, dates and review/outcome where relevant",
                "medium evidence has a clear record but limited impact or oversight",
                "limited evidence has no source link, weak child voice, or vague outcome",
            ],
            gap_detection_rules=self._gap_rules(id),
            manager_oversight_triggers=self._oversight_triggers(id),
            source_refs=[regulation, *[doc["id"] for doc in SOURCE_DOCUMENTS]],
            related_node_ids=related,
        )

    def _required_evidence(self, node_id: str, node_type: str) -> list[str]:
        base = ["source record", "date", "child impact", "follow-up or review outcome where relevant"]
        if "voice" in node_id or "views" in node_id:
            base.append("child's words, choices, wishes or feelings")
        if any(term in node_id for term in ("protection", "safeguarding", "missing", "reg_12", "reg_40")):
            base.extend(["risk assessment review", "escalation and notification evidence", "manager oversight"])
        if any(term in node_id for term in ("leadership", "management", "reg_44", "reg_45")):
            base.extend(["QA sampling", "action tracker", "RM/RI review evidence"])
        if node_type == "sccif_area":
            base.append("inspection-ready source links")
        return base

    def _record_types(self, node_id: str) -> list[str]:
        mapping = {
            "education": ["education", "daily_note", "keywork_direct_work"],
            "health": ["health_medication", "daily_note", "risk_assessment"],
            "protection": ["incident", "safeguarding_concern", "missing_episode", "risk_assessment"],
            "missing": ["missing_episode", "risk_assessment", "chronology_event"],
            "leadership": ["action", "evidence", "report", "document"],
            "management": ["action", "evidence", "report", "document"],
            "planning": ["document", "risk_assessment", "action"],
        }
        for key, values in mapping.items():
            if key in node_id:
                return values
        return ["daily_note", "chronology_event", "document", "evidence"]

    def _document_types(self, node_id: str) -> list[str]:
        if "education" in node_id:
            return ["Education Plan", "PEP support documents"]
        if "health" in node_id:
            return ["Health Plan", "Medication Plan", "Emotional Wellbeing Plan"]
        if "protection" in node_id or "safeguarding" in node_id:
            return ["Individual Risk Assessment", "Missing From Care Protocol", "Safety Plan", "Safeguarding Policy"]
        if "leadership" in node_id or "management" in node_id:
            return ["Reg 44 Reports", "Reg 45 Reviews", "Training Matrix", "Supervision Records"]
        if "planning" in node_id:
            return ["Care Plan", "Placement Plan", "Matching Assessment", "Impact Risk Assessment"]
        return ["Care Plan", "Chronology", "Direct Work Evidence", "Child Voice Evidence"]

    def _actions(self, node_id: str) -> list[str]:
        actions = ["link evidence", "record impact", "set owner and review date"]
        if any(term in node_id for term in ("protection", "safeguarding", "missing", "reg_12", "reg_40")):
            actions.extend(["review risk assessment", "check escalation and notification record"])
        if "voice" in node_id or "views" in node_id:
            actions.append("strengthen child voice evidence")
        return actions

    def _roles(self, node_id: str) -> list[str]:
        roles = ["key worker", "shift lead", "registered manager"]
        if any(term in node_id for term in ("leadership", "management", "reg_44", "reg_45")):
            roles.extend(["responsible individual", "independent visitor"])
        if any(term in node_id for term in ("protection", "safeguarding", "missing")):
            roles.extend(["social worker", "safeguarding lead"])
        return sorted(set(roles))

    def _metadata_fields(self, node_id: str) -> list[str]:
        fields = ["child_voice_present", "follow_up_required", "manager_review_required", "inspection_relevance"]
        if "health" in node_id:
            fields.extend(["emotional_wellbeing", "sleep", "health", "trauma_informed_support", "neurodiversity_adjustment"])
        if "protection" in node_id or "safeguarding" in node_id:
            fields.extend(["safeguarding_marker", "missing_marker", "risk_update_suggested"])
        if "education" in node_id:
            fields.append("education")
        return sorted(set(fields))

    def _inspection_evidence(self, node_id: str) -> list[str]:
        return ["chronology", "daily note quality", "document evidence", "action outcome", "manager oversight", node_id]

    def _frequency(self, node_id: str, node_type: str) -> str:
        if "reg_44" in node_id:
            return "monthly"
        if "reg_45" in node_id:
            return "six-monthly"
        if any(term in node_id for term in ("protection", "missing", "safeguarding", "risk")):
            return "after each significant event and at planned review"
        if node_type == "sccif_area":
            return "inspection preparation cycle and manager QA sampling"
        return "at planned review and when circumstances change"

    def _gap_rules(self, node_id: str) -> list[str]:
        rules = ["flag vague outcome", "flag missing source link"]
        if "voice" in node_id or "views" in node_id:
            rules.append("flag missing child voice")
        if any(term in node_id for term in ("protection", "incident", "missing", "safeguarding")):
            rules.extend(["flag missing recovery/debrief", "flag missing manager oversight"])
        if "leadership" in node_id or "management" in node_id:
            rules.append("flag overdue action without outcome")
        return rules

    def _oversight_triggers(self, node_id: str) -> list[str]:
        triggers = ["evidence weak or stale", "review overdue", "follow-up outstanding"]
        if any(term in node_id for term in ("protection", "safeguarding", "missing", "reg_40")):
            triggers.extend(["significant event", "repeat missing episode", "notification may be required"])
        return triggers

    def _related_standards(self, regulation_id: str) -> list[str]:
        index = {"reg_6": "quality_and_purpose_of_care", "reg_7": "views_wishes_and_feelings", "reg_8": "education", "reg_9": "enjoyment_and_achievement", "reg_10": "health_and_wellbeing", "reg_11": "positive_relationships", "reg_12": "protection_of_children", "reg_13": "leadership_and_management", "reg_14": "care_planning"}
        return [index[regulation_id]] if regulation_id in index else []

    def _related_sccif(self, area_id: str) -> list[str]:
        if "protection" in area_id or "safeguarding" in area_id:
            return ["protection_of_children", "reg_12"]
        if "leader" in area_id or "management" in area_id or "workforce" in area_id:
            return ["leadership_and_management", "reg_13", "reg_44", "reg_45"]
        if "planning" in area_id:
            return ["care_planning", "reg_14"]
        return ["quality_and_purpose_of_care", "views_wishes_and_feelings"]

    def _gap(self, node: RegulatoryOntologyNode, gap_id: str, summary: str) -> dict[str, Any]:
        return {"node_id": node.id, "node_title": node.title, "gap_id": gap_id, "summary": summary, "language": "review recommended"}


regulatory_ontology_service = RegulatoryOntologyService()
