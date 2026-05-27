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
            "What push/pull factors and contextual safeguarding indicators sit behind the episode?",
            "Are peer, adult, location, route or exploitation patterns emerging?",
            "Was return-home conversation quality strong enough to learn, not only locate?",
            "Are repeated episodes being reviewed as a pattern, not routine?",
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
            "What loss, rejection, shame or fear may sit underneath the behaviour?",
            "How did staff co-regulate, repair and protect dignity?",
            "What helped, what escalated, and what follow-up key work is needed?",
            "Should plan or risk review be triggered if this repeats?",
        ],
        "cumulative_concern": [
            "Why does cumulative concern matter when no single event looks serious alone?",
            "How might allegations, missing episodes and restraints link — especially with the same staff member?",
            "Could there be emotional unsafety, power/control dynamics, normalisation of restraint or leadership minimisation?",
            "What chronology and records must be reviewed together?",
            "When might LADO pattern consultation thinking be relevant without deciding outcomes?",
            "What RI oversight, management review, supervision and child advocacy are needed?",
            "What must be avoided — assuming the child is lying or the adult is guilty without process?",
        ],
        "inspection": [
            "What would an inspector expect to understand beyond compliance paperwork?",
            "Where is impact visible for children — not only process completion?",
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
        }
    )

    def detect_topic(self, message: str, *, mode: str | None = None) -> str | None:
        text = str(message or "").lower()
        mode_text = str(mode or "").lower()
        if self._is_cumulative_concern(text):
            return "cumulative_concern"
        if any(term in text for term in ("allegation", "allegations", "lado", "grabbed", "staff member said", "conduct concern")):
            return "allegations"
        if any(term in text for term in ("missing", "abscond", "away from home", "return interview")):
            return "missing"
        if any(term in text for term in ("restraint", "physical intervention", "held down", "restrictive")):
            return "restraint"
        if any(term in text for term in ("chronology", "timeline", "sequence of events")):
            return "chronology"
        if any(term in text for term in ("rewrite", "wording", "poor record", "rough note", "sign off", "sign-off")) or mode_text in {
            "record this properly",
        }:
            return "recording"
        if any(term in text for term in ("responsible individual", "registered manager", " ri ", "manager daily", "governance")):
            return "leadership"
        if any(term in text for term in ("therapeutic", "therapeutically", "smashed", "dysregulated", "behaviour as communication")):
            return "therapeutic"
        if any(term in text or term in mode_text for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45")):
            return "inspection"
        if any(term in text for term in ("safeguard", "risk", "harm")):
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
