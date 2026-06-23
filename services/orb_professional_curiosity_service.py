from __future__ import annotations

from typing import Any

from services.orb_scenario_playbook_service import orb_scenario_playbook_service


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
            "Immediate welfare on return: injury, intoxication, distress, clothing/weather/phone, medical attention if needed.",
            "Police/social worker notification and local missing procedure followed?",
            "Return conversation: where did they go, who were they with, unknown adults, how did they travel?",
            "Phone/social media contact during absence; substances, money, gifts, sexual or criminal exploitation indicators?",
            "If cannabis, alcohol or substances are indicated: how did they obtain them, who supplied them, was there debt, pressure, coercion, gifting, older peer/adult influence or a location pattern?",
            "Did they feel safe; what made them leave; what made them return; did they avoid someone/something in the home?",
            "What might the young person be feeling on return — shame, fear, exhaustion, relief, worry about consequences or loyalty to someone outside the home?",
            "Relationship lens: how staff respond after return may determine whether the child feels safe enough to talk later; prioritise connection before interrogation.",
            "What would help them stay safe next time?",
            "Patterns: repeated times, locations/routes, peers/adults, family/contact, school/education, staff/relationship, emotional triggers.",
            "Push factors inside the home and pull factors outside; escalation or reduction over time; contextual safeguarding links?",
            "Recording: chronology, missing report, return conversation, agencies informed, risk update, safety plan, child voice, manager review.",
            "Ofsted line of enquiry: does the home understand why children go missing — learning, prevention, risk reduction, multi-agency impact and evidence that action changed something?",
            "Learning loop: what needs to change tomorrow — risk assessment, exploitation screening, placement plan, safety plan, key-work, staffing approach or manager oversight?",
        ],
        "missing_substance_return": [
            "This is not just a behaviour-management issue: missing episode + substance indicator + refusal to engage should increase professional curiosity without jumping to conclusions.",
            "Immediate welfare: presentation, intoxication level, injury, distress, hydration/food/rest, medical advice if needed, and safe observation.",
            "Contextual safeguarding: who were they with, how did they get cannabis/substances, was there gifting, debt, pressure, coercion, older peer/adult influence, vehicle, location or phone/social-media contact?",
            "Child experience: consider shame, fear, exhaustion, anxiety, avoidance, loyalty, worry about consequences or feeling controlled; do not treat silence as defiance only.",
            "Relationship response: calm connection first; give space while maintaining safety; avoid interrogation; offer a later return conversation with a trusted adult.",
            "Recording: factual observations, direct quotes, welfare checks, staff response, child voice when available, agencies informed, risk review and manager oversight.",
            "Ofsted line of enquiry: would the record show that staff understood why the child went missing, explored exploitation/substance risk, updated plans and learned from the episode?",
            "Learning loop: risk assessment, missing-from-care plan, exploitation screening, placement/safety plan, key-work themes, chronology and management review should be considered.",
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
            "Family time cancellation as loss, disappointment or rejection — attachment meaning and fear of being forgotten?",
            "Shame, sadness, anger, lack of control — is behaviour communicating overwhelm (e.g. smashing a cup) not 'bad behaviour'?",
            "How did staff stay calm, validate without condoning unsafe behaviour, co-regulate and repair after rupture?",
            "What helped them settle; what follow-up key work or planning for future family-time changes is needed?",
            "Does the pattern repeat around family/contact changes; how to record without blame while holding emotional meaning?",
            "Recording: context, child's words, emotional presentation, behaviour, staff response, safety, repair, outcome, follow-up.",
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
            "What is the medication for; is it time-critical; PRN, routine, controlled, psychotropic, epilepsy, insulin, asthma, antibiotics, sleep or other high-impact?",
            "Was pharmacy/GP/NHS 111 or emergency advice required before giving late or omitting — do not give clinical treatment advice?",
            "Was the child monitored after the error; any symptoms, distress, anxiety or impact; was emergency advice needed?",
            "MAR entry transparent and not misleadingly backfilled — due time, actual time, missed/given late/omitted, advice sought and who gave it?",
            "Manager notified; child's presentation and voice recorded; parent/social worker/placing authority informed if policy requires?",
            "Handover failure, missed double-checking/second checker, unclear outgoing/incoming responsibility, environmental distraction?",
            "Staff trained/competent; isolated or repeated; medication policy/handover process change; supervision/training/action?",
            "Review afterwards: medication audit, MAR audit, handover system, competency, repeated errors, provider learning, Reg 12/13 evidence?",
        ],
        "self_harm": [
            "Immediate safety: means removed, supervision level, medical assessment if injury, emotional state and triggers?",
            "What happened before; who was present; what de-escalation or co-regulation was attempted?",
            "Child's words and presentation; shame, hopelessness, protest, trauma response or communication of distress?",
            "Risk assessment, safety plan, CAMHS/GP notification, social worker and parent/placing authority if required?",
            "Pattern over time, online/social factors, placement stress, contact impact, staff consistency?",
            "Recording without blame or sensationalism; manager review, learning and plan update?",
        ],
        "exploitation": [
            "Contextual safeguarding: locations, peers, unknown adults, gifts, money, transport, hotels, stations, online contact?",
            "Push/pull factors; fear, secrecy, loyalty, debt, coercion indicators — without concluding exploitation?",
            "Missing episodes, substance use, criminal activity, sexualised behaviour or new phones linked?",
            "Multi-agency: social worker, police, MACE/contextual safeguarding routes where indicated?",
            "Child voice and trusted adult; safety plan and risk assessment update?",
            "Manager/RI oversight, chronology pattern review and provider learning?",
        ],
        "behaviour_support": [
            "Behaviour as communication — unmet need, trauma trigger, sensory overload, relationship rupture?",
            "Antecedent, presentation, adult response, de-escalation, alternatives before any restrictive practice?",
            "BSP/PBS plan alignment; what works; what escalates; repair and relational follow-up?",
            "Pattern across shifts, staff, locations; normalisation or drift in expectations?",
            "Recording: facts, child voice, staff rationale, outcome, plan review date?",
        ],
        "family_time": [
            "Purpose of contact; child's wishes; preparation and emotional readiness?",
            "During contact: regulation, joy, conflict, boundary issues, safeguarding concerns?",
            "After contact: presentation, repair needs, co-regulation, impact on placement stability?",
            "Cancellation/disappointment: attachment meaning, recording without blame, plan for next contact?",
            "Multi-agency and advocate involvement where relevant?",
        ],
        "staff_culture": [
            "What behaviours are normalised in the team — minimisation, blame, humour at children's expense, silence?",
            "How do leaders model curiosity, challenge and emotional safety for staff?",
            "Supervision quality, whistleblowing confidence, fairness when concerns arise?",
            "Impact on child experience, restraint culture, recording honesty and safeguarding responsiveness?",
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
        "live_safeguarding_incident": [
            "What is happening right now — who, where, immediate risk of harm?",
            "Can staff engage verbally and delay safely without escalating?",
            "Is there unknown adult, vehicle, weapon, substance or coercion indicator?",
            "When might police, ambulance or EDT be needed now?",
            "If physical intervention is considered: necessity, proportionality, least restrictiveness?",
            "For 16–17: autonomy, maturity, exploitation risk.",
            "If child leaves: missing procedure, vehicle details; do not block moving vehicles.",
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
            "missing_substance_return",
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
            "self_harm",
            "exploitation",
            "behaviour_support",
            "family_time",
            "staff_culture",
            "live_safeguarding_incident",
            "physical_intervention_live",
            "age_16_17_autonomy",
        }
    )

    def detect_topic(self, message: str, *, mode: str | None = None) -> str | None:
        text = str(message or "").lower()
        mode_text = str(mode or "").lower()
        if self._is_missing_substance_return(text):
            return "missing_substance_return"
        if any(term in text for term in ("taken tablets", "overdose", "swallowed tablets", "self-harmed", "self harm")):
            return "self_harm"
        playbook = orb_scenario_playbook_service.detect_playbook(message)
        if playbook:
            return playbook.topic
        if orb_scenario_playbook_service.is_live_incident(message):
            return "live_safeguarding_incident"
        playbook_topic = orb_scenario_playbook_service.detect_topic(message)
        if any(term in text for term in ("17 year old", "17-year-old", "16 year old", "16-year-old")):
            if any(term in text for term in ("boyfriend", "physically stop", "getting into", "leaving", "car")):
                return playbook_topic or "age_16_17_autonomy"
        if any(term in text for term in ("can i physically stop", "can i restrain", "can i grab", "can i block the door", "can i lock the door")):
            return "physical_intervention_live"
        if any(term in text for term in ("staff member touched", "touched them inappropriately", "disclosed assault", "disclosed abuse")):
            return "allegations"
        if any(term in text for term in ("bullying", "group intimidation", "intimidation on the unit")):
            return "allegations"
        if any(term in text for term in ("domestic abuse", "controlling behaviour", "coercive control")):
            return "exploitation"
        if any(term in text for term in ("arrived unplanned", "demanding to take the child", "parent turned up")):
            return "live_safeguarding_incident"
        if any(term in text for term in ("threatening to stab", "threatening another child")):
            return "live_safeguarding_incident"
        if any(term in text for term in ("social worker unhappy", "unhappy with our recording", "poor recording")):
            return "recording"
        if any(term in text for term in ("staff was shouting", "staff member was shouting", "shouting at a child")):
            return "supervision"
        if any(
            term in text
            for term in (
                "whistleblow",
                "not to log",
                "avoid ofsted",
                "cover up",
                "cover-up",
                "suppress safeguarding",
                "not reporting",
            )
        ):
            return "staff_culture"
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
        if any(term in text for term in ("responsible individual", "registered manager", " ri ", "ri review", "manager daily", "governance", "daily brief")):
            return "leadership"
        if any(term in text for term in ("family time cancelled", "smashed cup", "therapeutic", "therapeutically", "dysregulated", "behaviour as communication")):
            return "therapeutic"
        if any(term in text for term in ("self-harm", "self harm", "self harmed", "suicidal", "cutting", "overdose")):
            return "self_harm"
        if any(
            term in text
            for term in (
                "exploitation",
                "cse",
                "cce",
                "county lines",
                "contextual safeguarding",
                "unknown adult",
                "criminal exploitation",
            )
        ):
            return "exploitation"
        if any(term in text for term in ("behaviour support", "pbs", "behaviour plan", "bsp", "positive behaviour")):
            return "behaviour_support"
        if any(term in text for term in ("family time", "contact session", "contact cancelled", "family contact")) and "therapeutic" not in text:
            return "family_time"
        if any(term in text for term in ("staff culture", "team culture", "normalised", "minimising culture", "toxic team")):
            return "staff_culture"
        if any(term in text or term in mode_text for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45")):
            return "inspection"
        if any(term in text for term in ("safeguard", "radicalisation", "online safety")) and "exploitation" not in text:
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
        if topic == "missing_substance_return":
            lines.extend(
                [
                    "- For RSW/Senior roles, keep this practical and calm, but do not flatten it into a checklist.",
                    "- The answer must include: immediate welfare; professional curiosity; child experience; relationship response; recording; manager/DSL escalation; Ofsted evidence; learning loop.",
                    "- Avoid saying this means exploitation. Say it increases professional curiosity and should prompt contextual safeguarding thinking.",
                ]
            )
        lines.extend(
            [
                "- Do not end high-attention answers with vague 'would you like to explore further?' closers.",
                "- Do not end with generic coaching questions such as 'What might be...?', 'How can we ensure...?', "
                "'Would you like...?' or 'What specific follow-up...?' — end with a clear professional conclusion or next step.",
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

    def _is_missing_substance_return(self, text: str) -> bool:
        missing = any(term in text for term in ("missing", "abscond", "away from home", "returned", "return from missing", "went missing"))
        substance = any(term in text for term in ("cannabis", "weed", "smell of cannabis", "smells of cannabis", "substance", "intoxicated", "drug"))
        disengaged = any(term in text for term in ("refus", "won't talk", "would not talk", "slammed", "shut themselves", "bedroom door", "not engaging"))
        return missing and substance and disengaged

    def _is_cumulative_concern(self, text: str) -> bool:
        has_allegation = "allegation" in text
        has_missing = "missing" in text
        has_restraint = "restraint" in text
        same_adult = any(
            term in text
            for term in (
                "same staff",
                "same adult",
                "same worker",
                "same member of staff",
                "involving the same",
            )
        )
        pattern_terms = (
            "pattern",
            "repeated",
            "three allegations",
            "three allegations about",
            "nothing appears",
            "not right",
            "same staff",
            "same adult",
            "cumulative",
            "multiple incident",
            "same staff member and a pattern",
            "allegations about the same staff",
        )
        incident_mix = (
            sum(1 for term in ("allegation", "missing", "restraint") if term in text) >= 2
            or (has_allegation and has_restraint)
        )
        strong_cumulative = has_allegation and has_restraint and has_missing and same_adult
        allegations_restraints_same_adult = has_allegation and has_restraint and same_adult
        return strong_cumulative or allegations_restraints_same_adult or (
            incident_mix and any(term in text for term in pattern_terms)
        )

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
