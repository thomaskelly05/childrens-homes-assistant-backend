from __future__ import annotations

"""ORB Communicate — Communication Support Pack (backend-converged).

Deterministic, launch-quality support pack generation routed through the canonical
ORB brain convergence orchestrator. Does not replace SALT, PBS, safeguarding,
clinical advice or professional judgement.
"""

import re
from dataclasses import dataclass, field
from typing import Any, Literal

from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service

CommunicateAudience = Literal[
    "child",
    "young_person",
    "adult",
    "learning_disability",
    "autism",
    "unknown",
]

CommunicateIntent = Literal[
    "contact_change",
    "new_staff_member",
    "hospital_appointment",
    "medication_explanation",
    "safe_unsafe_communication",
    "safeguarding_disclosure",
    "feelings_expression",
    "bedtime_worries",
    "visual_routine",
    "school_change",
    "moving_home",
    "family_time",
    "health_appointment",
    "social_worker_meeting",
    "court_review_meeting",
    "general",
]

COMMUNICATE_SUPPORT_PACK_REQUEST_RE = re.compile(
    r"(?:create|build|make|generate|prepare|draft).{0,50}communication\s+support\s+pack|"
    r"communication\s+support\s+pack.{0,120}(?:explain|contact|autism|aac|changed)|"
    r"support\s+pack.{0,60}(?:explain|contact\s+has\s+changed|autism|aac)",
    re.I,
)

LEADING_QUESTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bwhy did you\b", re.I),
    re.compile(r"\bwhy do you\b", re.I),
    re.compile(r"\bdid you do\b", re.I),
    re.compile(r"\bdid he\b", re.I),
    re.compile(r"\bdid she\b", re.I),
    re.compile(r"\bdid they\b", re.I),
    re.compile(r"\bwhat really happened\b", re.I),
    re.compile(r"\btell me the truth\b", re.I),
)

AUDIENCE_LABELS: dict[str, str] = {
    "child": "child",
    "young_person": "young person",
    "adult": "adult",
    "learning_disability": "person",
    "autism": "person",
    "unknown": "person",
}

CONTEXT_LABELS: dict[str, str] = {
    "contact": "contact with someone important",
    "health": "a hospital visit or health appointment",
    "safety": "safety and feeling secure",
    "routine": "daily routine",
    "transition": "a change or transition",
    "safeguarding": "keeping safe and being listened to",
    "behaviour_support": "support when things feel difficult",
    "medication": "medication and health support",
    "school": "a school change",
    "family_time": "family time",
    "social_worker": "a meeting with a social worker",
    "court": "a court or review meeting",
    "other": "something important",
}

