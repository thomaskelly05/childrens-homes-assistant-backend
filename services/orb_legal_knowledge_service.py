from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class OrbLegalKnowledgeArea:
    id: str
    title: str
    purpose: str
    keywords: tuple[str, ...]
    adult_must_understand: tuple[str, ...]
    practice_implications: tuple[str, ...]
    evidence_expectations: tuple[str, ...]
    boundaries: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbLegalKnowledgeService:
    """Structured legal/regulatory knowledge map for standalone ORB.

    This is a built-in cognition map, not a substitute for current official guidance.
    It should be kept updateable through the ORB Knowledge Library and official-source ingestion.
    """

    VERSION = "orb-legal-knowledge-v1"

    UPDATE_NOTICE = (
        "Regulatory knowledge must be treated as updateable. If the user needs current wording, "
        "check the latest official GOV.UK, Ofsted, DfE and local safeguarding procedures."
    )

    def __init__(self) -> None:
        self.areas = self._build_areas()

    def match(self, message: str, *, limit: int = 8) -> list[OrbLegalKnowledgeArea]:
        lower = str(message or "").lower()
        scored: list[tuple[int, OrbLegalKnowledgeArea]] = []
        for area in self.areas.values():
            score = 0
            for keyword in area.keywords:
                if keyword in lower:
                    score += 2
            if score:
                scored.append((score, area))
        scored.sort(key=lambda item: (-item[0], item[1].title))
        return [area for _, area in scored[:limit]]

    def prompt_addendum(self, message: str) -> str:
        matches = self.match(message, limit=6)
        if not matches:
            matches = [self.areas["quality_standards"], self.areas["sccif"]]
        lines = [
            "Legal / regulatory cognition:",
            f"- Updateable knowledge notice: {self.UPDATE_NOTICE}",
        ]
        for area in matches:
            lines.append(f"- {area.title}: {area.purpose}")
            lines.append("  Adult must understand: " + "; ".join(area.adult_must_understand[:4]))
            lines.append("  Practice implications: " + "; ".join(area.practice_implications[:4]))
            lines.append("  Evidence expectations: " + "; ".join(area.evidence_expectations[:4]))
            if area.boundaries:
                lines.append("  Boundaries: " + "; ".join(area.boundaries[:3]))
        return "\n".join(lines)

    def context_payload(self, message: str) -> dict[str, Any]:
        return {
            "version": self.VERSION,
            "update_notice": self.UPDATE_NOTICE,
            "matched_areas": [area.to_dict() for area in self.match(message, limit=8)],
        }

    def _build_areas(self) -> dict[str, OrbLegalKnowledgeArea]:
        areas = [
            OrbLegalKnowledgeArea(
                id="children_homes_regulations",
                title="Children's Homes Regulations 2015",
                purpose="Core regulatory duties for registered children's homes in England.",
                keywords=("children's homes regulation", "childrens homes regulation", "regulation", "reg ", "legal", "law"),
                adult_must_understand=(
                    "Regulations create duties for how the home is managed, staffed, safeguarded and evidenced.",
                    "Adults do not need to quote every regulation on shift, but they need to know what good practice must show.",
                    "Managers must evidence oversight, learning and action, not just form completion.",
                ),
                practice_implications=(
                    "Link incidents, safeguarding concerns and plans back to risk, care planning and oversight.",
                    "Ensure significant events have review, follow-up and learning.",
                    "Keep records factual, timely and reviewable.",
                ),
                evidence_expectations=(
                    "clear record of what happened",
                    "staff response and rationale",
                    "manager oversight where required",
                    "follow-up and impact on the child",
                ),
            ),
            OrbLegalKnowledgeArea(
                id="quality_standards",
                title="Quality Standards",
                purpose="The standards describe what children should experience from the home and its staff.",
                keywords=("quality standard", "quality standards", "children's views", "positive relationships", "protection", "leadership"),
                adult_must_understand=(
                    "The standards are about the child's lived experience, not just compliance paperwork.",
                    "Records should show how adults help children make progress and feel safer.",
                    "Leadership must ensure systems improve the quality of care.",
                ),
                practice_implications=(
                    "Ask how the child experienced the care, not just what adults completed.",
                    "Use child-centred and relational language.",
                    "Evidence warmth, safety, progress, stability and learning.",
                ),
                evidence_expectations=(
                    "child voice",
                    "evidence of progress or barriers",
                    "staff support and response",
                    "impact of leadership action",
                ),
            ),
            OrbLegalKnowledgeArea(
                id="sccif",
                title="Ofsted SCCIF children’s homes framework",
                purpose="Inspection lens focused on children’s experiences, help and protection, and leadership impact.",
                keywords=("sccif", "ofsted", "inspection", "inspector", "judgement", "experiences and progress"),
                adult_must_understand=(
                    "Inspection looks at what life is like for children and whether leaders make a difference.",
                    "Evidence should demonstrate impact, consistency and improvement.",
                    "ORB must not predict grades, but can help prepare evidence and reflective thinking.",
                ),
                practice_implications=(
                    "Frame answers around child experience, safety, progress and leadership oversight.",
                    "Identify whether evidence is strong, weak, missing or only activity-based.",
                    "Prepare adults to explain why they acted and what changed.",
                ),
                evidence_expectations=(
                    "child lived experience",
                    "help and protection evidence",
                    "leadership action and impact",
                    "learning from incidents, complaints and patterns",
                ),
                boundaries=("Do not predict inspection grades.", "Do not claim current Ofsted wording unless sourced."),
            ),
            OrbLegalKnowledgeArea(
                id="reg_44",
                title="Regulation 44 independent visits",
                purpose="Independent visitor scrutiny of how the home safeguards and promotes children’s welfare.",
                keywords=("reg 44", "regulation 44", "independent visitor", "monthly visit", "visitor"),
                adult_must_understand=(
                    "Reg 44 should test the quality and safety of care, not just sample files.",
                    "Findings should lead to action and learning where needed.",
                    "Repeated findings may indicate drift or weak governance.",
                ),
                practice_implications=(
                    "Connect visitor findings to actions, owners and impact review.",
                    "Use Reg 44 feedback to prepare for inspection and improve practice.",
                    "Check whether children and staff voices are visible.",
                ),
                evidence_expectations=("visitor findings", "provider response", "action closure", "impact review"),
            ),
            OrbLegalKnowledgeArea(
                id="reg_45",
                title="Regulation 45 quality of care review",
                purpose="Registered person review of the quality of care, including feedback, patterns and improvement.",
                keywords=("reg 45", "regulation 45", "quality of care review", "quality review", "six monthly"),
                adult_must_understand=(
                    "Reg 45 should be honest, evaluative and improvement-focused.",
                    "It should pull together evidence, feedback, incidents, complaints, patterns and impact.",
                    "It should not be a bland compliance statement.",
                ),
                practice_implications=(
                    "Look for trends, repeated themes and whether children are safer or making progress.",
                    "Connect findings to service improvement.",
                    "Include children, staff and stakeholder feedback where appropriate.",
                ),
                evidence_expectations=("analysis of patterns", "feedback", "improvement actions", "impact of previous actions"),
            ),
            OrbLegalKnowledgeArea(
                id="safeguarding_working_together",
                title="Safeguarding and Working Together principles",
                purpose="Shared responsibility to safeguard children through timely, proportionate, multi-agency action.",
                keywords=("safeguarding", "working together", "child protection", "abuse", "neglect", "harm", "threshold"),
                adult_must_understand=(
                    "Safeguarding is not just reporting; it includes noticing, recording, escalating and following through.",
                    "Threshold decisions sit with safeguarding processes and agencies, not ORB.",
                    "Immediate safety and local procedures come first.",
                ),
                practice_implications=(
                    "Separate fact, concern, risk, missing information and action.",
                    "Record who was informed and what advice was given.",
                    "Follow up to check the child is safer, not just that a referral was made.",
                ),
                evidence_expectations=("chronology", "referral/escalation record", "safety plan", "manager oversight", "follow-up"),
                boundaries=("Do not decide safeguarding thresholds.", "Do not replace DSL, LADO, social worker, police or local procedures."),
            ),
            OrbLegalKnowledgeArea(
                id="allegations_lado",
                title="Allegations and LADO/local procedures",
                purpose="Safe response to allegations or concerns about adults working with children.",
                keywords=("allegation", "lado", "staff conduct", "adult harmed", "low-level concern", "complaint about staff"),
                adult_must_understand=(
                    "Allegations require prompt reporting, neutrality and procedural fairness.",
                    "Adults should not investigate informally or ask leading questions.",
                    "The child’s safety and the adult’s procedural fairness both matter.",
                ),
                practice_implications=(
                    "Preserve evidence and record exact words where possible.",
                    "Escalate to manager/DSL and consider LADO under local procedures.",
                    "Manage confidentiality and avoid gossip or contamination of accounts.",
                ),
                evidence_expectations=("exact concern/allegation", "immediate action", "who was informed", "LADO/manager advice", "safety planning"),
                boundaries=("Do not decide whether the allegation is true.", "Do not tell users to bypass local allegation procedures."),
            ),
            OrbLegalKnowledgeArea(
                id="notifications_reg40",
                title="Notifications and Regulation 40-style thinking",
                purpose="Understanding when significant events may need notification or external awareness.",
                keywords=("notification", "reg 40", "ofsted notification", "serious event", "notify", "significant event"),
                adult_must_understand=(
                    "Some events may require prompt notification to relevant bodies.",
                    "Managers should consider notification alongside safeguarding and internal review.",
                    "ORB can prompt consideration, not make the final notification decision.",
                ),
                practice_implications=("Check local and regulatory notification requirements.", "Record timing, rationale and manager decision.", "Link notifications to follow-up actions."),
                evidence_expectations=("notification decision", "rationale", "time sent", "recipient", "follow-up"),
                boundaries=("Do not make final notification decisions."),
            ),
            OrbLegalKnowledgeArea(
                id="safer_recruitment",
                title="Safer recruitment, supervision and workforce competence",
                purpose="Ensuring adults are suitable, supported and competent to meet children’s needs.",
                keywords=("safer recruitment", "dbs", "reference", "supervision", "probation", "training", "competence", "staffing"),
                adult_must_understand=(
                    "Safe care depends on suitable, trained and supported adults.",
                    "Supervision should include wellbeing, safeguarding, practice reflection and development.",
                    "Workforce gaps can become safeguarding and quality-of-care risks.",
                ),
                practice_implications=("Check recruitment evidence and induction.", "Use supervision to identify support needs.", "Link incidents and practice concerns to training and competence."),
                evidence_expectations=("DBS/references", "induction", "training matrix", "supervision records", "probation review"),
            ),
            OrbLegalKnowledgeArea(
                id="care_planning_placement",
                title="Placement planning, care planning and risk assessment",
                purpose="Helping adults connect day-to-day care to plans, risks and the child’s needs.",
                keywords=("placement plan", "care plan", "risk assessment", "behaviour support plan", "matching", "admission", "placement"),
                adult_must_understand=(
                    "Plans should shape practice, not sit separately from daily life.",
                    "Risk assessments need updating when patterns or significant events change.",
                    "Good planning includes child voice and multi-agency input where relevant.",
                ),
                practice_implications=("Check whether records link to plans.", "Update risk and support strategies after incidents.", "Review whether plans are actually followed."),
                evidence_expectations=("plan links", "risk updates", "child voice", "multi-agency input", "review dates"),
            ),
            OrbLegalKnowledgeArea(
                id="health_education_medication",
                title="Health, education and medication",
                purpose="Understanding day-to-day duties around children’s health, medication and learning.",
                keywords=("health", "education", "school", "college", "medication", "medicine", "refusal", "appointment"),
                adult_must_understand=(
                    "Health and education are central to progress and lived experience.",
                    "Medication and health decisions need safe recording and appropriate professional advice.",
                    "Repeated refusal or non-attendance may indicate unmet need, anxiety, relationship issues or safeguarding risk.",
                ),
                practice_implications=("Record encouragement and barriers.", "Seek health/education advice where needed.", "Identify patterns rather than treating events as isolated."),
                evidence_expectations=("appointments", "medication record", "education contact", "child voice", "follow-up actions"),
            ),
            OrbLegalKnowledgeArea(
                id="complaints_rights_advocacy",
                title="Complaints, rights and advocacy",
                purpose="Supporting children’s voice, rights, complaints and access to advocacy.",
                keywords=("complaint", "rights", "advocacy", "advocate", "voice", "wishes", "feelings", "concern raised"),
                adult_must_understand=(
                    "Complaints are often child voice and should not be treated as inconvenience.",
                    "Children should know how to complain and access advocacy.",
                    "Responses should evidence listening, action and outcome.",
                ),
                practice_implications=("Record what the child said.", "Show how adults responded.", "Evidence learning and feedback to the child."),
                evidence_expectations=("complaint record", "child voice", "response", "outcome", "learning"),
            ),
        ]
        return {area.id: area for area in areas}


orb_legal_knowledge_service = OrbLegalKnowledgeService()
