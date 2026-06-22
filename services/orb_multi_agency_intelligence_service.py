from __future__ import annotations

"""Multi-agency Intelligence for ORB Residential.

Prompts ORB to think beyond the home: who else may need to know, contribute,
review, support, safeguard or evidence the child's experience. This service does
not decide thresholds or make referrals; it supports professional consideration.
"""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class MultiAgencyRoute:
    id: str
    label: str
    triggers: tuple[str, ...]
    consider_when: str
    boundaries: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["triggers"] = list(self.triggers)
        payload["boundaries"] = list(self.boundaries)
        return payload


@dataclass(frozen=True)
class MultiAgencyDecision:
    active: bool
    matched_routes: list[dict[str, Any]] = field(default_factory=list)
    prompts: list[str] = field(default_factory=list)
    source_anchors: list[str] = field(default_factory=list)
    boundary: str = "ORB prompts multi-agency consideration; responsible adults follow local policy and decide actions."

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbMultiAgencyIntelligenceService:
    VERSION = "orb-multi-agency-intelligence-v1"

    def __init__(self) -> None:
        self.routes = self._build_routes()

    def evaluate(
        self,
        text: str,
        *,
        mode: str | None = None,
        scenario_types: list[str] | None = None,
        risk_level: str | None = None,
    ) -> MultiAgencyDecision:
        blob = f"{text or ''} {mode or ''} {' '.join(scenario_types or [])} {risk_level or ''}".lower()
        matched: list[MultiAgencyRoute] = []
        for route in self.routes:
            if any(trigger in blob for trigger in route.triggers):
                matched.append(route)

        if not matched and any(term in blob for term in ("safeguard", "missing", "disclosure", "risk", "exploitation", "self-harm", "restraint", "school", "health")):
            default_ids = {"social_worker", "manager_on_call", "health", "police", "virtual_school"}
            matched = [route for route in self.routes if route.id in default_ids]

        if not matched:
            return MultiAgencyDecision(active=False)

        prompts = [
            "Who needs to know, contribute or review this — and what is the purpose of sharing?",
            "What facts, actions, times, decisions and rationale should be recorded?",
            "Is the child safe now, and is there any immediate professional consultation needed?",
            "Does the child need advocacy, voice support or a trusted adult to help them express their wishes?",
        ]
        for route in matched[:6]:
            prompts.append(f"Consider {route.label}: {route.consider_when}")

        anchors = ["[Working Together]", "[Information sharing]", "[Quality Standards]"]
        if any(route.id == "virtual_school" for route in matched):
            anchors.append("[KCSIE]")
        if any(route.id in {"health", "camhs"} for route in matched):
            anchors.append("[NICE looked-after children]")
        if any(route.id == "lado" for route in matched):
            anchors.append("[LADO]")

        return MultiAgencyDecision(
            active=True,
            matched_routes=[route.to_dict() for route in matched[:8]],
            prompts=prompts[:12],
            source_anchors=list(dict.fromkeys(anchors)),
        )

    def context_payload(self, text: str, **kwargs: Any) -> dict[str, Any]:
        payload = self.evaluate(text, **kwargs).to_dict()
        payload["service_version"] = self.VERSION
        return payload

    def prompt_block(self, text: str, **kwargs: Any) -> str:
        decision = self.evaluate(text, **kwargs)
        if not decision.active:
            return ""
        lines = [
            "Multi-agency Intelligence:",
            "- Do not decide thresholds or make referrals for the user.",
            "- Prompt the adult to consider who needs to know, why, and what information should be shared under local policy.",
            "- Keep the child's safety, voice, dignity and relationships central.",
        ]
        lines.extend(f"- {prompt}" for prompt in decision.prompts[:8])
        return "\n".join(lines)

    def _build_routes(self) -> tuple[MultiAgencyRoute, ...]:
        return (
            MultiAgencyRoute("manager_on_call", "manager / on-call / senior", ("manager", "on-call", "senior", "oversight", "review", "risk", "incident"), "when risk, uncertainty, repeated patterns, restraint, missing episodes or significant recording gaps are present."),
            MultiAgencyRoute("social_worker", "social worker / placing authority", ("social worker", "placing authority", "local authority", "care plan", "placement plan", "missing", "safeguard", "exploitation"), "when safeguarding, placement planning, missing episodes, significant incidents, family contact or plan review may be relevant."),
            MultiAgencyRoute("iro", "IRO", ("iro", "review", "care review", "statutory review", "plan drift", "child not heard"), "where care plan drift, unresolved concerns, repeated patterns or the child's voice in statutory planning may need review."),
            MultiAgencyRoute("virtual_school", "school / DSL / virtual school", ("school", "education", "attendance", "exclusion", "dsl", "virtual school", "pep", "bullying", "peer harm", "online safety"), "when education, attendance, peer harm, online safety, safeguarding or SEND support links to the concern."),
            MultiAgencyRoute("health", "health / NHS 111 / GP / emergency services", ("health", "injury", "medical", "medication", "intoxicated", "overdose", "self-harm", "unwell", "pregnancy"), "when physical health, medication, intoxication, injury, overdose, self-harm or urgent health advice may be relevant."),
            MultiAgencyRoute("camhs", "CAMHS / emotional wellbeing support", ("camhs", "mental health", "suicide", "self-harm", "low mood", "panic", "trauma", "emotional wellbeing"), "when emotional wellbeing, self-harm, trauma responses or mental health support may need professional discussion."),
            MultiAgencyRoute("police", "police", ("police", "crime", "assault", "weapon", "unknown adult", "vehicle", "missing", "exploitation", "sexual harm", "county lines"), "when immediate risk, crime, exploitation, missing episode, unknown adult/vehicle or emergency safeguarding may be relevant."),
            MultiAgencyRoute("lado", "LADO / designated officer", ("lado", "allegation against staff", "staff member", "position of trust", "adult harmed", "inappropriate staff"), "only where an allegation or concern relates to an adult in a position of trust.", ("Do not suggest LADO for peer risk or child behaviour unless an adult-position-of-trust concern exists.",)),
            MultiAgencyRoute("parent_pr", "parent / person with parental responsibility", ("parent", "pr", "family", "contact", "family time", "placement authority"), "where local policy, legal status, care plan and the child's welfare indicate updates or consultation may be needed."),
            MultiAgencyRoute("advocate", "advocate / independent visitor", ("advocacy", "advocate", "complaint", "not listened", "rights", "voice", "wishes", "feelings"), "where the child may need independent help to be heard, complain, understand rights or express wishes and feelings."),
            MultiAgencyRoute("edt", "EDT / out-of-hours local authority route", ("edt", "out of hours", "night", "weekend", "urgent social care"), "where urgent local authority advice may be needed outside normal working hours."),
        )


orb_multi_agency_intelligence_service = OrbMultiAgencyIntelligenceService()
