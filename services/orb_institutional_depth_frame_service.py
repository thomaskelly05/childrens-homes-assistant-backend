from __future__ import annotations

from typing import Any


class OrbInstitutionalDepthFrameService:
    """Deep reasoning frames for ORB.

    Every question gets a frame:
    - general questions get concise ChatGPT-style useful reasoning
    - residential questions get institutional residential cognition
    - high-attention residential topics get deeper RM / governance / evidence lenses

    Frames are not decisions; they are professional reasoning lenses.
    """

    def build_frame(self, *, message: str, mode: str | None = None) -> dict[str, Any]:
        text = str(message or "").lower()
        mode_text = str(mode or "").lower()
        topic = self._topic(text=text, mode_text=mode_text)
        if topic == "allegations":
            return self._allegations_frame()
        if topic == "recording":
            return self._recording_frame()
        if topic == "inspection":
            return self._inspection_frame()
        if topic == "therapeutic":
            return self._therapeutic_frame()
        if topic == "missing":
            return self._missing_frame()
        if topic == "restraint":
            return self._restraint_frame()
        if topic == "supervision":
            return self._supervision_frame()
        if topic == "leadership":
            return self._leadership_frame()
        if topic == "staffing":
            return self._staffing_frame()
        if topic == "complaints":
            return self._complaints_frame()
        if topic == "medication":
            return self._medication_frame()
        if topic == "education_health":
            return self._education_health_frame()
        if topic == "placement_planning":
            return self._placement_planning_frame()
        if topic == "indicare_product":
            return self._product_frame()
        if self._is_residential_question(text=text, mode_text=mode_text):
            return self._residential_general_frame()
        return self._general_chatgpt_frame()

    def prompt_block(self, *, message: str, mode: str | None = None) -> str:
        frame = self.build_frame(message=message, mode=mode)
        if not frame:
            return ""
        lines = [
            "Universal ORB reasoning frame active:",
            f"- Topic: {frame['topic']}",
            f"- Purpose: {frame['purpose']}",
            "- Required reasoning lenses:",
        ]
        for lens in frame["required_lenses"]:
            lines.append(f"  - {lens}")
        if frame.get("evidence_expectations"):
            lines.extend(["- Evidence expectations to include where relevant:"])
            for expectation in frame["evidence_expectations"]:
                lines.append(f"  - {expectation}")
        if frame.get("avoid"):
            lines.extend(["- Response must avoid:"])
            for avoid in frame["avoid"]:
                lines.append(f"  - {avoid}")
        lines.extend(
            [
                "- Response shape:",
                "  1. Start with the practical answer.",
                "  2. If residential, reason through the relevant professional lenses using inline anchors where appropriate.",
                "  3. Include what a strong registered manager or competent adult would think about where relevant.",
                "  4. Include evidence, recording or action expectations where relevant.",
                "  5. Include emotional/therapeutic meaning where relevant.",
                "  6. End with either a useful next step or a clear professional boundary, not a generic disclaimer.",
            ]
        )
        return "\n".join(lines)

    def _topic(self, *, text: str, mode_text: str) -> str | None:
        if any(term in text for term in ("indicare", "orb", "care companion", "os", "platform", "product")):
            return "indicare_product"
        if any(term in text for term in ("allegation", "allegations", "lado", "grabbed", "staff member", "conduct concern")):
            return "allegations"
        if any(term in text or term in mode_text for term in ("missing", "abscond", "return interview", "away from home")):
            return "missing"
        if any(term in text or term in mode_text for term in ("restraint", "physical intervention", "held", "restrictive")):
            return "restraint"
        if any(term in text or term in mode_text for term in ("record", "recording", "wording", "chronology", "daily note", "incident")):
            return "recording"
        if any(term in text or term in mode_text for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45")):
            return "inspection"
        if any(term in text or term in mode_text for term in ("therapeutic", "trauma", "behaviour", "repair", "emotion", "dysregulated")):
            return "therapeutic"
        if any(term in text or term in mode_text for term in ("supervision", "debrief", "reflective", "reflection", "staff coach")):
            return "supervision"
        if any(term in text or term in mode_text for term in ("manager", "leadership", "oversight", "governance", "audit", "ri", "responsible individual")):
            return "leadership"
        if any(term in text or term in mode_text for term in ("staffing", "rota", "agency", "workforce", "training", "safer recruitment")):
            return "staffing"
        if any(term in text or term in mode_text for term in ("complaint", "complaints", "concern from parent")):
            return "complaints"
        if any(term in text or term in mode_text for term in ("medication", "medicine", "mars", "health appointment")):
            return "medication"
        if any(term in text or term in mode_text for term in ("education", "school", "health", "therapy", "camhs")):
            return "education_health"
        if any(term in text or term in mode_text for term in ("placement", "admission", "move in", "move out", "care plan", "risk assessment")):
            return "placement_planning"
        return None

    def _is_residential_question(self, *, text: str, mode_text: str) -> bool:
        residential_terms = (
            "children's home",
            "childrens home",
            "young person",
            "looked after",
            "residential",
            "staff",
            "home",
            "child",
            "safeguard",
            "quality standard",
        )
        specialist_modes = (
            "safeguarding",
            "ofsted",
            "record",
            "therapeutic",
            "manager",
            "staff coach",
            "reg 44",
            "reg 45",
        )
        return any(term in text for term in residential_terms) or any(term in mode_text for term in specialist_modes)

    def _general_chatgpt_frame(self) -> dict[str, Any]:
        return {
            "topic": "general intelligence",
            "purpose": "Answer like a clear, capable ChatGPT-style assistant while retaining ORB's calm professional tone.",
            "required_lenses": [
                "Answer the user's actual question directly.",
                "Be practical, concise and useful.",
                "Use general knowledge unless the user asks for residential, regulatory or safeguarding framing.",
                "Do not force children's homes framing onto unrelated general questions.",
            ],
            "evidence_expectations": [],
            "avoid": [
                "Unnecessary care-sector framing for unrelated general questions.",
                "Long generic disclaimers.",
            ],
        }

    def _residential_general_frame(self) -> dict[str, Any]:
        return {
            "topic": "general residential practice",
            "purpose": "Answer through a residential children's homes lens without overcomplicating the response.",
            "required_lenses": [
                "Child experience and voice.",
                "Adult response and professional curiosity.",
                "Safeguarding awareness without threshold decisions.",
                "Recording quality and evidence expectations.",
                "Therapeutic and relational practice.",
                "Management oversight where relevant.",
            ],
            "evidence_expectations": [
                "What happened, what adults did, what changed and what needs follow-up.",
                "Child voice or lived experience where relevant.",
                "Oversight or review where the issue carries risk or governance relevance.",
            ],
            "avoid": [
                "Generic care advice with no residential operational meaning.",
                "Overstating certainty without enough context.",
            ],
        }

    def _allegations_frame(self) -> dict[str, Any]:
        return {
            "topic": "allegations / conduct concerns in residential settings",
            "purpose": "Move beyond a generic safeguarding summary into RM-level, inspection-aware, therapeutic and recording-aware reasoning.",
            "required_lenses": [
                "Immediate safety and protection lens [Reg 12].",
                "Human-led local procedure and designated officer consultation thinking [Working Together] [LADO].",
                "Leadership oversight, decision trail, supervision, learning and follow-through [Reg 13].",
                "Inspection evidence lens: timeliness, professional curiosity, child experience, leadership impact [SCCIF].",
                "Recording lens: direct account, observed facts, chronology, actions, rationale, outcome [Recording quality].",
                "Therapeutic lens: child feeling heard, emotionally safe, not blamed, and supported after disclosure or concern.",
                "Fairness lens: protect children while preserving fair process for the adult and avoiding premature conclusions.",
            ],
            "evidence_expectations": [
                "What exactly was said, seen or reported, using the child's words where appropriate.",
                "Immediate safety steps and who made them.",
                "Who was informed, when, and what advice was received.",
                "Whether medical attention, body map, witness accounts, CCTV or other factual material may be relevant.",
                "Manager rationale for actions taken and any restrictions or interim arrangements.",
                "Support offered to the child and consideration of impact on wider group or staff team.",
                "Follow-up, supervision, learning and review actions.",
            ],
            "avoid": [
                "Declaring the concern true or false.",
                "Deciding statutory thresholds.",
                "Minimising language such as only, just, attention seeking, or false allegation before review.",
                "Generic advice with no regulatory, recording, leadership or therapeutic reasoning.",
            ],
        }

    def _missing_frame(self) -> dict[str, Any]:
        return {
            "topic": "missing from home / away from placement",
            "purpose": "Reason through safety, context, return, patterns, exploitation risk and recording quality without making threshold decisions.",
            "required_lenses": [
                "Immediate safety and location planning [Reg 12].",
                "Contextual safeguarding and multi-agency information-sharing [Working Together].",
                "Patterns, repeat episodes, push/pull factors and protective relationships.",
                "Return conversation and emotional meaning.",
                "Management oversight and plan review [Reg 13].",
                "Inspection lens: timeliness, learning and impact [SCCIF].",
            ],
            "evidence_expectations": [
                "Timeline of absence, actions taken, contacts made and return details.",
                "Child's account, feelings and possible push/pull factors.",
                "Risk changes, plan updates and follow-up actions.",
                "Manager review of patterns and protective factors.",
            ],
            "avoid": [
                "Blaming or shaming the child.",
                "Treating repeated missing episodes as routine.",
            ],
        }

    def _restraint_frame(self) -> dict[str, Any]:
        return {
            "topic": "restraint / physical intervention / restrictive practice",
            "purpose": "Reason through safety, proportionality, recording, child experience, repair and oversight.",
            "required_lenses": [
                "Protection and immediate safety [Reg 12].",
                "Least restrictive, proportionate and necessary practice.",
                "Child's experience, dignity, injury, emotional impact and repair.",
                "Recording quality: antecedents, intervention, duration, rationale, outcome [Recording quality].",
                "Leadership review, debrief, learning and plan update [Reg 13].",
                "Inspection lens: patterns, reduction and culture [SCCIF].",
            ],
            "evidence_expectations": [
                "What happened before, during and after.",
                "Why intervention was necessary and what alternatives were attempted.",
                "Injury checks, child debrief, staff debrief and manager review.",
                "Learning, repair and plan changes.",
            ],
            "avoid": [
                "Justifying intervention without evidence.",
                "Ignoring emotional impact because the intervention was authorised.",
            ],
        }

    def _recording_frame(self) -> dict[str, Any]:
        return {
            "topic": "recording quality",
            "purpose": "Improve records so they are factual, child-centred, chronology-aware and useful for oversight.",
            "required_lenses": [
                "Fact versus interpretation.",
                "Child voice and lived experience.",
                "Adult response and rationale.",
                "Outcome and follow-up.",
                "Management oversight and evidence quality.",
            ],
            "evidence_expectations": [
                "What happened before, during and after.",
                "What the child said or showed.",
                "What adults did and why.",
                "What changed afterwards.",
                "What needs follow-up or review.",
            ],
            "avoid": [
                "Judgemental labels.",
                "Unsupported conclusions.",
                "Activity-only records with no impact or outcome.",
            ],
        }

    def _inspection_frame(self) -> dict[str, Any]:
        return {
            "topic": "inspection and governance reasoning",
            "purpose": "Translate the issue into evidence, child experience, leadership and improvement thinking.",
            "required_lenses": [
                "Child experience and progress [SCCIF].",
                "Leadership oversight and management impact [Reg 13].",
                "Evidence sufficiency and gaps.",
                "Learning, actions and follow-through.",
            ],
            "evidence_expectations": [
                "What changed for the child.",
                "How leaders knew and acted.",
                "Whether actions were reviewed.",
                "Whether patterns or drift were considered.",
            ],
            "avoid": [
                "Predicting inspection grades.",
                "Equating completed paperwork with impact.",
            ],
        }

    def _therapeutic_frame(self) -> dict[str, Any]:
        return {
            "topic": "therapeutic and reflective reasoning",
            "purpose": "Frame behaviour, distress or conflict through emotional meaning, repair and relational safety.",
            "required_lenses": [
                "Behaviour as communication.",
                "Emotional containment and co-regulation.",
                "Repair after rupture.",
                "Shame-sensitive language.",
                "Adult reflection and learning.",
            ],
            "evidence_expectations": [
                "What the child may have been communicating.",
                "What helped or escalated the situation.",
                "What repair or follow-up occurred.",
                "What adults learned for next time.",
            ],
            "avoid": [
                "Diagnosing children.",
                "Punitive or blame-based wording.",
            ],
        }

    def _supervision_frame(self) -> dict[str, Any]:
        return {
            "topic": "staff reflection / supervision",
            "purpose": "Support reflective learning, emotional containment, practice development and accountability without shame.",
            "required_lenses": [
                "What happened and how it affected the adult and child.",
                "What the adult noticed, felt, learned and needs support with.",
                "Practice strengths, worries and next development steps.",
                "Supervision as reflective safeguarding and practice improvement.",
            ],
            "evidence_expectations": [
                "Reflection themes, learning points, agreed actions and follow-up date.",
                "Support needs and any training, coaching or debrief needed.",
            ],
            "avoid": [
                "Shaming staff.",
                "Turning reflective support into surveillance.",
            ],
        }

    def _leadership_frame(self) -> dict[str, Any]:
        return {
            "topic": "leadership / governance / oversight",
            "purpose": "Reason like a strong registered manager or RI: evidence, drift, patterns, actions and impact.",
            "required_lenses": [
                "Leadership visibility and management rationale [Reg 13].",
                "Patterns, drift, repeated themes and learning.",
                "Action ownership, follow-through and review.",
                "Impact on children, staff and safety culture.",
                "Inspection readiness and provider learning [SCCIF].",
            ],
            "evidence_expectations": [
                "What leaders knew, when they knew it and what they did.",
                "Whether actions changed practice or outcomes.",
                "Whether repeated themes were identified and addressed.",
            ],
            "avoid": [
                "Assuming paperwork equals oversight.",
                "Describing activity without impact.",
            ],
        }

    def _staffing_frame(self) -> dict[str, Any]:
        return {
            "topic": "workforce / staffing / training",
            "purpose": "Link workforce issues to safety, consistency, supervision, culture and outcomes for children.",
            "required_lenses": [
                "Staffing sufficiency and skill mix.",
                "Supervision, induction, training and safer recruitment.",
                "Agency/temporary staff impact on continuity and relationships.",
                "Leadership oversight and workforce culture [Reg 13].",
            ],
            "evidence_expectations": [
                "Rota decisions, risk rationale, supervision/training records and impact on children.",
                "How leaders respond to workforce pressure and protect consistency.",
            ],
            "avoid": [
                "Treating staffing as purely administrative.",
                "Ignoring impact on children and emotional climate.",
            ],
        }

    def _complaints_frame(self) -> dict[str, Any]:
        return {
            "topic": "complaints / concerns",
            "purpose": "Support fair, child-centred, evidence-led complaint handling and learning.",
            "required_lenses": [
                "Listening and response culture.",
                "Factual chronology and communication trail.",
                "Management oversight, fairness and learning [Reg 13].",
                "Child and family voice where relevant.",
            ],
            "evidence_expectations": [
                "Concern raised, acknowledgement, investigation/actions, outcome and learning.",
                "How the child or complainant was kept informed and supported.",
            ],
            "avoid": [
                "Defensive wording.",
                "Minimising concerns before review.",
            ],
        }

    def _medication_frame(self) -> dict[str, Any]:
        return {
            "topic": "health / medication oversight",
            "purpose": "Reason through safety, recording, health advice, oversight and follow-up.",
            "required_lenses": [
                "Immediate health and safety.",
                "Medication records, advice and administration accuracy.",
                "Management oversight and learning.",
                "Impact on the child and follow-up health support.",
            ],
            "evidence_expectations": [
                "What was administered or missed, who was informed, advice received and follow-up.",
                "MAR/health record accuracy and management review.",
            ],
            "avoid": [
                "Giving medical advice beyond professional boundaries.",
                "Minimising medication errors or health concerns.",
            ],
        }

    def _education_health_frame(self) -> dict[str, Any]:
        return {
            "topic": "education / health / multi-agency support",
            "purpose": "Connect daily care to progress, advocacy, partnership working and child experience.",
            "required_lenses": [
                "Child progress and lived experience.",
                "Professional advocacy and multi-agency partnership.",
                "Barriers, plans, attendance, engagement and outcomes.",
                "Leadership oversight where drift occurs.",
            ],
            "evidence_expectations": [
                "What support was offered, who was involved, what changed and what remains needed.",
                "Child voice and engagement.",
            ],
            "avoid": [
                "Listing appointments without impact.",
                "Ignoring the child's experience of education or health support.",
            ],
        }

    def _placement_planning_frame(self) -> dict[str, Any]:
        return {
            "topic": "placement planning / care planning / risk assessment",
            "purpose": "Reason through matching, stability, risk, plans, transitions and child-centred outcomes.",
            "required_lenses": [
                "Child needs, wishes, identity and relationships.",
                "Risk assessment, matching and stability planning.",
                "Plan implementation, review and evidence of impact.",
                "Leadership oversight and multi-agency working.",
            ],
            "evidence_expectations": [
                "Why the plan is suitable, what support is needed and how progress will be reviewed.",
                "Child voice, risk changes, placement stability indicators and follow-up actions.",
            ],
            "avoid": [
                "Plan language with no implementation or impact.",
                "Ignoring transition anxiety or relational stability.",
            ],
        }

    def _product_frame(self) -> dict[str, Any]:
        return {
            "topic": "IndiCare / ORB product explanation",
            "purpose": "Explain the product clearly while preserving the distinction between standalone ORB and OS-connected operational ORB.",
            "required_lenses": [
                "Standalone ORB is guidance-first and does not access live care records.",
                "OS ORB may support operational context where permissioned by the OS.",
                "Both share the same institutional cognition principles.",
                "Explain value in practical residential-home language.",
            ],
            "evidence_expectations": [],
            "avoid": [
                "Claiming live record access in standalone ORB.",
                "Overselling unfinished features as fully live.",
            ],
        }


orb_institutional_depth_frame_service = OrbInstitutionalDepthFrameService()
