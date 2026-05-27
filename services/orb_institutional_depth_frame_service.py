from __future__ import annotations

from typing import Any

from services.orb_professional_curiosity_service import orb_professional_curiosity_service


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
        if topic == "cumulative_concern":
            return self._cumulative_concern_frame()
        if topic == "allegations":
            return self._allegations_frame()
        if topic == "chronology":
            return self._chronology_frame()
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
        if frame.get("response_structure"):
            lines.extend(["- Required response structure:"])
            for step in frame["response_structure"]:
                lines.append(f"  - {step}")
        if frame.get("opening_anchor"):
            lines.extend(["- Opening requirement:", f"  - {frame['opening_anchor']}"])
        for section_key, heading in (
            ("patterns_to_explore", "Patterns to explore in the answer"),
            ("rm_questions", "Registered manager questions to weave in"),
            ("ri_questions", "Responsible individual questions to weave in"),
            ("ofsted_lens", "Ofsted / SCCIF scrutiny lens"),
            ("immediate_safe_next_steps", "Immediate safe next steps"),
        ):
            items = frame.get(section_key)
            if items:
                lines.append(f"- {heading}:")
                for item in items:
                    lines.append(f"  - {item}")
        curiosity_block = orb_professional_curiosity_service.prompt_block(message, mode=mode)
        if curiosity_block:
            lines.extend(["", curiosity_block])
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
        curiosity_topic = orb_professional_curiosity_service.detect_topic(text, mode=mode_text)
        if curiosity_topic == "cumulative_concern":
            return "cumulative_concern"
        if any(term in text for term in ("indicare", "orb", "care companion", "os", "platform", "product")):
            return "indicare_product"
        if any(term in text for term in ("allegation", "allegations", "lado", "grabbed", "staff member", "conduct concern")):
            return "allegations"
        if any(term in text or term in mode_text for term in ("missing", "abscond", "return interview", "away from home")):
            return "missing"
        if any(term in text or term in mode_text for term in ("restraint", "physical intervention", "held", "restrictive")):
            return "restraint"
        if any(term in text for term in ("chronology", "timeline", "sequence of events")) and "rewrite" not in text:
            return "chronology"
        if any(
            term in text or term in mode_text
            for term in ("rewrite", "poor record", "rough note", "record", "recording", "wording", "daily note", "incident")
        ):
            return "recording"
        if any(term in text or term in mode_text for term in ("responsible individual", "registered manager", " ri ", "governance", "leadership", "oversight", "audit")):
            return "leadership"
        if any(term in text or term in mode_text for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45")):
            return "inspection"
        if any(term in text or term in mode_text for term in ("therapeutic", "trauma", "behaviour", "repair", "emotion", "dysregulated")):
            return "therapeutic"
        if any(term in text or term in mode_text for term in ("supervision", "debrief", "reflective", "reflection", "staff coach")):
            return "supervision"
        if any(term in text or term in mode_text for term in ("manager",)):
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
                "Child's exact words and what they reported — preserve voice without leading questions.",
                "Clarify what 'grabbed', 'pushed', 'held' or similar means: restraint, guiding touch, alleged assault, disputed contact or unsafe practice.",
                "Injury, pain, fear, humiliation and whether medical attention or body mapping is relevant.",
                "Witness accounts, CCTV and other factual material; staff account taken separately.",
                "Human-led LADO consultation thinking [Working Together] [LADO] — not threshold decisions.",
                "Interim safety arrangements, staff support and fairness alongside child protection [Reg 12] [Reg 13].",
                "Leadership oversight, manager rationale, supervision, learning and follow-through [Reg 13].",
                "SCCIF evidence expectations: timeliness, professional curiosity, child experience, leadership impact.",
                "Recording quality: chronology, actions, rationale, outcome; pattern review across episodes.",
                "Therapeutic lens: child emotionally safe, heard, not blamed; rapport preserved where possible.",
                "Fairness lens: do not assume the child is lying or the adult is unsafe without process.",
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
                "Deciding statutory thresholds or LADO outcomes.",
                "Assuming the child is lying or the adult is guilty without process.",
                "Minimising language such as only, just, attention seeking, or false allegation before review.",
                "Generic advice with no regulatory, recording, leadership or therapeutic reasoning.",
            ],
        }

    def _missing_frame(self) -> dict[str, Any]:
        return {
            "topic": "missing from home / away from placement",
            "purpose": "Reason through safety, context, return, patterns, exploitation risk and recording quality without making threshold decisions.",
            "required_lenses": [
                "Immediate safety, police/local missing procedure and timeline [Reg 12].",
                "Search actions, who was informed and management oversight [Reg 13].",
                "Return-home conversation, child's emotional state and what was learned.",
                "Push/pull factors, peer and adult relationships, location/route patterns.",
                "Exploitation and contextual safeguarding indicators [Working Together].",
                "Risk assessment and chronology update; repeated episodes and prevention learning.",
                "Inspection lens: timeliness, learning, impact and Ofsted scrutiny of patterns [SCCIF].",
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
                "Necessity, proportionality and least restrictive practice [Reg 12].",
                "What happened before, during and after; alternatives and de-escalation attempted.",
                "Type and duration if known; risk of harm that justified intervention.",
                "Child voice, injury checks, dignity and emotional impact.",
                "Staff debrief, child debrief, repair and relational follow-up.",
                "Manager review, behaviour support plan review and pattern/reduction thinking [Reg 13].",
                "Recording quality: antecedent, presentation, intervention, outcome [Recording quality].",
                "Inspection culture lens: patterns, normalisation and impact on child experience [SCCIF].",
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
                "Provide: 1) improved record, 2) what was wrong, 3) what is still missing, 4) what to add before sign-off, 5) why this matters for inspection/oversight.",
                "Use bracketed placeholders for missing facts — never invent facts.",
                "For restraint-related rough notes include: antecedent, emotional presentation, de-escalation, risk, necessity, proportionality, duration/type, child response, injury check, debrief, repair, manager review, plan update.",
                "Fact versus interpretation; child voice; adult response and rationale; outcome and follow-up.",
            ],
            "evidence_expectations": [
                "What happened before, during and after.",
                "What the child said or showed.",
                "What adults did and why.",
                "What changed afterwards.",
                "What needs follow-up or review.",
                "Example placeholders: [Insert what happened immediately before], [Insert de-escalation attempted], [Insert manager review outcome].",
            ],
            "avoid": [
                "Judgemental labels.",
                "Unsupported conclusions.",
                "Activity-only records with no impact or outcome.",
                "Only polishing wording without explaining gaps and oversight implications.",
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
                "Behaviour as communication; loss, rejection, shame, fear.",
                "Emotional regulation, co-regulation and staff response.",
                "Repair after rupture; child voice; do not blame the child.",
                "What helped; follow-up key work; plan/risk review if repeated.",
                "How staff should record therapeutically — structure without inventing facts.",
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
                "Bouncing to OS unless live child record access is explicitly requested.",
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
                "RM daily lens: who is most vulnerable today; overnight events; missing/safeguarding; emotional climate; staffing; medication/health; education; staff wellbeing; overdue actions; weak recordings; what could go wrong; visible leadership; what Ofsted would challenge if they arrived today.",
                "RI lens: is the home safe; is the manager supported; are children progressing; is leadership effective; staff supervised and stable; Reg 44 findings repeated; Reg 45 evaluative not descriptive; governance triangulated; patterns acted on; drift; are children safer because of provider action; what evidence proves impact.",
                "Leadership visibility and management rationale [Reg 13].",
                "Patterns, drift, repeated themes and learning.",
                "Inspection readiness and provider learning [SCCIF].",
            ],
            "evidence_expectations": [
                "What leaders knew, when they knew it and what they did.",
                "Whether actions changed practice or outcomes.",
                "Whether repeated themes were identified and addressed.",
                "Reg 44 / Reg 45 evidence quality and triangulation.",
            ],
            "avoid": [
                "Assuming paperwork equals oversight.",
                "Describing activity without impact.",
            ],
        }

    def _chronology_frame(self) -> dict[str, Any]:
        return {
            "topic": "chronology cognition",
            "purpose": "Explain what a strong chronology should help reviewers understand — without accessing live OS records.",
            "required_lenses": [
                "Child's lived experience over time — not only a list of incidents.",
                "Progress, setbacks, safeguarding patterns, relationships, missing episodes, restraints, allegations.",
                "Education, health, identity, family time, emotional themes, risk increasing or reducing.",
                "Management oversight, whether plans were followed, child voice and impact — not just events.",
                "What Ofsted or a reviewer would expect to understand from a chronology [SCCIF].",
            ],
            "evidence_expectations": [
                "How events link over time and what they show about help, protection and progress.",
                "Whether repeated themes are visible and acted on.",
            ],
            "avoid": [
                "Treating chronology as incident logging only.",
                "Directing to OS unless the user asks to inspect actual live records.",
            ],
        }

    def _cumulative_concern_frame(self) -> dict[str, Any]:
        return {
            "topic": "cumulative safeguarding concern / pattern recognition",
            "purpose": (
                "Sector-defining pattern reasoning when separate events feel minor but together signal risk. "
                "The concern is the convergence of allegations, missing episodes and repeated physical interventions "
                "involving the same adult — not whether each incident is individually serious."
            ),
            "opening_anchor": (
                "Open by stating clearly that the concern is not one isolated event; it is the convergence of "
                "allegations, missing episodes and repeated physical interventions involving the same adult."
            ),
            "required_lenses": [
                "This is cumulative concern — the pattern matters more than any single low-level incident.",
                "The young person may be communicating distress through allegation, absence and escalation.",
                "Repeated restraint by the same adult may indicate relationship breakdown, practice drift, power imbalance or lack of attunement.",
                "Missing episodes may link to emotional safety, avoidance, shame, fear, conflict or feeling unheard.",
                "'Nothing individually serious' can be dangerous minimisation if the pattern is escalating.",
                "Safeguarding, leadership and therapeutic lenses must be considered together [Reg 12] [Reg 13].",
                "LADO pattern consultation thinking where repeated staff conduct concerns arise — human-led, not automated thresholding [LADO].",
            ],
            "response_structure": [
                "1. Why your concern matters (name cumulative convergence explicitly).",
                "2. Patterns to explore.",
                "3. Evidence to review.",
                "4. Questions a registered manager should ask.",
                "5. Questions a responsible individual should ask.",
                "6. What Ofsted would likely explore.",
                "7. What to avoid assuming.",
                "8. Immediate safe next steps.",
                "9. Professional boundary (calm summary — not 'would you like to explore further?').",
            ],
            "patterns_to_explore": [
                "Allegation timing and whether episodes cluster.",
                "Restraint timing and whether restraint is becoming normalised.",
                "Missing episodes before/after contact with the same staff member.",
                "Whether one staff–child dynamic is repeatedly breaking down.",
                "Whether the child avoids the home or a specific staff member.",
                "Environmental, shift, team, location and handover-point patterns.",
                "Whether other young people have concerns about the same adult.",
                "Whether records minimise the young person's experience.",
            ],
            "evidence_expectations": [
                "Chronology across all incidents — allegations, missing episodes, restraints.",
                "Allegation records, restraint records, missing records, body maps/injury checks where relevant.",
                "Debriefs, staff statements, child's direct words, manager reviews, supervision notes.",
                "Behaviour support plan, risk assessment, placement plan, complaints/concerns.",
                "Reg 44 findings and Reg 45 learning where available.",
                "CCTV/witness material if available and lawful; social worker/LADO advice where relevant.",
            ],
            "rm_questions": [
                "What is the child experiencing?",
                "Are we explaining away a pattern?",
                "Is this staff member safe to continue direct work unchanged pending review?",
                "Have I consulted safeguarding/LADO where appropriate?",
                "Have I separated allegation management from disciplinary judgement?",
                "Have I reviewed staff practice and training?",
                "Has the child got a trusted adult/advocate?",
                "What immediate protective arrangements are proportionate?",
            ],
            "ri_questions": [
                "Is the manager curious enough?",
                "Is there drift?",
                "Are leaders minimising because each event is low level?",
                "Are Reg 44/45 reviews identifying this pattern?",
                "Is the provider learning or just recording?",
                "Are children safer because of leadership action?",
            ],
            "ofsted_lens": [
                "Inspectors look beyond individual incidents to patterns, timeliness, leadership oversight, child voice, emotional safety, staff culture and restraint culture.",
                "They expect evidence that leaders understood and acted on cumulative concerns [SCCIF].",
                "Reg 12 protection and Reg 13 leadership should be visible in records and management response.",
            ],
            "avoid": [
                "Generic safeguarding summaries or 'look for connections' without specifics.",
                "Deciding truth or falsehood; assuming the child is lying or the adult is unsafe without process.",
                "Assuming low-level means low-risk; assuming missing/restraint/allegations are unrelated.",
                "Assuming paperwork equals oversight.",
                "Ending with vague 'would you like to explore further?' — use calm summary and human-led next steps.",
            ],
            "immediate_safe_next_steps": [
                "Ensure immediate safety; management review today.",
                "Consider interim staffing/contact arrangements; consult local safeguarding/LADO where pattern creates concern.",
                "Ensure child support/advocacy; review all incidents together; inform/consult social worker as appropriate.",
                "Record rationale; RI oversight; supervision/debrief for staff; update risk/behaviour support plans.",
                "Create action plan and review date.",
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
