from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class ResidentialBrainDomain:
    id: str
    title: str
    purpose: str
    triggers: tuple[str, ...]
    adult_needs_to_know: tuple[str, ...]
    answer_lens: tuple[str, ...]
    evidence_questions: tuple[str, ...] = field(default_factory=tuple)
    boundaries: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbResidentialBrainCatalogService:
    """Deep residential children's homes cognition catalogue for standalone ORB.

    This is not a live-record service. It is a sector knowledge map that helps ORB
    respond like a capable adult-facing copilot for Ofsted-regulated children's homes.
    """

    def __init__(self) -> None:
        self.domains = self._build_domains()

    def all_domains(self) -> list[dict[str, Any]]:
        return [domain.to_dict() for domain in self.domains.values()]

    def match_domains(self, message: str, *, mode: str | None = None, limit: int = 8) -> list[ResidentialBrainDomain]:
        lower = str(message or "").lower()
        mode_lower = str(mode or "").lower()
        scored: list[tuple[int, ResidentialBrainDomain]] = []
        for domain in self.domains.values():
            score = 0
            for trigger in domain.triggers:
                if trigger in lower:
                    score += 2
                if trigger in mode_lower:
                    score += 1
            if domain.id == "general_shift_support" and not scored:
                score += 1
            if score > 0:
                scored.append((score, domain))
        scored.sort(key=lambda item: (-item[0], item[1].title))
        return [domain for _, domain in scored[:limit]]

    def prompt_addendum(self, message: str, *, mode: str | None = None) -> str:
        domains = self.match_domains(message, mode=mode, limit=6)
        if not domains:
            domains = [self.domains["general_shift_support"]]
        lines = ["Residential brain catalogue guidance:"]
        for domain in domains:
            lines.append(f"- {domain.title}: {domain.purpose}")
            if domain.adult_needs_to_know:
                lines.append("  Adult needs to know: " + "; ".join(domain.adult_needs_to_know[:5]))
            if domain.answer_lens:
                lines.append("  Answer lens: " + "; ".join(domain.answer_lens[:5]))
            if domain.evidence_questions:
                lines.append("  Evidence questions: " + "; ".join(domain.evidence_questions[:4]))
            if domain.boundaries:
                lines.append("  Boundaries: " + "; ".join(domain.boundaries[:3]))
        return "\n".join(lines)

    def context_payload(self, message: str, *, mode: str | None = None) -> dict[str, Any]:
        return {
            "matched_domains": [domain.to_dict() for domain in self.match_domains(message, mode=mode, limit=8)],
            "catalogue_version": "standalone-residential-brain-catalog-v1",
        }

    def _build_domains(self) -> dict[str, ResidentialBrainDomain]:
        items = [
            ResidentialBrainDomain(
                id="general_shift_support",
                title="General adult-on-shift support",
                purpose="Help any adult in a children's home think clearly, safely and practically during or after a shift.",
                triggers=("shift", "what should i do", "help", "not sure", "advice", "on shift"),
                adult_needs_to_know=(
                    "What matters most right now is safety, calm thinking and clear communication.",
                    "Adults need practical next steps, not abstract theory.",
                    "Good practice should be calm, boundaried, child-centred and evidence-aware.",
                    "If risk is immediate, local safeguarding and emergency procedures override AI guidance.",
                ),
                answer_lens=(
                    "Start with the safest practical next step.",
                    "Use plain language suitable for a busy shift.",
                    "Separate immediate action from later reflection and recording.",
                ),
                evidence_questions=("What happened?", "Who knows?", "What needs recording?", "What cannot wait?"),
            ),
            ResidentialBrainDomain(
                id="allegations_lado_staff_conduct",
                title="Allegations, LADO and staff conduct",
                purpose="Support careful thinking when an allegation, low-level concern, complaint or staff conduct issue is raised.",
                triggers=("allegation", "lado", "staff conduct", "accused", "complaint about staff", "inappropriate", "low-level concern"),
                adult_needs_to_know=(
                    "Allegations require neutrality, prompt reporting and procedural fairness.",
                    "Adults should avoid investigating informally or asking leading questions.",
                    "The child must be protected while the adult is treated fairly and confidentiality is maintained.",
                    "LADO/local procedures may be relevant where an adult may have harmed, posed risk of harm, committed an offence or behaved in a way indicating unsuitability.",
                    "Recording should separate what was said, observed, done and escalated.",
                ),
                answer_lens=(
                    "Differentiate allegation, complaint, concern, low-level concern and conduct issue where helpful.",
                    "Prioritise immediate safety, notification and preservation of evidence.",
                    "Do not decide whether the allegation is true.",
                    "Emphasise manager/DSL/LADO consultation under local procedures.",
                ),
                evidence_questions=(
                    "What exactly was alleged and by whom?",
                    "When and where did it reportedly happen?",
                    "What immediate protective action was taken?",
                    "Who has been informed and when?",
                ),
                boundaries=("Do not determine guilt or thresholds.", "Do not advise informal resolution where safeguarding procedures are needed."),
            ),
            ResidentialBrainDomain(
                id="missing_from_care",
                title="Missing from care and return-home thinking",
                purpose="Help adults respond to missing episodes, unauthorised absence, return-home support and repeated patterns.",
                triggers=("missing", "absent", "unauthorised", "rhi", "return home", "away from home", "location unknown"),
                adult_needs_to_know=(
                    "The response should consider immediate safety, known risk, vulnerability and exploitation indicators.",
                    "Return conversations need curiosity, warmth and non-punitive listening.",
                    "Repeated missing episodes should trigger pattern thinking, risk review and multi-agency consideration.",
                    "Evidence should show actions taken, who was informed, return time, presentation, child voice and follow-up.",
                ),
                answer_lens=("Immediate safety first.", "Think pattern, trigger, pull factor and protective relationship.", "Avoid blame-based wording."),
                evidence_questions=("When was the child last seen?", "Who was informed?", "What were the known risks?", "What did the child say on return?"),
            ),
            ResidentialBrainDomain(
                id="restraint_physical_intervention",
                title="Restraint, physical intervention and post-incident repair",
                purpose="Support adults to think safely about restraint, debrief, recording, proportionality and repair.",
                triggers=("restraint", "physical intervention", "held", "intervention", "restrictive", "guide away", "debrief"),
                adult_needs_to_know=(
                    "Physical intervention must be necessary, proportionate, recorded clearly and reviewed.",
                    "The child and staff need debrief, emotional repair and learning, not just form completion.",
                    "Records should show antecedents, risks, alternatives tried, duration, injury checks, debrief and manager oversight.",
                    "Repeated restraint should trigger behaviour support and risk-plan review.",
                ),
                answer_lens=("Focus on necessity, proportionality, prevention and repair.", "Do not normalise restrictive practice.", "Look for learning and reduction."),
                evidence_questions=("What risk was being prevented?", "What alternatives were tried?", "Was anyone injured?", "What repair happened afterwards?"),
            ),
            ResidentialBrainDomain(
                id="recording_quality_child_voice",
                title="Recording quality and child voice",
                purpose="Help staff write records that are factual, child-centred, professional and useful for review.",
                triggers=("record", "recording", "daily note", "write this", "wording", "incident report", "log", "child voice", "chronology"),
                adult_needs_to_know=(
                    "A good record shows what happened, what adults did, what the child communicated and what changed afterwards.",
                    "Avoid judgemental labels such as attention seeking, manipulative, naughty or non-compliant.",
                    "Child voice can be words, choices, presentation, behaviour, wishes, feelings or observed communication.",
                    "Inspection evidence support shows impact, follow-up and manager oversight where needed.",
                ),
                answer_lens=("Rewrite with factual sequence.", "Add child voice and adult response.", "Add outcome and next steps."),
                evidence_questions=("What did the child say or show?", "What did staff do?", "What changed?", "What follow-up is needed?"),
            ),
            ResidentialBrainDomain(
                id="therapeutic_practice",
                title="Therapeutic, trauma-informed and relational practice",
                purpose="Help adults understand behaviour as communication and respond with calm, relational, repair-focused practice.",
                triggers=("trauma", "therapeutic", "pace", "attachment", "shame", "repair", "co-regulation", "dysregulated", "behaviour", "meltdown"),
                adult_needs_to_know=(
                    "Behaviour often communicates need, fear, shame, overwhelm, control, sensory distress or relational rupture.",
                    "Adults should think connection before correction where safe.",
                    "PACE-style curiosity, empathy and acceptance can reduce shame and support repair.",
                    "Therapeutic practice still needs boundaries, safety and accountability.",
                ),
                answer_lens=("Name possible need without diagnosing.", "Offer co-regulation and repair steps.", "Use shame-sensitive language."),
                evidence_questions=("What happened before the behaviour?", "What helped the child regulate?", "Was there repair?", "What can adults learn?"),
            ),
            ResidentialBrainDomain(
                id="ofsted_sccif_evidence",
                title="Ofsted, SCCIF and evidence thinking",
                purpose="Help adults think about evidence, lived experience, leadership impact and Inspection evidence preparation.",
                triggers=("ofsted", "sccif", "inspection", "reg 44", "reg 45", "quality standard", "evidence", "inspector"),
                adult_needs_to_know=(
                    "Inspectors look for the lived experience and progress of children, help and protection, and leadership impact.",
                    "Evidence must show action, impact and learning, not just that a form exists.",
                    "Reg 44 and Reg 45 should connect findings to action and improvement.",
                    "ORB must not predict grades but can help prepare evidence and reflection.",
                ),
                answer_lens=("Ask what evidence shows impact.", "Map practice to SCCIF themes.", "Highlight gaps before inspection."),
                evidence_questions=("Where is the evidence?", "What changed for the child?", "Who reviewed it?", "What learning followed?"),
                boundaries=("Do not predict Ofsted outcomes.",),
            ),
            ResidentialBrainDomain(
                id="leadership_governance_drift",
                title="Leadership, governance and drift detection",
                purpose="Help managers and staff notice drift, weak oversight, repeated patterns and action gaps.",
                triggers=("manager", "leadership", "governance", "oversight", "drift", "audit", "action plan", "quality assurance", "sign off"),
                adult_needs_to_know=(
                    "Strong homes notice patterns early and evidence what changed because leaders acted.",
                    "Drift appears when incidents repeat, actions remain open, records lack review or staff practice varies.",
                    "Managers need concise intelligence: risk, evidence, pattern, action, owner, impact.",
                ),
                answer_lens=("Identify pattern and oversight need.", "Suggest review questions.", "Translate into manager action."),
                evidence_questions=("What has repeated?", "What action is open?", "Who owns it?", "How will impact be checked?"),
            ),
            ResidentialBrainDomain(
                id="staff_wellbeing_team_culture",
                title="Staff wellbeing, debrief and team culture",
                purpose="Support adults after difficult shifts and help teams maintain reflective, safe and emotionally available practice.",
                triggers=("wellbeing", "burnout", "stress", "team", "culture", "debrief", "difficult shift", "upset", "confidence", "supervision"),
                adult_needs_to_know=(
                    "Staff emotional state affects the emotional climate of the home.",
                    "Debrief should support accountability, learning and emotional processing.",
                    "Reflective supervision should connect wellbeing, practice, safeguarding and development.",
                    "A tired or shame-based team can unintentionally become punitive or inconsistent.",
                ),
                answer_lens=("Validate the adult without removing accountability.", "Offer debrief structure.", "Focus on learning and support."),
                evidence_questions=("Was there a debrief?", "What did staff learn?", "What support is needed?", "What might children have experienced?"),
            ),
            ResidentialBrainDomain(
                id="online_harm_contextual_safeguarding",
                title="Online harm and contextual safeguarding",
                purpose="Help adults think about phones, social media, exploitation, peers, locations and modern safeguarding risks.",
                triggers=("online", "phone", "device", "snapchat", "tiktok", "instagram", "location", "grooming", "county lines", "peer risk", "image sharing"),
                adult_needs_to_know=(
                    "Risk may sit outside the home: peers, devices, locations, adults, social media and community context.",
                    "Device issues are often safeguarding and relational issues, not just rule-breaking.",
                    "Adults should think curiosity, safety planning, intelligence sharing and child voice.",
                ),
                answer_lens=("Map online/offline risk.", "Avoid punishment-only responses.", "Consider exploitation indicators."),
                evidence_questions=("Who is involved?", "What platforms or locations matter?", "What has changed?", "Who needs to know?"),
            ),
            ResidentialBrainDomain(
                id="admissions_transitions_matching",
                title="Admissions, transitions, matching and placement stability",
                purpose="Help adults think about the impact of moves, matching, endings, belonging and placement stability.",
                triggers=("admission", "move in", "move out", "transition", "placement breakdown", "matching", "discharge", "settling", "belonging"),
                adult_needs_to_know=(
                    "Transitions can activate grief, fear, control needs and testing of relationships.",
                    "Matching should consider risk, peer mix, staff skill, environment and emotional readiness.",
                    "Good transition evidence shows planning, child voice, preparation, risk review and emotional support.",
                ),
                answer_lens=("Think emotional impact and stability.", "Consider matching and peer dynamics.", "Evidence preparation and review."),
                evidence_questions=("What was planned?", "What did the child understand?", "What risks changed?", "How are relationships being built?"),
            ),
            ResidentialBrainDomain(
                id="rights_identity_equality",
                title="Rights, identity, equality and belonging",
                purpose="Help adults uphold rights, identity, culture, relationships, advocacy and voice.",
                triggers=("rights", "identity", "culture", "religion", "race", "equality", "advocacy", "complaint", "voice", "belonging", "family time"),
                adult_needs_to_know=(
                    "Children should feel heard, respected and able to influence their care where safe.",
                    "Identity and belonging are safeguarding and wellbeing issues, not optional extras.",
                    "Complaints and advocacy should be understood as voice, not inconvenience.",
                ),
                answer_lens=("Bring child voice forward.", "Consider identity and power.", "Support rights and advocacy."),
                evidence_questions=("What does the child want?", "How was their identity supported?", "Were they offered advocacy?", "What changed because they spoke?"),
            ),
        ]
        return {item.id: item for item in items}


orb_residential_brain_catalog_service = OrbResidentialBrainCatalogService()