VISUAL_SYMBOL_SEED: list[dict[str, Any]] = [
    {
        "id": "feeling-worried",
        "label": "Worried",
        "plain_language": "I feel worried.",
        "category": "feeling",
        "alt_text": "Placeholder symbol for worried",
        "safeguarding_sensitive": False,
    },
    {
        "id": "feeling-happy",
        "label": "Happy",
        "plain_language": "I feel happy.",
        "category": "feeling",
        "alt_text": "Placeholder symbol for happy",
        "safeguarding_sensitive": False,
    },
    {
        "id": "action-help",
        "label": "Help",
        "plain_language": "I need help.",
        "category": "action",
        "alt_text": "Placeholder symbol for help",
        "safeguarding_sensitive": False,
    },
    {
        "id": "response-yes",
        "label": "Yes",
        "plain_language": "Yes.",
        "category": "response",
        "alt_text": "Placeholder symbol for yes",
        "safeguarding_sensitive": False,
    },
    {
        "id": "response-no",
        "label": "No",
        "plain_language": "No.",
        "category": "response",
        "alt_text": "Placeholder symbol for no",
        "safeguarding_sensitive": False,
    },
    {
        "id": "action-stop",
        "label": "Stop",
        "plain_language": "Please stop.",
        "category": "action",
        "alt_text": "Placeholder symbol for stop",
        "safeguarding_sensitive": False,
    },
    {
        "id": "support-quiet",
        "label": "Quiet Space",
        "plain_language": "I need a quiet space.",
        "category": "support",
        "alt_text": "Placeholder symbol for quiet space",
        "safeguarding_sensitive": False,
    },
    {
        "id": "time-wait",
        "label": "Wait",
        "plain_language": "I need to wait.",
        "category": "time",
        "alt_text": "Placeholder symbol for wait",
        "safeguarding_sensitive": False,
    },
    {
        "id": "person-trusted",
        "label": "Trusted Adult",
        "plain_language": "A trusted adult can help.",
        "category": "person",
        "alt_text": "Placeholder symbol for trusted adult",
        "safeguarding_sensitive": False,
    },
    {
        "id": "place-hospital",
        "label": "Hospital",
        "plain_language": "Going to hospital.",
        "category": "place",
        "alt_text": "Placeholder symbol for hospital",
        "safeguarding_sensitive": False,
    },
    {
        "id": "health-medicine",
        "label": "Medicine",
        "plain_language": "My medicine.",
        "category": "health",
        "alt_text": "Placeholder symbol for medicine",
        "safeguarding_sensitive": False,
    },
    {
        "id": "support-safe",
        "label": "Safe",
        "plain_language": "I feel safe.",
        "category": "support",
        "alt_text": "Placeholder symbol for safe",
        "safeguarding_sensitive": False,
    },
    {
        "id": "support-unsafe",
        "label": "Unsafe",
        "plain_language": "Something feels unsafe.",
        "category": "support",
        "alt_text": "Placeholder symbol for unsafe",
        "safeguarding_sensitive": True,
    },
]

SAFETY_BOUNDARY_BASE: tuple[str, ...] = (
    "ORB Communicate supports accessible communication and safer recording. "
    "It does not replace professional judgement, safeguarding procedures, SALT, PBS, "
    "clinical advice or local policy.",
    "Accessible does not mean childish — use dignified, age-appropriate language.",
    "Do not assume capacity, understanding or communication method.",
    "Separate observation from interpretation in all delivery and recording.",
    "Visual card suggestions are placeholders only — no images are generated. "
    "Personalise before use.",
    "Visuals support understanding and dignity — they must not shame, threaten, "
    "frighten, punish or control.",
)

SAFEGUARDING_GUARDRAILS: tuple[str, ...] = (
    "Use calm, non-alarming language. Separate observation from interpretation.",
    "Avoid leading or investigative questions. Do not ask “why” where it may suggest blame.",
    "Record exact words, signs, gestures and observable responses — not assumptions.",
    "Prompt escalation under local safeguarding policy and manager review where indicated.",
    "ORB supports preparation and recording. It does not make findings or replace professional judgement.",
)


@dataclass
class CommunicationPlan:
    intent: CommunicateIntent
    safeguarding_mode: bool
    audience: CommunicateAudience
    include_social_story: bool
    easy_read_context: str


@dataclass
class SupportPackRequest:
    situation: str
    person_context: str | None = None
    communication_needs: str | None = None
    audience: CommunicateAudience = "young_person"
    pack_goal: str | None = None


@dataclass
class SupportPackOutput:
    easy_read_explanation: str
    visual_card_suggestions: list[dict[str, Any]]
    social_story_optional: str | None
    staff_delivery_guidance: str
    regulation_support: str
    safeguarding_reminders_if_relevant: list[str]
    reflect_and_record_prompts: list[str]
    reflective_record_starter: str
    source_chips: list[dict[str, Any]]
    safety_boundaries: list[str]
    intent: CommunicateIntent
    audience: CommunicateAudience
    brain_convergence: dict[str, Any] = field(default_factory=dict)
    active_final_domains: list[str] = field(default_factory=list)


