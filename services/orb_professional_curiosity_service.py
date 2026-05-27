from __future__ import annotations

from typing import Any


class OrbProfessionalCuriosityService:
    """Structured professional curiosity lenses for ORB high-attention topics.

    These are reasoning prompts, not decisions. They push ORB past generic summaries
    into RM / DSL / RI / Ofsted-level institutional thinking.
    """

    UNIVERSAL_LENSES = [
        "What might be missing from the account or record?",
        "What might be minimised, normalised or explained away?",
        "What pattern might be hidden when events are viewed in isolation?",
        "What would a strong registered manager ask next?",
        "What would a designated safeguarding lead ask?",
        "What would a responsible individual challenge?",
        "What would Ofsted look beyond the obvious event?",
        "What evidence would increase confidence in the professional view?",
        "What should not be assumed about the child or the adult?",
        "What needs follow-up, review or supervision?",
        "What might the child be communicating through behaviour or words?",
        "What does this mean longitudinally — not only in the moment?",
    ]

    TOPIC_LENSES: dict[str, list[str]] = {
        "allegations": [
            "What exactly did the child say, in their words?",
            "What does 'grabbed', 'pushed', 'held' or similar mean in context — restraint, guiding touch, alleged assault, disputed contact or unsafe practice?",
            "Were there injury, pain, fear, humiliation or emotional harm indicators?",
            "Is medical attention, body mapping, witness accounts, CCTV or other factual material relevant?",
            "Has the staff account been taken separately, without leading questions?",
            "What interim safety arrangements protect the child while preserving fair process?",
            "What LADO consultation thinking applies without deciding threshold?",
            "What manager rationale and Reg 13 oversight trail is needed?",
            "How is the child's emotional safety preserved after disclosure or concern?",
        ],
        "recording": [
            "What was wrong with the original wording — judgement, gaps, missing voice, missing rationale?",
            "What facts are still missing and must not be invented?",
            "What should be added before sign-off — antecedent, response, outcome, debrief, manager review?",
            "Why does this matter for inspection, chronology and oversight?",
            "For restraint-related notes: were necessity, proportionality, alternatives, duration, injury check and repair recorded?",
        ],
        "missing": [
            "Immediate welfare on return: medical and emotional state, hydration, injury, distress.",
            "Where did they go, who were they with, unknown adults, peer influence, phone/social media contact?",
            "Transport routes, locations frequented, push factors from the home and pull factors outside?",
            "Family/contact triggers, exploitation indicators, substance misuse, criminality or CSE concerns if relevant?",
            "Return conversation quality, independent return interview if appropriate, police/local missing procedure?",
            "Social worker notification, risk assessment and chronology update, plan review, repeated pattern review?",
            "Manager oversight and Ofsted impact lens on timeliness, learning and child experience?",
        ],
        "restraint": [
            "Was intervention necessary, proportionate and least restrictive?",
            "What happened immediately before, during and after — including de-escalation attempts?",
            "Were injury checks, child debrief, staff debrief, repair and manager review evident?",
            "Is there a pattern suggesting normalisation, culture drift or plan review need?",
        ],
        "chronology": [
            "Does the chronology show lived experience, progress, setbacks and safeguarding patterns — not only events?",
            "Are relationships, missing episodes, restraints, allegations, education, health, identity, family time and emotional themes visible?",
            "Does it show whether plans were followed and risk increased or reduced over time?",
            "Would an inspector see impact and management oversight, not activity lists?",
        ],
        "leadership": [
            "Who is most vulnerable today and what overnight events changed risk?",
            "What records need sign-off, what recordings are weak, what actions are overdue?",
            "What could go wrong today if leadership is not visible?",
            "For RI thinking: is governance triangulated, is Reg 45 evaluative, are Reg 44 findings repeated, is there drift?",
            "What evidence proves children are safer because of provider action?",
        ],
        "therapeutic": [
            "What loss, rejection, disappointment, shame or fear of being forgotten may sit underneath?",
            "Attachment meaning: is the behaviour communicating need, protest or distress after rupture?",
            "How did staff co-regulate, contain their own emotions, repair and protect dignity — avoid punitive framing?",
            "What helped the young person settle; what follow-up key work or family-time planning review is needed?",
            "Does a pattern emerge around contact changes; record factually without blame and preserve child voice?",
        ],
        "cumulative_concern": [
            "Why does cumulative concern matter when no single event looks serious alone?",
            "How might allegations, missing episodes and restraints link — especially with the same staff member?",
            "Could the young person be communicating distress through allegation, absence and escalation?",
            "Could repeated restraint by the same adult indicate relationship breakdown, practice drift, power imbalance or lack of attunement?",
            "Could missing episodes link to emotional safety, avoidance, shame, fear, conflict or feeling unheard?",
            "Is restraint becoming normalised; is one staff–child dynamic repeatedly breaking down?",
            "Are shift, location, handover or team patterns visible; do other young people share concerns about the same adult?",
            "Do records minimise the young person's experience; is leadership explaining away a pattern?",
            "What chronology and records must be reviewed together — allegations, missing, restraints, debriefs, supervision?",
            "When might LADO pattern consultation thinking be relevant without deciding outcomes?",
            "What RI oversight, management review today, interim staffing and child advocacy are needed?",
            "What must be avoided — assuming the child is lying, the adult is unsafe without process, or low-level means low-risk?",
        ],
        "inspection": [
            "What would an inspector expect to understand beyond compliance paperwork?",
            "Where is impact visible for children — not only process completion?",
        ],
        "medication": [
            "Was the medication time-critical; what is it for and what does the MAR say?",
            "Was medical/pharmacy/GP/111 advice needed before giving a late dose — do not give clinical advice?",
            "Was the child monitored; was the error recorded transparently with rationale?",
            "Were parents, social worker or placing authority informed if policy requires; was the manager notified promptly?",
            "Was there a handover failure, second-checking issue or staff competency/training concern?",
            "Is this repeated or isolated; does the medication policy need review; what learning prevents recurrence?",
        ],
        "complaints": [
            "How was the child or complainant heard and kept informed?",
            "Is the chronology factual and free from defensive minimisation?",
            "What management oversight, learning and follow-through is evidenced?",
            "Does advocacy or independent visitor involvement need consideration?",
        ],
        "education_health": [
            "What barriers affect attendance, engagement or progress?",
            "How is the child's voice and aspiration visible in plans and records?",
            "What multi-agency advocacy is needed and what leadership oversight applies?",
            "Are PEP, CAMHS or health plans being followed with impact evidence?",
        ],
        "supervision": [
            "What happened and how did it affect the adult and child?",
            "What practice strengths, worries and development needs are visible?",
            "What support, coaching or debrief does the staff member need?",
            "What leadership follow-up prevents repetition or drift?",
        ],
        "staffing": [
            "How does staffing pressure affect safety, consistency and relationships?",
            "Are supervision, training and safer recruitment gaps visible?",
            "What is leadership doing to protect child experience during workforce strain?",
        ],
    }

    HIGH_ATTENTION_TOPICS = frozenset(
        {
            "allegations",
            "recording",
            "missing",
            "restraint",
            "chronology",
            "leadership",
            "therapeutic",
            "cumulative_concern",
            "inspection",
            "medication",
            "complaints",
            "supervision",
            "education_health",
        }
    )

    def detect_topic(self, message: str, *, mode: str | None = None) -> str | None:
        text = str(message or "").lower()
        mode_text = str(mode or "").lower()
        if self._is_cumulative_concern(text):
            return "cumulative_concern"
        if any(
            term in text
            for term in ("allegation", "allegations", "lado", "grabbed", "conduct concern", "disclosure against")
        ):
            return "allegations"
        if any(term in text for term in ("missing", "abscond", "away from home", "return interview", "went missing")):
            return "missing"
        if any(term in text for term in ("restraint", "physical intervention", "held down", "restrictive", "physical hold")):
            return "restraint"
        if any(term in text for term in ("medication", "medicine", "mar record", "medication error", "dose missed", "refused medication")):
            return "medication"
        if any(term in text for term in ("complaint", "complaints", "advocacy", "independent visitor", "parent complained")):
            return "complaints"
        if any(term in text for term in ("school refusal", "exclusion", "pep", "attendance", "education refusal", "camhs")):
            return "education_health"
        if any(
            term in text
            for term in (
                "supervision",
                "staff member was sharp",
                "staff was sharp",
                "poor practice",
                "staff conduct",
                "capability",
                "reflective practice after",
            )
        ) or mode_text in {"staff coach"}:
            return "supervision"
        if any(term in text for term in ("chronology", "timeline", "sequence of events")):
            return "chronology"
        if any(term in text for term in ("rewrite", "wording", "poor record", "rough note", "sign off", "sign-off")) or mode_text in {
            "record this properly",
        }:
            return "recording"
        if any(term in text for term in ("responsible individual", "registered manager", " ri ", "manager daily", "governance", "daily brief")):
            return "leadership"
        if any(term in text for term in ("family time cancelled", "smashed cup", "therapeutic", "therapeutically", "dysregulated", "behaviour as communication")):
            return "therapeutic"
        if any(term in text or term in mode_text for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45")):
            return "inspection"
        if any(term in text for term in ("safeguard", "self-harm", "self harm", "exploitation", "radicalisation", "online safety")):
            return "allegations"
        return None

    def lenses_for(self, message: str, *, mode: str | None = None) -> list[str]:
        topic = self.detect_topic(message, mode=mode)
        if not topic:
            return []
        topic_lenses = list(self.TOPIC_LENSES.get(topic, []))
        if topic in self.HIGH_ATTENTION_TOPICS:
            return self._dedupe(self.UNIVERSAL_LENSES[:6] + topic_lenses)
        return self._dedupe(topic_lenses)

    def prompt_block(self, message: str, *, mode: str | None = None) -> str:
        topic = self.detect_topic(message, mode=mode)
        lenses = self.lenses_for(message, mode=mode)
        if not topic or not lenses:
            return ""
        lines = [
            "Professional Curiosity Engine (apply actively — do not list generically):",
            f"- Topic: {topic.replace('_', ' ')}",
            "- Explore these lenses in the answer where relevant:",
        ]
        for lens in lenses:
            lines.append(f"  - {lens}")
        lines.extend(
            [
                "- Do not end high-attention answers with vague 'would you like to explore further?' closers.",
                "- Give structured professional reasoning like an experienced RM, DSL, RI and inspector working together.",
            ]
        )
        return "\n".join(lines)

    def context_payload(self, message: str, *, mode: str | None = None) -> dict[str, Any]:
        topic = self.detect_topic(message, mode=mode)
        return {
            "topic": topic,
            "high_attention": topic in self.HIGH_ATTENTION_TOPICS if topic else False,
            "lenses": self.lenses_for(message, mode=mode),
        }

    def _is_cumulative_concern(self, text: str) -> bool:
        pattern_terms = ("pattern", "repeated", "three allegations", "nothing appears", "not right", "same staff")
        incident_mix = (
            sum(1 for term in ("allegation", "missing", "restraint") if term in text) >= 2
            or ("allegation" in text and "restraint" in text)
        )
        return incident_mix and any(term in text for term in pattern_terms)

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            if item in seen:
                continue
            seen.add(item)
            out.append(item)
        return out


orb_professional_curiosity_service = OrbProfessionalCuriosityService()
