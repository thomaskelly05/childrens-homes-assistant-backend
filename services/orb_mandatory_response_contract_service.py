"""Mandatory ORB standalone response contracts — selected by orchestrator, not new brains."""

from __future__ import annotations

import re
from typing import Any

from services.orb_scenario_playbook_service import orb_scenario_playbook_service

ADULT_POSITION_OF_TRUST_TRIGGERS: tuple[str, ...] = (
    "staff member",
    "member of staff",
    "staff",
    "adult in a position of trust",
    "position of trust",
    "volunteer",
    "professional",
    "allegation against",
    "touched them",
    "hurt them",
    "inappropriately",
)

LADO_FORBIDDEN_WITHOUT_ADULT_TRIGGER = re.compile(r"\blado\b", re.I)


def lado_appropriate_for_prompt(message: str) -> bool:
    """LADO should only appear when the prompt concerns an adult in a position of trust."""
    lower = str(message or "").lower()
    return any(trigger in lower for trigger in ADULT_POSITION_OF_TRUST_TRIGGERS)


_LADO_SCENARIO_TYPES = frozenset({"allegation_against_staff"})


def find_inappropriate_lado_reference(
    answer: str,
    message: str,
    *,
    scenario_types: list[str] | None = None,
) -> bool:
    """True when LADO appears in an answer but the prompt has no adult-position-of-trust trigger."""
    if not LADO_FORBIDDEN_WITHOUT_ADULT_TRIGGER.search(str(answer or "")):
        return False
    if any(st in _LADO_SCENARIO_TYPES for st in (scenario_types or [])):
        return False
    if lado_appropriate_for_prompt(message):
        return False
    lower = str(answer or "").lower()
    explanatory_phrases = (
        "lado is only",
        "lado only",
        "do not rely on lado",
        "not for a young person",
        "unless there is an allegation",
        "unless the prompt includes an adult",
        "adult in a position of trust",
        "not a default route",
    )
    if any(phrase in lower for phrase in explanatory_phrases):
        return False
    return True


MANDATORY_CONTRACTS: dict[str, dict[str, Any]] = {
    "missing_return_substance_risk": {
        "id": "missing_return_substance_risk",
        "label": "Missing return with substance indicators",
        "mandatory_sections": [
            "Immediate welfare check and calm welcome back",
            "Injury, distress, intoxication, hunger, fatigue and immediate medical need",
            "Follow missing procedure; update police if episode was active",
            "Notify manager/on-call and social worker/placing authority; EDT if out of hours",
            "Health advice — 111/999 if unwell or intoxicated",
            "Exploitation / contextual safeguarding curiosity",
            "Return home interview / local missing procedure",
            "Record exact words and observations; update missing/risk/placement plans",
            "Manager oversight; do not accuse or shame",
            "LADO only if allegation/concern about adult in position of trust",
        ],
        "validation_markers": [
            "welfare",
            "missing",
            "return",
            "record",
            "manager",
            "exploitation",
            "social worker",
        ],
        "forbidden_without_adult_trigger": ["lado"],
        "playbook_ids": ["return_from_missing", "intoxicated_child"],
    },
    "allegation_against_staff": {
        "id": "allegation_against_staff",
        "label": "Allegation against staff",
        "mandatory_sections": [
            "Child safety first",
            "Do not investigate or decide truth",
            "Manager / RI / provider safeguarding lead",
            "LADO / designated officer consideration under local procedure",
            "Social worker / police as required",
            "Exact words and actions recorded",
            "Allegation management separate from disciplinary judgement",
        ],
        "validation_markers": [
            "child safety",
            "do not investigate",
            "lado",
            "designated officer",
            "record",
            "manager",
        ],
        "playbook_ids": ["allegation_against_staff"],
    },
    "suicide_self_harm": {
        "id": "suicide_self_harm",
        "label": "Suicidal ideation / self-harm",
        "mandatory_sections": [
            "Immediate safety",
            "Do not leave alone if immediate risk",
            "Direct safety questions",
            "Reduce access to means where safe",
            "Crisis / emergency route where required",
            "Manager / on-call notification",
            "Risk / safety plan update",
            "Exact words and actions recorded",
        ],
        "validation_markers": [
            "immediate safety",
            "do not leave alone",
            "means",
            "emergency",
            "manager",
            "record",
        ],
        "playbook_ids": ["self_harm_now"],
    },
    "parent_forced_removal": {
        "id": "parent_forced_removal",
        "label": "Parent forced removal / contact conflict",
        "mandatory_sections": [
            "Child welfare and legal status clarity",
            "Do not allow removal without authority",
            "Manager direction immediately",
            "Police / social worker where required",
            "Child voice and distress considered",
            "Factual recording of words and actions",
        ],
        "validation_markers": ["legal", "manager", "welfare", "record", "police", "social worker"],
        "playbook_ids": ["parent_arrives_unplanned"],
    },
    "historic_sexual_abuse_disclosure": {
        "id": "historic_sexual_abuse_disclosure",
        "label": "Historic sexual abuse disclosure",
        "mandatory_sections": [
            "Calm listening without leading questions",
            "Immediate safety and current risk check",
            "Do not investigate or decide truth",
            "Manager / DSL escalation",
            "Social worker / police under local procedure",
            "Child's words recorded accurately",
            "Trauma-informed support and chronology update",
        ],
        "validation_markers": ["listen", "record", "manager", "dsl", "safety", "social worker"],
        "playbook_ids": ["child_discloses_assault"],
    },
    "exploitation_county_lines": {
        "id": "exploitation_county_lines",
        "label": "Exploitation / county lines",
        "mandatory_sections": [
            "Contextual safeguarding thinking",
            "Immediate safety where indicated",
            "Police / social worker routes",
            "Chronology and pattern review",
            "Manager / DSL oversight",
            "Factual recording",
        ],
        "validation_markers": ["exploitation", "police", "social worker", "chronology", "record"],
        "playbook_ids": ["suspected_county_lines_pickup", "suspected_cse_contact"],
    },
    "peer_on_peer_harm": {
        "id": "peer_on_peer_harm",
        "label": "Peer-on-peer harm",
        "mandatory_sections": [
            "Separation and welfare of both children",
            "Do not minimise",
            "Allegations / safeguarding process",
            "Manager / DSL notification",
            "Factual recording",
        ],
        "validation_markers": ["both children", "welfare", "record", "manager", "safeguarding"],
        "playbook_ids": ["peer_on_peer_assault"],
    },
    "medication_error": {
        "id": "medication_error",
        "label": "Medication error",
        "mandatory_sections": [
            "Immediate health / safety response",
            "Clinical advice route",
            "MAR and manager review",
            "Factual recording",
        ],
        "validation_markers": ["health", "mar", "manager", "record"],
        "playbook_ids": ["medication_error"],
    },
    "restraint_physical_intervention": {
        "id": "restraint_physical_intervention",
        "label": "Restraint / physical intervention",
        "mandatory_sections": [
            "Immediate risk assessment",
            "Least restrictive lawful option",
            "Policy, training and debrief",
            "Manager review and recording",
        ],
        "validation_markers": ["risk", "proportion", "record", "manager", "debrief"],
        "playbook_ids": ["can_i_physically_stop_child", "restraint_review"],
    },
    "online_harm_image_sharing": {
        "id": "online_harm_image_sharing",
        "label": "Online harm / image sharing",
        "mandatory_sections": [
            "Immediate safeguarding",
            "Do not blame the child",
            "Preserve evidence thinking",
            "Specialist / police routes where required",
            "Factual recording",
        ],
        "validation_markers": ["online", "safeguarding", "record", "police", "evidence"],
        "playbook_ids": ["online_nude_image_or_sextortion"],
    },
    "missing_from_home": {
        "id": "missing_from_home",
        "label": "Missing from home — active episode",
        "mandatory_sections": [
            "Immediate welfare and safety actions",
            "Search / missing procedure under local policy",
            "Manager / on-call notification",
            "Police / social worker / placing authority where required",
            "Record times, actions, rationale and who was notified",
            "Risk / missing plan review when located",
        ],
        "validation_markers": ["missing", "welfare", "manager", "record", "safeguarding"],
        "playbook_ids": ["missing_now"],
    },
}


