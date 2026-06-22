from __future__ import annotations

"""Child Story Intelligence for ORB Residential.

This is ORB's lived-experience dignity layer. It does not replace safeguarding,
recording or regulatory decisions. It asks whether the words adults leave behind
are factual, fair, kind, child-centred and safe to stand as part of a child's story.
"""

import re
from dataclasses import asdict, dataclass, field
from typing import Any


_JUDGEMENTAL_TERMS: tuple[str, ...] = (
    "attention seeking",
    "manipulative",
    "naughty",
    "bad behaviour",
    "kicked off",
    "played up",
    "non-compliant",
    "non compliant",
    "defiant",
    "overreacted",
    "lied",
    "lying",
    "making allegations",
    "refused for no reason",
    "just wanted attention",
)

_FACTUALITY_RISK_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("unstated_feeling", re.compile(r"\b(the child|young person|he|she|they) felt\b", re.I)),
    ("unstated_motive", re.compile(r"\b(wanted attention|did it because|chose to|deliberately)\b", re.I)),
    ("closed_decision", re.compile(r"\b(no further action needed|no safeguarding concern|fully compliant)\b", re.I)),
)

_CHILD_VOICE_MARKERS: tuple[str, ...] = (
    "child said",
    "young person said",
    "said that",
    "told staff",
    "shared",
    "stated",
    "wishes",
    "feelings",
    "views",
    "voice",
    "communicated",
    "appeared",
    "presentation",
)

_ADULT_RESPONSE_MARKERS: tuple[str, ...] = (
    "staff supported",
    "staff offered",
    "adult supported",
    "staff responded",
    "co-regulation",
    "de-escalation",
    "listened",
    "reassured",
    "space was offered",
    "repair",
    "debrief",
)


@dataclass(frozen=True)
class ChildStoryReview:
    active: bool
    score: int
    strengths: list[str] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    source_anchors: list[str] = field(default_factory=list)
    prompt_lines: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbChildStoryIntelligenceService:
    VERSION = "orb-child-story-intelligence-v1"

    def should_activate(self, text: str, *, mode: str | None = None, feature: str | None = None, note_type: str | None = None) -> bool:
        blob = f"{text or ''} {mode or ''} {feature or ''} {note_type or ''}".lower()
        return any(
            term in blob
            for term in (
                "record",
                "daily note",
                "daily record",
                "incident",
                "missing",
                "restraint",
                "key work",
                "keywork",
                "child voice",
                "rewrite",
                "write this",
                "dictate",
                "manager oversight",
                "reg 44",
                "reg 45",
                "young person",
                "child",
            )
        )

    def review(
        self,
        text: str,
        *,
        mode: str | None = None,
        feature: str | None = None,
        note_type: str | None = None,
    ) -> ChildStoryReview:
        body = (text or "").strip()
        if not self.should_activate(body, mode=mode, feature=feature, note_type=note_type):
            return ChildStoryReview(active=False, score=100)

        lower = body.lower()
        strengths: list[str] = []
        gaps: list[str] = []
        flags: list[str] = []

        if any(marker in lower for marker in _CHILD_VOICE_MARKERS):
            strengths.append("Child voice or presentation is visible.")
        else:
            gaps.append("Child voice, wishes, feelings or observed communication are not yet clear.")

        if any(marker in lower for marker in _ADULT_RESPONSE_MARKERS):
            strengths.append("Adult response/support is visible.")
        else:
            gaps.append("What adults did to help, co-regulate, listen or repair is not yet clear.")

        judgemental = [term for term in _JUDGEMENTAL_TERMS if term in lower]
        if judgemental:
            flags.extend(f"judgemental_language:{term}" for term in judgemental[:5])
            gaps.append("Review judgemental or shaming language and replace with observable wording.")
        else:
            strengths.append("No obvious judgemental shorthand detected.")

        for label, pattern in _FACTUALITY_RISK_PATTERNS:
            if pattern.search(body):
                flags.append(label)
        if any(flag in flags for flag in ("unstated_feeling", "unstated_motive")):
            gaps.append("Separate observation from interpretation; use 'appeared' or 'may have communicated' where appropriate.")
        if "closed_decision" in flags:
            gaps.append("Avoid closing safeguarding/compliance decisions in the wording; leave accountable review to the responsible adult.")

        if "record" in lower or "incident" in lower or "daily" in lower:
            strengths.append("Recording context detected; dignity and future-readability check is required.")

        score = 100
        score -= min(35, len(gaps) * 10)
        score -= min(30, len(flags) * 8)
        score = max(0, score)

        prompt_lines = [
            "Child Story Intelligence:",
            "- Write as though the child may read this record later.",
            "- Keep the wording factual, fair, kind and clear without minimising risk.",
            "- Separate observation from interpretation; do not state motives or feelings as fact unless the child said them.",
            "- Include the child's words, wishes, feelings, presentation or communication where known.",
            "- Show what adults did to help, protect, listen, co-regulate, repair or follow up.",
            "- Never invent child voice, quotes, feelings, actions or outcomes.",
        ]
        if gaps:
            prompt_lines.append("- Gaps to consider: " + "; ".join(gaps[:4]))

        return ChildStoryReview(
            active=True,
            score=score,
            strengths=strengths[:6],
            gaps=gaps[:8],
            flags=flags[:8],
            source_anchors=["[Recording quality]", "[Future record access]", "[Child voice]", "[Quality Standards]"],
            prompt_lines=prompt_lines,
        )

    def context_payload(self, text: str, **kwargs: Any) -> dict[str, Any]:
        review = self.review(text, **kwargs)
        payload = review.to_dict()
        payload["service_version"] = self.VERSION
        return payload

    def prompt_block(self, text: str, **kwargs: Any) -> str:
        review = self.review(text, **kwargs)
        if not review.active:
            return ""
        return "\n".join(review.prompt_lines)


orb_child_story_intelligence_service = OrbChildStoryIntelligenceService()