class OrbCommunicateSupportPackService:
    VERSION = "orb-communicate-support-pack-v1"

    def strip_leading_questions(self, text: str) -> str:
        result = text
        for pattern in LEADING_QUESTION_PATTERNS:
            result = pattern.sub("staff observed", result)
        return result

    def text_contains_leading_questions(self, text: str) -> bool:
        return any(pattern.search(text) for pattern in LEADING_QUESTION_PATTERNS)

    def _normalise(self, text: str) -> str:
        return (text or "").strip().lower()

    def detect_intent(self, situation: str, pack_goal: str | None = None) -> CommunicateIntent:
        text = self._normalise(f"{situation} {pack_goal or ''}")
        if re.search(
            r"\b(safeguard|disclosure|told me|worried about|abuse|hurt|scared to tell|"
            r"something happened|kept secret)\b",
            text,
        ):
            return "safeguarding_disclosure"
        if re.search(r"\b(safe touch|unsafe touch|safe and unsafe|body safety|private parts)\b", text):
            return "safe_unsafe_communication"
        if re.search(r"\b(medication|medicine|tablet|inhaler|dose|prescription)\b", text):
            return "medication_explanation"
        if re.search(r"\b(hospital|hospital visit|hospital appointment|clinic|doctor|a&e|ae)\b", text):
            return "hospital_appointment"
        if re.search(r"\b(court|review meeting|looked after review|lac review)\b", text):
            return "court_review_meeting"
        if re.search(r"\b(social worker|sw visit|sw meeting)\b", text):
            return "social_worker_meeting"
        if re.search(r"\b(moving home|new home|placement move|transition to|moving to)\b", text):
            return "moving_home"
        if re.search(r"\b(school change|new school|changing school|school move)\b", text):
            return "school_change"
        if re.search(r"\b(family time|contact time|visiting family)\b", text):
            return "family_time"
        if re.search(
            r"\b(contact|mum|dad|parent|contact has changed|visiting (?:mum|dad|parent)|changed today)\b",
            text,
        ):
            return "contact_change"
        if re.search(r"\b(new staff|new worker|someone new|meet.*staff|starting.*shift)\b", text):
            return "new_staff_member"
        if re.search(r"\b(health appointment|gp appointment|dentist|optician)\b", text):
            return "health_appointment"
        if re.search(r"\b(appointment|visit|visiting)\b", text) and "hospital" not in text:
            return "health_appointment"
        if re.search(r"\b(bedtime|sleep|night|can't sleep|cant sleep|bed time)\b", text):
            return "bedtime_worries"
        if re.search(
            r"\b(how (they|he|she|i) feel|say how i feel|express.*feel|feelings|communicate.*feel)\b",
            text,
        ):
            return "feelings_expression"
        if re.search(r"\b(visual routine|routine board|now.?next|timetable|visual support)\b", text):
            return "visual_routine"
        return "general"

    def build_plan(self, request: SupportPackRequest) -> CommunicationPlan:
        intent = self.detect_intent(request.situation, request.pack_goal)
        safeguarding_mode = intent in {"safeguarding_disclosure", "safe_unsafe_communication"}
        include_social_story = intent in {"new_staff_member", "bedtime_worries", "feelings_expression"}

        context_map: dict[CommunicateIntent, str] = {
            "contact_change": "contact",
            "family_time": "family_time",
            "hospital_appointment": "health",
            "health_appointment": "health",
            "medication_explanation": "medication",
            "safeguarding_disclosure": "safeguarding",
            "safe_unsafe_communication": "safety",
            "new_staff_member": "transition",
            "moving_home": "transition",
            "school_change": "school",
            "social_worker_meeting": "social_worker",
            "court_review_meeting": "court",
            "bedtime_worries": "behaviour_support",
            "feelings_expression": "behaviour_support",
            "visual_routine": "routine",
            "general": "other",
        }
        return CommunicationPlan(
            intent=intent,
            safeguarding_mode=safeguarding_mode,
            audience=request.audience,
            include_social_story=include_social_story,
            easy_read_context=context_map.get(intent, "other"),
        )

    def _convergence_message(self, request: SupportPackRequest) -> str:
        parts = [
            "ORB Communicate support pack.",
            request.situation.strip(),
        ]
        if request.person_context:
            parts.append(f"Person context: {request.person_context.strip()}")
        if request.communication_needs:
            parts.append(f"Communication needs: {request.communication_needs.strip()}")
        if request.pack_goal:
            parts.append(f"Pack goal: {request.pack_goal.strip()}")
        parts.append(f"Audience: {request.audience.replace('_', ' ')}")
        return " ".join(parts)

    def _person_reference(self, audience: CommunicateAudience) -> str:
        label = AUDIENCE_LABELS.get(audience, "person")
        if audience == "unknown":
            return "the person"
        if audience in {"learning_disability", "autism"}:
            return f"the {label}"
        return f"the {label}"

    def _audience_delivery_notes(self, audience: CommunicateAudience, communication_needs: str | None) -> list[str]:
        notes: list[str] = []
        if audience == "autism":
            notes.append(
                "Consider predictable structure, reduced sensory load and extra processing time. "
                "Do not assume verbal understanding equals comprehension."
            )
        if audience == "learning_disability":
            notes.append(
                "Use concrete language and check understanding without leading questions. "
                "Accessible does not mean childish."
            )
        if audience == "unknown":
            notes.append(
                "Do not assume capacity, understanding or preferred communication method — "
                "offer choices and observe responses."
            )
        if communication_needs:
            notes.append(f"Respect stated communication needs: {communication_needs.strip()}.")
        return notes

    def _build_easy_read(
        self,
        request: SupportPackRequest,
        plan: CommunicationPlan,
    ) -> str:
        who = self._person_reference(plan.audience)
        topic = request.situation.strip() or "something that needs explaining"
        context_label = CONTEXT_LABELS.get(plan.easy_read_context, "something important")
        person_context = (request.person_context or "").strip()
        comm_needs = (request.communication_needs or "").strip()

        if plan.intent == "hospital_appointment":
            opening = (
                "Tomorrow you are going to hospital for a visit or appointment. "
                "A trusted adult will go with you. Staff will explain what is happening step by step."
            )
            what_happening = opening
        elif plan.intent == "health_appointment":
            what_happening = (
                f"This easy-read is about a health appointment. "
                f"{who.capitalize()} needs to understand: {topic}."
            )
        else:
            what_happening = (
                f"This easy-read is about {context_label}. "
                f"{who.capitalize()} needs to understand: {topic}."
            )

        sections = [
            "What is happening",
            what_happening,
            "",
            "Why it is happening",
            (
                "Adults want everyone to understand what is happening. "
                f"This matters because it affects {who} and the people who support them."
            ),
            "",
            "What happens next",
            (
                "A trusted adult will explain step by step. "
                "There will be time to ask questions, use communication support or take a break."
            ),
            "",
            "Who can help",
            (
                "Key workers, on-shift staff and trusted adults named in the care plan can help. "
                "If something feels unclear, the person can ask again or use their communication support."
            ),
            "",
            "How I can say how I feel",
            (
                "I can use words, signs, symbols or gestures that work for me. "
                "I can ask for space, help or a break. "
                "I can use a card or board to show how I feel."
            ),
        ]

        if person_context:
            sections.extend(["", "What staff know about me", person_context])
        if comm_needs:
            sections.extend(
                [
                    "",
                    "Communication support",
                    f"Support will be offered in a way that works for {who}: {comm_needs}.",
                ]
            )

        return self.strip_leading_questions("\n".join(sections))

    def _pick_visual_cards(
        self,
        plan: CommunicationPlan,
        *,
        count: int = 6,
    ) -> list[dict[str, Any]]:
        intent_priority_ids: list[str] = []
        if plan.intent in {"hospital_appointment"}:
            intent_priority_ids = ["place-hospital", "action-help", "response-yes", "response-no"]
        elif plan.intent == "medication_explanation":
            intent_priority_ids = ["health-medicine", "action-help", "response-yes", "response-no"]
        elif plan.intent == "safe_unsafe_communication":
            intent_priority_ids = ["support-safe", "support-unsafe", "action-help", "action-stop"]
        elif plan.intent in {"contact_change", "new_staff_member"}:
            intent_priority_ids = ["person-trusted", "time-wait", "feeling-worried", "action-help"]

        by_id = {symbol["id"]: symbol for symbol in VISUAL_SYMBOL_SEED}
        selected: list[dict[str, Any]] = []
        used: set[str] = set()

        def add_card(symbol: dict[str, Any]) -> None:
            if symbol["id"] in used or len(selected) >= count:
                return
            if plan.safeguarding_mode and symbol.get("safeguarding_sensitive"):
                card = {
                    **symbol,
                    "staff_note": "Handle with care — follow local safeguarding guidance.",
                }
            else:
                card = dict(symbol)
            selected.append(card)
            used.add(symbol["id"])

        for symbol_id in intent_priority_ids:
            symbol = by_id.get(symbol_id)
            if symbol:
                add_card(symbol)

        preferred_categories: list[str] = ["feeling", "response", "action", "support"]
        if plan.intent in {"contact_change", "new_staff_member"}:
            preferred_categories.extend(["person", "time"])
        if plan.intent in {"hospital_appointment", "medication_explanation"}:
            preferred_categories.extend(["health", "place"])
        if plan.intent == "safe_unsafe_communication":
            preferred_categories.extend(["support"])

        for category in preferred_categories:
            for symbol in VISUAL_SYMBOL_SEED:
                if len(selected) >= count:
                    break
                if symbol["category"] != category:
                    continue
                add_card(symbol)

        for symbol in VISUAL_SYMBOL_SEED:
            if len(selected) >= count:
                break
            add_card(symbol)

        return selected

    def _build_social_story(self, request: SupportPackRequest, plan: CommunicationPlan) -> str | None:
        if not plan.include_social_story:
            return None

        situation = request.situation.strip() or "a situation that matters"
        tone_intro = {
            "new_staff_member": "This story helps prepare for meeting someone new.",
            "bedtime_worries": "This story is written in a calm, steady way.",
            "feelings_expression": "This story is written to offer reassurance.",
        }.get(plan.intent, "This story is written in a calm, steady way.")

        paragraphs = [
            tone_intro,
            (
                f"Sometimes when {situation.lower()} things can feel different."
                if not situation.lower().startswith("when")
                else f"Sometimes {situation} things can feel different."
            ),
            "It is okay if this feels hard sometimes.",
            "Adults will help me understand what is happening.",
            "I can ask for help from a trusted adult.",
            "I can ask for space or use my communication support.",
            "I can use my card to show how I feel.",
            "Trusted adults are nearby to help.",
        ]
        return self.strip_leading_questions("\n\n".join(paragraphs))

    def _build_staff_delivery_guidance(
        self,
        request: SupportPackRequest,
        plan: CommunicationPlan,
    ) -> str:
        lines = [
            "Use plain British English. Keep sentences short and dignified.",
            "Distinguish what staff observed from what staff interpret.",
            "Offer choices and check understanding without leading questions.",
            (
                'Use language such as “appeared to understand because…”, '
                '“communicated by…” and “staff observed…”.'
            ),
            "Avoid judgemental labels — describe observable behaviour instead.",
            "Keep the child or young person's voice central in delivery and recording.",
            *self._audience_delivery_notes(plan.audience, request.communication_needs),
        ]
        if plan.safeguarding_mode:
            lines.extend(SAFEGUARDING_GUARDRAILS)
        return self.strip_leading_questions("\n".join(lines))

    def _build_regulation_support(self, request: SupportPackRequest) -> str:
        lines = [
            "Offer a quiet space or regulated activity before and after communication support.",
            "Use now/next or visual timetable cues if helpful.",
            "Co-regulate — match pace and reduce demands where needed.",
            (
                "Visuals should support understanding, dignity, choice and communication — "
                "not control, shame or punishment."
            ),
            "",
            "• Offer a quiet space or regulated activity before and after.",
            "• Use a visual timetable or now/next board if helpful.",
            "• Co-regulate — match pace and reduce demands where needed.",
        ]
        if request.person_context:
            lines.append(f"• Consider known person context: {request.person_context.strip()}")
        return self.strip_leading_questions("\n".join(lines))

    def _build_reflect_and_record_prompts(self, plan: CommunicationPlan) -> list[str]:
        prompts = [
            "What exact words, signs or gestures did the person use?",
            "What support was offered and what did the person choose?",
            "What appeared to help or not help — based on observable responses?",
            "What will staff do next and who needs to know?",
        ]
        if plan.safeguarding_mode:
            prompts.extend(
                [
                    "What exact words, signs or gestures did the person use — recorded factually?",
                    "Who has been informed under local safeguarding policy?",
                    "What manager or safeguarding lead review is needed before sharing further?",
                ]
            )
        return [self.strip_leading_questions(prompt) for prompt in prompts]

    def _build_reflective_record_starter(
        self,
        request: SupportPackRequest,
        plan: CommunicationPlan,
    ) -> str:
        explained = request.situation.strip() or "information shared with the person"
        parts = [
            f"Staff offered accessible explanation about {explained}.",
            "Communication support used: accessible explanation and visual support from ORB Communicate.",
            "Staff to record observable response after delivery.",
        ]
        if plan.safeguarding_mode:
            parts.extend(
                [
                    "Safeguarding, health or risk note (factual): Record factual concerns only. "
                    "Follow local safeguarding procedures.",
                    "Next steps: Share with manager or safeguarding lead under local policy. Do not investigate.",
                ]
            )
        else:
            parts.append(
                "Next steps: Review with on-shift team and update records as appropriate."
            )
        return self.strip_leading_questions("\n\n".join(parts))

    def _build_safety_boundaries(self, plan: CommunicationPlan) -> list[str]:
        boundaries = list(SAFETY_BOUNDARY_BASE)
        if plan.safeguarding_mode:
            boundaries.extend(SAFEGUARDING_GUARDRAILS[:2])
        return boundaries

    def build_support_pack(self, request: SupportPackRequest) -> SupportPackOutput:
        plan = self.build_plan(request)
        message = self._convergence_message(request)

        decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
            message,
            mode="Communicate",
            feature="communicate",
            source_surface="communicate",
            route="/orb/communicate/support-pack",
        )
        convergence = orb_brain_convergence_orchestrator_service.convergence_metadata(
            decision,
            route="/orb/communicate/support-pack",
        )
        source_chips = list(convergence.get("public_source_chips") or [])

        return SupportPackOutput(
            easy_read_explanation=self._build_easy_read(request, plan),
            visual_card_suggestions=self._pick_visual_cards(plan),
            social_story_optional=self._build_social_story(request, plan),
            staff_delivery_guidance=self._build_staff_delivery_guidance(request, plan),
            regulation_support=self._build_regulation_support(request),
            safeguarding_reminders_if_relevant=(
                list(SAFEGUARDING_GUARDRAILS) if plan.safeguarding_mode else []
            ),
            reflect_and_record_prompts=self._build_reflect_and_record_prompts(plan),
            reflective_record_starter=self._build_reflective_record_starter(request, plan),
            source_chips=source_chips,
            safety_boundaries=self._build_safety_boundaries(plan),
            intent=plan.intent,
            audience=plan.audience,
            brain_convergence=convergence,
            active_final_domains=list(convergence.get("active_final_domains") or []),
        )

    def to_response_dict(self, output: SupportPackOutput) -> dict[str, Any]:
        return {
            "success": True,
            "intent": output.intent,
            "audience": output.audience,
            "easy_read_explanation": output.easy_read_explanation,
            "visual_card_suggestions": output.visual_card_suggestions,
            "social_story_optional": output.social_story_optional,
            "staff_delivery_guidance": output.staff_delivery_guidance,
            "regulation_support": output.regulation_support,
            "safeguarding_reminders_if_relevant": output.safeguarding_reminders_if_relevant,
            "reflect_and_record_prompts": output.reflect_and_record_prompts,
            "reflective_record_starter": output.reflective_record_starter,
            "source_chips": output.source_chips,
            "safety_boundaries": output.safety_boundaries,
            "active_final_domains": output.active_final_domains,
            "brain_convergence": output.brain_convergence,
            "standalone_boundary": True,
            "service": self.VERSION,
        }

    def is_communicate_support_pack_request(self, message: str) -> bool:
        return bool(COMMUNICATE_SUPPORT_PACK_REQUEST_RE.search(str(message or "")))

    def parse_support_pack_request_from_message(self, message: str) -> SupportPackRequest:
        text = str(message or "").strip()
        lower = text.lower()
        audience: CommunicateAudience = "autism" if re.search(r"\bautis", lower) else "young_person"
        communication_needs = None
        if re.search(r"\bautis", lower):
            communication_needs = "autism — predictable structure, processing time, reduced sensory load"
        elif re.search(r"\b(?:aac|symbol|widget|non[\s-]?verbal|gesture)\b", lower):
            communication_needs = "AAC/symbols/gestures — check understanding without leading questions"
        return SupportPackRequest(
            situation=text,
            person_context=communication_needs,
            communication_needs=communication_needs,
            audience=audience,
            pack_goal="Explain clearly using accessible communication support",
        )

    def build_support_pack_from_message(self, message: str) -> SupportPackOutput:
        return self.build_support_pack(self.parse_support_pack_request_from_message(message))

    def format_support_pack_for_chat(self, output: SupportPackOutput) -> str:
        from assistant.knowledge.adult_identity_language import sanitize_visible_final_answer

        visual_lines = []
        for card in output.visual_card_suggestions[:8]:
            label = str(card.get("label") or card.get("plain_language") or "Card")
            plain = str(card.get("plain_language") or label)
            visual_lines.append(f"- **{label}** — {plain}")

        reflect_lines = [f"- {prompt}" for prompt in output.reflect_and_record_prompts[:6]]
        boundary_lines = [f"- {item}" for item in output.safety_boundaries[:6]]

        sections = [
            "## Easy-read explanation",
            output.easy_read_explanation.strip(),
            "",
            "## Visual card suggestions",
            *(visual_lines or ["- [Add personalised visual cards before use]"]),
            "",
            "## Staff delivery guidance",
            output.staff_delivery_guidance.strip(),
        ]
        if output.regulation_support.strip():
            sections.extend(["", "## Regulation support", output.regulation_support.strip()])
        if output.safeguarding_reminders_if_relevant:
            sections.extend(
                [
                    "",
                    "## Safeguarding reminders (if relevant)",
                    *[f"- {item}" for item in output.safeguarding_reminders_if_relevant[:4]],
                ]
            )
        sections.extend(
            [
                "",
                "## Reflect and record prompts",
                *reflect_lines,
                "",
                "## Reflective record starter",
                output.reflective_record_starter.strip(),
                "",
                "## Safety boundaries",
                *boundary_lines,
            ]
        )
        formatted = "\n".join(sections).strip()
        return sanitize_visible_final_answer(formatted, source_text=output.easy_read_explanation)


orb_communicate_support_pack_service = OrbCommunicateSupportPackService()