class OrbMandatoryResponseContractService:
    def contracts_for_scenarios(self, scenario_types: list[str]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for scenario_type in scenario_types:
            spec = MANDATORY_CONTRACTS.get(scenario_type)
            if not spec:
                continue
            playbook_must_include: list[str] = []
            for playbook_id in spec.get("playbook_ids") or []:
                playbook = orb_scenario_playbook_service.get_playbook(playbook_id)
                if playbook:
                    playbook_must_include.extend(list(playbook.must_include)[:4])
            out.append(
                {
                    "scenario_type": scenario_type,
                    "label": spec["label"],
                    "mandatory_sections": list(spec["mandatory_sections"]),
                    "validation_markers": list(spec["validation_markers"]),
                    "playbook_must_include": playbook_must_include[:8],
                }
            )
        return out

    def build_response_contract(self, scenario_types: list[str], *, multi_scenario: bool) -> list[str]:
        contracts = self.contracts_for_scenarios(scenario_types)
        lines: list[str] = []
        if multi_scenario:
            lines.append(
                "MULTI-SCENARIO: Open with 'These are separate safeguarding situations and should be treated separately.'"
            )
            lines.append("Address each scenario under its own heading with its own contract.")
        for contract in contracts:
            lines.append(f"Mandatory contract — {contract['label']}:")
            for section in contract["mandatory_sections"]:
                lines.append(f"- {section}")
        return lines

    def prompt_block(self, scenario_types: list[str], *, multi_scenario: bool) -> str:
        contract_lines = self.build_response_contract(scenario_types, multi_scenario=multi_scenario)
        if not contract_lines:
            return ""
        return "Mandatory ORB response contracts (orchestrator-selected):\n" + "\n".join(contract_lines)

    def validate_answer_markers(
        self,
        answer_text: str,
        scenario_types: list[str],
        *,
        source_message: str = "",
    ) -> dict[str, Any]:
        lower = str(answer_text or "").lower()
        results: list[dict[str, Any]] = []
        for scenario_type in scenario_types:
            spec = MANDATORY_CONTRACTS.get(scenario_type)
            if not spec:
                continue
            markers = list(spec.get("validation_markers") or [])
            missing = [marker for marker in markers if marker.lower() not in lower]
            inappropriate_lado = False
            if find_inappropriate_lado_reference(
                answer_text,
                source_message,
                scenario_types=scenario_types,
            ):
                inappropriate_lado = True
                missing.append("inappropriate_lado_reference")
            results.append(
                {
                    "scenario_type": scenario_type,
                    "passed": not missing,
                    "missing_markers": missing,
                    "inappropriate_lado": inappropriate_lado,
                }
            )
        return {
            "scenario_results": results,
            "passed": all(item["passed"] for item in results) if results else True,
        }


orb_mandatory_response_contract_service = OrbMandatoryResponseContractService()
