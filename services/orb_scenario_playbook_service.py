from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class ScenarioPlaybook:
    id: str
    topic: str
    trigger_terms: tuple[str, ...]
    labels: tuple[str, ...]
    required_sections: tuple[str, ...]
    must_include: tuple[str, ...]
    must_avoid: tuple[str, ...]
    recommended_vaults: tuple[str, ...]
    professional_boundary: str
    escalation_prompts: tuple[str, ...]
    recording_requirements: tuple[str, ...]
    opening_anchor: str
    depth_level: str = "critical"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


LIVE_INCIDENT_TRIGGERS: tuple[str, ...] = (
    "right now",
    "about to",
    "outside",
    "car has pulled up",
    "getting into a car",
    "trying to leave",
    "running away",
    "can i physically stop",
    "can i restrain",
    "can i block",
    "can i lock",
    "unknown adult",
    "older boyfriend",
    "waiting outside",
    "i need to stop her",
    "i need to stop him",
    "going missing now",
    "is leaving now",
    "leaving now",
    "running out",
    "out the door now",
)


class OrbScenarioPlaybookService:
    """Maps live and high-risk residential scenarios to structured ORB playbooks.

    Playbooks override broad topic routing so ORB answers with urgent, lawful,
    proportionate guidance rather than generic safeguarding summaries.
    """

    def __init__(self) -> None:
        self.playbooks = self._build_playbooks()
        self._by_id = {p.id: p for p in self.playbooks}

    def detect_playbook(self, message: str) -> ScenarioPlaybook | None:
        text = str(message or "").lower()
        if not text.strip():
            return None
        best: ScenarioPlaybook | None = None
        best_score = 0
        best_specificity = 0
        for playbook in self.playbooks:
            matched = [term for term in playbook.trigger_terms if term in text]
            score = len(matched)
            specificity = max((len(term) for term in matched), default=0)
            if score > best_score or (score == best_score and specificity > best_specificity):
                best_score = score
                best_specificity = specificity
                best = playbook
        if best_score == 0:
            return None
        return best

    def is_live_incident(self, message: str) -> bool:
        text = str(message or "").lower()
        return any(term in text for term in LIVE_INCIDENT_TRIGGERS)

    def detect_topic(self, message: str) -> str | None:
        playbook = self.detect_playbook(message)
        if playbook:
            return playbook.topic
        if self.is_live_incident(message):
            return "live_safeguarding_incident"
        return None

    def get_playbook(self, playbook_id: str) -> ScenarioPlaybook | None:
        return self._by_id.get(playbook_id)

    def prompt_block(self, message: str) -> str:
        playbook = self.detect_playbook(message)
        if not playbook:
            return ""
        lines = [
            "Scenario playbook active (overrides generic topic summaries):",
            f"- Playbook: {playbook.id}",
            f"- Topic: {playbook.topic}",
            f"- Depth: {playbook.depth_level}",
            "- Required markdown sections:",
        ]
        for section in playbook.required_sections:
            lines.append(f"  - {section}")
        lines.extend(["- Must include in the answer:"])
        for item in playbook.must_include:
            lines.append(f"  - {item}")
        lines.extend(["- Must avoid:"])
        for item in playbook.must_avoid:
            lines.append(f"  - {item}")
        lines.extend(
            [
                f"- Opening anchor: {playbook.opening_anchor}",
                f"- Professional boundary: {playbook.professional_boundary}",
                "- Escalation prompts:",
            ]
        )
        for item in playbook.escalation_prompts:
            lines.append(f"  - {item}")
        lines.extend(["- Recording requirements:"])
        for item in playbook.recording_requirements:
            lines.append(f"  - {item}")
        lines.extend(["- Recommended vault domains:"])
        for vault in playbook.recommended_vaults:
            lines.append(f"  - {vault}")
        return "\n".join(lines)

    def routing_metadata(self, message: str) -> dict[str, Any]:
        playbook = self.detect_playbook(message)
        if not playbook:
            topic = self.detect_topic(message)
            if not topic:
                return {}
            return {"topic": topic, "playbook_id": None, "depth_level": "critical"}
        return {
            "topic": playbook.topic,
            "playbook_id": playbook.id,
            "playbook_labels": list(playbook.labels),
            "vault_domains": list(playbook.recommended_vaults),
            "depth_level": playbook.depth_level,
            "cognition_display_labels": list(playbook.labels),
        }

    def _build_playbooks(self) -> list[ScenarioPlaybook]:
        car_pickup = ScenarioPlaybook(
            id="unknown_vehicle_pickup",
            topic="live_safeguarding_incident",
            trigger_terms=(
                "car has pulled up",
                "getting into a car",
                "get into it",
                "get into the car",
                "pulled up and",
                "about to get into",
                "unknown vehicle",
                "unknown car",
                "into the car",
                "into a car",
            ),
            labels=(
                "Immediate safeguarding",
                "Exploitation risk",
                "Missing from home",
                "Restrictive practice",
            ),
            required_sections=(
                "## Immediate priority",
                "## Before physical intervention",
                "## When physical intervention may be considered",
                "## What to do if she gets into the car",
                "## What information to capture",
                "## Who to contact",
                "## What to record afterwards",
                "## Professional boundary",
            ),
            must_include=(
                "Try to engage and delay verbally; use her name calmly.",
                "Ask who the person is and where she is going.",
                "Assess known CSE/CCE/missing risk from care plan and chronology.",
                "Alert manager/DSL immediately; another staff member should call police if immediate risk.",
                "Record car registration, make/model, colour, driver description, direction of travel.",
                "Do not put staff at unsafe risk by standing in front of a moving vehicle.",
                "Do not use force simply because she is leaving or staff disagree with her choice.",
                "Physical intervention only if immediate risk of harm, lawful, necessary, proportionate, least restrictive, trained and policy-supported.",
                "Consider care plan, risk assessment, legal status, restrictions and court orders.",
                "Treat as missing/attempted missing if she leaves; follow procedure.",
                "Notify social worker/police/manager as per procedure.",
                "Record rationale, actions, who was informed, child's words and dynamic risk assessment.",
                "Manager review afterwards.",
                "Age-17 autonomy: rights and wishes matter; safeguarding risk does not disappear because of age.",
            ),
            must_avoid=(
                "Blanket yes — you can physically stop her.",
                "Blanket no — you must never touch her.",
                "Encouraging unlawful restraint.",
                "Ignoring 17-year-old autonomy.",
                "Ignoring exploitation risk.",
                "Ignoring staff safety.",
                "Ignoring legal status/care plan.",
            ),
            recommended_vaults=(
                "Immediate Safeguarding Vault",
                "Exploitation / CSE / CCE Vault",
                "Unknown Adult / Vehicle Risk Vault",
                "Physical Intervention / Lawful Restriction Vault",
                "Age 16–17 Autonomy and Rights Vault",
                "Missing From Home Vault",
                "Police / Emergency Escalation Vault",
                "Dynamic Risk Assessment Vault",
            ),
            professional_boundary=(
                "ORB cannot decide the threshold for physical intervention; follow the home's safeguarding, "
                "missing-from-care and physical intervention procedures and seek manager/police/social work advice urgently."
            ),
            escalation_prompts=(
                "Call police now if immediate risk, unknown adult, exploitation/coercion or unsafe vehicle.",
                "Call manager/DSL immediately.",
                "Trigger missing procedure if she leaves.",
            ),
            recording_requirements=(
                "Child's words, staff actions, dynamic risk assessment, vehicle details, who was informed, "
                "rationale for intervention or decision not to intervene, manager review.",
            ),
            opening_anchor=(
                "This is a live safeguarding situation. The question is not simply whether you can physically stop her; "
                "it is whether there is an immediate risk of harm and what the least restrictive, lawful and proportionate "
                "action is right now."
            ),
        )

        physical_stop = ScenarioPlaybook(
            id="can_i_physically_stop_child",
            topic="live_safeguarding_incident",
            trigger_terms=(
                "can i physically stop",
                "can i restrain",
                "can i grab",
                "can i block the door",
                "can i stop them leaving",
                "can i hold them",
                "can i lock the door",
                                "physically stop him",
                "physically stop her",
            ),
            labels=(
                "Restrictive practice",
                "Immediate safeguarding",
                "Recording quality",
                "Leadership oversight",
            ),
            required_sections=(
                "## Immediate risk assessment",
                "## Alternatives before physical contact",
                "## When physical intervention may be considered",
                "## Movement restriction / locking / blocking",
                "## Staff safety and dignity",
                "## Escalation and recording",
                "## Professional boundary",
            ),
            must_include=(
                "Immediate risk of harm, necessity, proportionality, least restrictive option.",
                "Dignity, age and understanding, care plan/risk assessment.",
                "Training, policy, legal authority, staff safety.",
                "Alternatives first: verbal engagement, positioning, distraction, trusted relationship, manager escalation.",
                "Recording, manager review, post-incident debrief.",
            ),
            must_avoid=(
                "Blanket permission to restrain.",
                "Blanket prohibition without exploring immediate risk.",
                "Encouraging unlawful locking or deprivation of liberty.",
            ),
            recommended_vaults=(
                "Physical Intervention / Lawful Restriction Vault",
                "Deprivation of Liberty / Movement Restriction Vault",
                "Immediate Safeguarding Vault",
                "Dynamic Risk Assessment Vault",
                "Recording Quality Vault",
            ),
            professional_boundary=(
                "Physical intervention and movement restriction must follow policy, training and lawful authority; "
                "ORB cannot authorise restraint for you."
            ),
            escalation_prompts=(
                "Alert manager/DSL; call police/ambulance if immediate risk.",
            ),
            recording_requirements=(
                "Antecedent, alternatives tried, rationale, duration, injury check, debrief, manager review.",
            ),
            opening_anchor=(
                "This needs immediate professional judgement about risk, lawfulness and the least restrictive action — "
                "not a simple yes or no about physical contact."
            ),
        )

        leaving_now = ScenarioPlaybook(
            id="child_leaving_now",
            topic="live_safeguarding_incident",
            trigger_terms=(
                "trying to leave",
                "running out",
                "out the door now",
                "is leaving now",
                "leaving now",
                "running away",
            ),
            labels=(
                "Immediate safeguarding",
                "Missing from home",
                "Restrictive practice",
            ),
            required_sections=(
                "## Immediate priority",
                "## Verbal engagement and delay",
                "## Physical intervention threshold",
                "## If they leave",
                "## Who to contact",
                "## Recording",
                "## Professional boundary",
            ),
            must_include=(
                "Calm verbal engagement; do not escalate unnecessarily.",
                "Alert manager; consider police if immediate risk.",
                "Missing procedure if they leave.",
                "Do not block a moving vehicle or create unsafe confrontation.",
            ),
            must_avoid=("Telling staff to forcibly detain without risk assessment.",),
            recommended_vaults=(
                "Immediate Safeguarding Vault",
                "Missing From Home Vault",
                "Physical Intervention / Lawful Restriction Vault",
                "Police / Emergency Escalation Vault",
            ),
            professional_boundary="Follow missing-from-care and physical intervention policy; seek manager advice.",
            escalation_prompts=("Manager/DSL immediately; police if immediate risk.",),
            recording_requirements=("Chronology, child's words, actions taken, agencies informed.",),
            opening_anchor="This is a live safeguarding and missing-risk situation — act calmly, escalate early, record clearly.",
        )

        playbooks = [
            car_pickup,
            physical_stop,
            leaving_now,
            self._cse_contact(),
            self._county_lines(),
            self._missing_now(),
            self._return_missing(),
            self._self_harm_now(),
            self._intoxicated(),
            self._weapon(),
            self._unauthorised_visitor(),
            self._parent_unplanned(),
            self._refuses_medication(),
            self._medication_error(),
            self._restraint_review(),
            self._allegation_staff(),
            self._staff_loses_control(),
            self._room_search(),
            self._phone_confiscation(),
            self._disclose_assault(),
            self._pregnant(),
            self._online_harm(),
            self._peer_assault(),
            self._police_at_home(),
            self._refuses_school(),
            self._family_time_distress(),
            self._unknown_adult_outside(),
            self._older_boyfriend(),
        ]
        return playbooks

    def _cse_contact(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="suspected_cse_contact",
            topic="exploitation",
            trigger_terms=("suspected cse", "sexual exploitation", "older boyfriend", "grooming", "sex for"),
            labels=("Exploitation risk", "Safeguarding", "Recording quality", "Leadership oversight"),
            vaults=("Exploitation / CSE / CCE Vault", "Safeguarding Vault", "Age 16–17 Autonomy and Rights Vault"),
            opening="This may indicate child sexual exploitation — think contextual safeguarding, chronology and multi-agency escalation.",
        )

    def _county_lines(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="suspected_county_lines_pickup",
            topic="exploitation",
            trigger_terms=("county lines", "drug run", "debt bondage", "line holder", "cuckoo"),
            labels=("Exploitation risk", "Immediate safeguarding", "Police escalation"),
            vaults=("Exploitation / CSE / CCE Vault", "Substance / Intoxication Vault", "Police / Emergency Escalation Vault"),
            opening="Suspected criminal exploitation needs immediate safeguarding thinking and police/social work routes where indicated.",
        )

    def _missing_now(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="missing_now",
            topic="live_safeguarding_incident",
            trigger_terms=("going missing now", "missing now", "absconding now"),
            labels=("Missing from home", "Immediate safeguarding", "Police escalation"),
            vaults=("Missing From Home Vault", "Immediate Safeguarding Vault", "Police / Emergency Escalation Vault"),
            opening="Treat as an active missing episode — welfare, police notification and chronology matter immediately.",
        )

    def _return_missing(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="return_from_missing",
            topic="missing",
            trigger_terms=("returned from missing", "came back missing", "found and returned", "return interview"),
            labels=("Missing from home", "Safeguarding", "Recording quality"),
            vaults=("Missing From Home Vault", "Exploitation / CSE / CCE Vault", "Recording Quality Vault"),
            opening="The key is immediate welfare on return and understanding push/pull factors — not only that they are back.",
        )

    def _self_harm_now(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="self_harm_now",
            topic="self_harm",
            trigger_terms=(
                "hurt themselves now",
                "going to hurt themselves",
                "self harm now",
                "hurt themselves right now",
                "going to hurt themselves right now",
                "suicidal right now",
                "self-harmed",
                "hurt themselves",
                "kill myself now",
            ),
            labels=("Immediate safeguarding", "Self-harm crisis", "Recording quality"),
            vaults=("Self-Harm / Mental Health Crisis Vault", "Immediate Safeguarding Vault", "Police / Emergency Escalation Vault"),
            opening="This is an immediate mental health and safeguarding crisis — safety first, then assessment and escalation.",
        )

    def _intoxicated(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="intoxicated_child",
            topic="live_safeguarding_incident",
            trigger_terms=("appears intoxicated", "drunk", "high on", "substances now", "taken drugs"),
            labels=("Immediate safeguarding", "Substance / intoxication", "Recording quality"),
            vaults=("Substance / Intoxication Vault", "Immediate Safeguarding Vault", "Medication/Health Vault"),
            opening="Intoxication is a health and safeguarding event — monitor, escalate medically if needed, record and review exploitation links.",
        )

    def _weapon(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="weapon_in_home",
            topic="live_safeguarding_incident",
            trigger_terms=("has a knife", "weapon in", "brought a blade", "has a gun", "is armed",
                "armed with"),
            labels=("Immediate safeguarding", "Violence / weapons", "Police escalation"),
            vaults=("Violence / Weapons Vault", "Immediate Safeguarding Vault", "Police / Emergency Escalation Vault"),
            opening="Weapons create immediate risk — prioritise separation, police and manager escalation; do not escalate confrontation.",
        )

    def _unauthorised_visitor(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="unauthorised_visitor",
            topic="live_safeguarding_incident",
            trigger_terms=("unauthorised visitor", "unknown person at door", "stranger at the door", "not on contact list"),
            labels=("Visitor / boundary management", "Immediate safeguarding", "Safeguarding"),
            vaults=("Visitor / Boundary Management Vault", "Unknown Adult / Vehicle Risk Vault"),
            opening="Verify identity, contact list and safeguarding risk before access; escalate if exploitation or coercion is suspected.",
        )

    def _parent_unplanned(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="parent_arrives_unplanned",
            topic="live_safeguarding_incident",
            trigger_terms=("parent arrives unplanned", "parent turned up",
                "arrived unplanned",
                "demanding to take the child", "demanding to take child", "father is here"),
            labels=("Immediate safeguarding", "Legal status / care order", "Visitor / boundary management"),
            vaults=("Legal Status / Care Order Vault", "Visitor / Boundary Management Vault", "Immediate Safeguarding Vault"),
            opening="Unplanned parental contact needs legal-status clarity, manager direction and child welfare — not ad-hoc decisions at the door.",
        )

    def _refuses_medication(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="child_refuses_medication",
            topic="medication",
            trigger_terms=("refuses medication", "won't take medication", "refusing tablets", "refusing medicine"),
            labels=("Medication / health", "Recording quality", "Leadership oversight"),
            vaults=("Medication/Health Vault", "Recording Quality Vault"),
            opening="Refusal is a health and governance event — follow MAR policy, seek advice, record and notify manager.",
        )

    def _medication_error(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="medication_error",
            topic="medication",
            trigger_terms=("medication error", "wrong dose", "dose missed", "given wrong medicine"),
            labels=("Medication / health", "Recording quality", "Leadership oversight"),
            vaults=("Medication/Health Vault", "Recording Quality Vault", "Leadership/Governance Vault"),
            opening="Medication errors are health and governance events — calm safety-first response, advice, MAR and manager review.",
        )

    def _restraint_review(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="restraint_review",
            topic="restraint",
            trigger_terms=("restraint review", "review restraint", "pattern of restraint", "repeated restraint"),
            labels=("Restrictive practice", "Leadership oversight", "Recording quality"),
            vaults=("Restrictive Practice Vault", "Recording Quality Vault", "Leadership/Governance Vault"),
            opening="Restraint reviews must examine necessity, pattern, culture and learning — not only the single event.",
        )

    def _allegation_staff(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="allegation_against_staff",
            topic="allegations",
            trigger_terms=("staff touched", "allegation against staff", "staff member grabbed",
                "staff member touched",
                "touched them inappropriately", "conduct concern staff"),
            labels=("Safeguarding", "Recording quality", "Leadership oversight", "Professional curiosity"),
            vaults=("Safeguarding Vault", "Recording Quality Vault", "Leadership/Governance Vault"),
            opening="Allegations against staff need fair process, child safety, separate accounts and LADO-thinking without deciding threshold.",
        )

    def _staff_loses_control(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="staff_loses_control",
            topic="supervision",
            trigger_terms=("staff lost control", "staff shouted", "staff swore", "staff grabbed roughly"),
            labels=("Workforce supervision", "Safeguarding", "Leadership oversight"),
            vaults=("Workforce/Supervision Vault", "Safeguarding Vault"),
            opening="Adult conduct that frightens children is a safeguarding and supervision issue — intervene, record and escalate to management.",
        )

    def _room_search(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="room_search_request",
            topic="restraint",
            trigger_terms=("search room", "search their room", "room search", "can i search"),
            labels=("Restrictive practice", "Recording quality", "Safeguarding"),
            vaults=("Deprivation of Liberty / Movement Restriction Vault", "Recording Quality Vault", "Safeguarding Vault"),
            opening="Room searches engage privacy, safeguarding and policy — lawful authority, rationale and recording matter.",
        )

    def _phone_confiscation(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="phone_confiscation_request",
            topic="restraint",
            trigger_terms=("take their phone", "confiscate phone", "remove phone", "can i take phone"),
            labels=("Restrictive practice", "Online harm", "Recording quality"),
            vaults=("Online Harm / Digital Contact Vault", "Physical Intervention / Lawful Restriction Vault"),
            opening="Phone removal can be safeguarding or rights interference — proportionality, exploitation context and policy apply.",
        )

    def _disclose_assault(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="child_discloses_assault",
            topic="allegations",
            trigger_terms=("disclosed assault", "disclosed abuse", "told me he touched", "told me she was hurt"),
            labels=("Safeguarding", "Recording quality", "Sexual harm"),
            vaults=("Safeguarding Vault", "Sexual Harm / Pregnancy / Relationship Risk Vault", "Recording Quality Vault"),
            opening="A disclosure requires calm listening, safety, accurate recording in the child's words and immediate safeguarding escalation.",
        )

    def _pregnant(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="child_says_pregnant",
            topic="allegations",
            trigger_terms=("says she is pregnant", "says he got her pregnant", "pregnancy test", "might be pregnant"),
            labels=("Sexual harm", "Safeguarding", "Recording quality"),
            vaults=("Sexual Harm / Pregnancy / Relationship Risk Vault", "Age 16–17 Autonomy and Rights Vault"),
            opening="Possible pregnancy in care raises safeguarding, health, consent and exploitation questions — escalate and record sensitively.",
        )

    def _online_harm(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="online_nude_image_or_sextortion",
            topic="exploitation",
            trigger_terms=("nude image", "sextortion", "revenge porn", "shared a nude", "blackmail online"),
            labels=("Online harm", "Exploitation risk", "Safeguarding"),
            vaults=("Online Harm / Digital Contact Vault", "Exploitation / CSE / CCE Vault"),
            opening="Online sexual harm needs immediate safeguarding, preserve evidence thinking and specialist routes — do not blame the child.",
        )

    def _peer_assault(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="peer_on_peer_assault",
            topic="allegations",
            trigger_terms=("peer assault", "another child hit", "sexual assault by another child", "peer on peer"),
            labels=("Peer-on-peer harm", "Safeguarding", "Recording quality"),
            vaults=("Peer-on-Peer Harm Vault", "Safeguarding Vault"),
            opening="Peer-on-peer harm needs separation, welfare of both children, allegations process and chronology — not minimisation.",
        )

    def _police_at_home(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="police_at_home",
            topic="live_safeguarding_incident",
            trigger_terms=("police at the home", "police are here", "officers at the door", "police arrived"),
            labels=("Police escalation", "Immediate safeguarding", "Recording quality"),
            vaults=("Police / Emergency Escalation Vault", "Immediate Safeguarding Vault"),
            opening="Police attendance needs calm cooperation, child welfare, manager involvement and accurate recording of actions and rationale.",
        )

    def _refuses_school(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="child_refuses_school",
            topic="education_health",
            trigger_terms=("refuses school", "refused school", "school refusal", "won't go to school", "refused to go to school"),
            labels=("Education", "Child experience", "Recording quality"),
            vaults=("Child Journey Vault", "Therapeutic Vault"),
            opening="School refusal is often communication of distress — explore barriers, advocacy and chronology, not only compliance.",
        )

    def _family_time_distress(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="family_time_cancelled_distress",
            topic="therapeutic",
            trigger_terms=("family time cancelled", "contact cancelled", "smashed cup", "dysregulated after contact"),
            labels=("Therapeutic reflection", "Recording quality", "Child experience"),
            vaults=("Therapeutic Vault", "Child Journey Vault"),
            opening="Cancellation and dysregulation often communicate loss and lack of control — therapeutic meaning and repair matter.",
        )

    def _unknown_adult_outside(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="unknown_adult_outside",
            topic="live_safeguarding_incident",
            trigger_terms=("unknown adult outside", "stranger outside", "man outside asking", "woman outside asking"),
            labels=("Immediate safeguarding", "Exploitation risk", "Visitor / boundary management"),
            vaults=("Unknown Adult / Vehicle Risk Vault", "Immediate Safeguarding Vault", "Visitor / Boundary Management Vault"),
            opening="An unknown adult at the home is an immediate safeguarding event — verify identity, do not allow unsupervised contact, escalate.",
        )

    def _older_boyfriend(self) -> ScenarioPlaybook:
        return self._standard_playbook(
            id="older_boyfriend_waiting",
            topic="live_safeguarding_incident",
            trigger_terms=("older boyfriend waiting", "boyfriend waiting outside", "older man waiting"),
            labels=("Exploitation risk", "Immediate safeguarding", "Age 16–17 autonomy"),
            vaults=("Exploitation / CSE / CCE Vault", "Age 16–17 Autonomy and Rights Vault", "Unknown Adult / Vehicle Risk Vault"),
            opening="An older partner waiting outside may indicate exploitation — balance autonomy with safeguarding, escalate and record.",
        )

    def _standard_playbook(
        self,
        *,
        id: str,
        topic: str,
        trigger_terms: tuple[str, ...],
        labels: tuple[str, ...],
        vaults: tuple[str, ...],
        opening: str,
    ) -> ScenarioPlaybook:
        return ScenarioPlaybook(
            id=id,
            topic=topic,
            trigger_terms=trigger_terms,
            labels=labels,
            required_sections=(
                "## Immediate priority",
                "## Safeguarding thinking",
                "## What to record",
                "## Who to contact",
                "## Professional boundary",
            ),
            must_include=(
                "Dynamic risk assessment in the moment.",
                "Manager/DSL escalation where indicated.",
                "Child voice and chronology.",
                "Local procedure and multi-agency routes.",
            ),
            must_avoid=(
                "Unsafe blanket yes/no advice.",
                "Threshold decisions presented as certain.",
                "Generic safeguarding bullet lists without practical structure.",
            ),
            recommended_vaults=vaults,
            professional_boundary="ORB supports professional judgement; follow local policy and escalate to manager/DSL/agencies.",
            escalation_prompts=("Manager/DSL; police/ambulance/EDT/social worker as risk indicates.",),
            recording_requirements=("Facts, child's words, actions, rationale, who was informed, manager review.",),
            opening_anchor=opening,
            depth_level="high" if topic not in {"live_safeguarding_incident"} else "critical",
        )


orb_scenario_playbook_service = OrbScenarioPlaybookService()
