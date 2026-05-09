from __future__ import annotations

import re
from typing import Any

from services.indicare_ai_cross_system_service import IndiCareAICrossSystemService
from services.indicare_ai_memory_service import IndiCareAIMemoryService


class IndiCareAIMeetingIntelligenceService:
    """Live operational meeting intelligence for the standalone IndiCare AI suite.

    This turns transcripts into reflective operational intelligence: actions,
    unresolved follow-up, chronology candidates, safeguarding-sensitive themes and
    continuity memory. It is intentionally not a generic minutes generator.
    """

    def __init__(self) -> None:
        self.memory = IndiCareAIMemoryService()
        self.cross_system = IndiCareAICrossSystemService()

    def analyse_meeting(
        self,
        *,
        transcript: str,
        current_user: dict[str, Any],
        project_id: str | None = None,
        meeting_title: str | None = None,
        participants: list[str] | None = None,
        home_id: int | None = None,
        young_person_id: int | None = None,
        persist_memory: bool = True,
    ) -> dict[str, Any]:
        clean_transcript = self._clean(transcript)[:60000]
        participants = [p.strip() for p in (participants or []) if str(p).strip()]
        themes = self._themes(clean_transcript)
        actions = self._actions(clean_transcript)
        unresolved = self._unresolved(clean_transcript)
        chronology = self._chronology_candidates(clean_transcript)
        safeguarding = self._safeguarding_signals(clean_transcript)
        emotional = self._emotional_themes(clean_transcript)
        reflective_summary = self._reflective_summary(
            transcript=clean_transcript,
            themes=themes,
            actions=actions,
            unresolved=unresolved,
            safeguarding=safeguarding,
            emotional=emotional,
        )
        title = meeting_title or "I-Notes meeting intelligence"
        cross = self.cross_system.build_operational_picture(
            question=f"Analyse this meeting for operational themes, actions, safeguarding signals and continuity: {title}",
            current_user=current_user,
            project_id=project_id,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=6,
        )
        memory_result = None
        if persist_memory:
            memory_result = self.memory.add_memory(
                current_user=current_user,
                title=f"Meeting continuity: {title}"[:180],
                summary=reflective_summary[:3000],
                themes=themes,
                project_id=project_id,
                conversation_id=None,
                mode="children_home_specialist",
                memory_type="meeting_intelligence",
                home_id=home_id,
                young_person_id=young_person_id,
                source="i_notes_meeting",
                confidence=0.78,
            )
        return {
            "ok": True,
            "surface": "indicare_ai_standalone_tools",
            "mode": "meeting_intelligence",
            "meeting_title": title,
            "participants": participants,
            "summary": reflective_summary,
            "themes": themes,
            "actions": actions,
            "unresolved_followups": unresolved,
            "chronology_candidates": chronology,
            "safeguarding_signals": safeguarding,
            "emotional_themes": emotional,
            "cross_system_context": {
                "sources": cross.get("sources", []),
                "insights": cross.get("insights", {}).get("summary", {}),
            },
            "memory": memory_result,
            "suggested_prompts": self._suggested_prompts(themes, unresolved, safeguarding),
        }

    def _clean(self, text: str) -> str:
        return re.sub(r"\s+", " ", str(text or "")).strip()

    def _sentences(self, text: str) -> list[str]:
        raw = re.split(r"(?<=[.!?])\s+|\n+", text or "")
        return [self._clean(item) for item in raw if self._clean(item)]

    def _themes(self, text: str) -> list[str]:
        q = text.lower()
        checks = [
            ("safeguarding", r"safeguarding|disclosure|allegation|threshold|mash|lado|social worker"),
            ("incident follow-up", r"incident|restraint|physical intervention|de-escalation|missing episode|police"),
            ("transitions", r"transition|handover|transport|contact|arrival|leaving|moving between"),
            ("recording quality", r"record|recording|wording|evidence|chronology|language"),
            ("staff consistency", r"staff|consistency|agency|handover|communication|shift"),
            ("emotional wellbeing", r"upset|anxious|worried|distressed|dysregulated|emotional"),
            ("education", r"school|education|attendance|teacher|college"),
            ("family time", r"contact|family time|parent|mum|dad|sibling"),
            ("leadership oversight", r"manager|oversight|review|supervision|audit|quality"),
        ]
        return [label for label, pattern in checks if re.search(pattern, q)][:12]

    def _actions(self, text: str) -> list[dict[str, Any]]:
        actions = []
        markers = r"\b(action|need to|needs to|will|must|should|follow up|review|check|speak to|contact|arrange|update)\b"
        for sentence in self._sentences(text):
            if re.search(markers, sentence, flags=re.I):
                actions.append({"text": sentence[:500], "status": "proposed", "owner": self._owner(sentence)})
            if len(actions) >= 20:
                break
        return actions

    def _unresolved(self, text: str) -> list[dict[str, Any]]:
        items = []
        markers = r"unresolved|not done|still waiting|awaiting|missing|gap|unclear|not clear|needs follow|follow-up|follow up|left open|not yet"
        for sentence in self._sentences(text):
            if re.search(markers, sentence, flags=re.I):
                items.append({"text": sentence[:500], "reason": "possible unresolved follow-up or evidence gap"})
            if len(items) >= 15:
                break
        return items

    def _chronology_candidates(self, text: str) -> list[dict[str, Any]]:
        items = []
        markers = r"yesterday|today|tonight|this morning|this evening|last week|incident|contact|school|missing|restraint|police|hospital|appointment"
        for sentence in self._sentences(text):
            if re.search(markers, sentence, flags=re.I):
                items.append({"text": sentence[:500], "type": "possible_chronology_entry"})
            if len(items) >= 20:
                break
        return items

    def _safeguarding_signals(self, text: str) -> list[dict[str, Any]]:
        items = []
        markers = r"safeguarding|risk|harm|disclosure|allegation|missing|police|restraint|physical intervention|self-harm|exploitation|mash|lado"
        for sentence in self._sentences(text):
            if re.search(markers, sentence, flags=re.I):
                items.append({"text": sentence[:500], "note": "review with manager/DSL as appropriate"})
            if len(items) >= 15:
                break
        return items

    def _emotional_themes(self, text: str) -> list[dict[str, Any]]:
        items = []
        markers = r"upset|angry|anxious|worried|distressed|calm|dysregulated|tearful|overwhelmed|frustrated|scared|unsafe"
        for sentence in self._sentences(text):
            if re.search(markers, sentence, flags=re.I):
                items.append({"text": sentence[:420], "theme": "emotional tone"})
            if len(items) >= 12:
                break
        return items

    def _owner(self, sentence: str) -> str | None:
        match = re.search(r"\b(Tom|manager|staff|key worker|RM|deputy|social worker|school|DSL)\b", sentence, flags=re.I)
        return match.group(0) if match else None

    def _reflective_summary(
        self,
        *,
        transcript: str,
        themes: list[str],
        actions: list[dict[str, Any]],
        unresolved: list[dict[str, Any]],
        safeguarding: list[dict[str, Any]],
        emotional: list[dict[str, Any]],
    ) -> str:
        parts = []
        if themes:
            parts.append(f"The discussion appears to centre on {', '.join(themes[:5])}.")
        else:
            parts.append("The discussion appears to contain operational context that may need reviewing against records and actions.")
        if safeguarding:
            parts.append("There are safeguarding-sensitive references that should be considered carefully with appropriate manager or DSL oversight.")
        if unresolved:
            parts.append("There are possible unresolved follow-ups or evidence gaps that may need clarifying after the meeting.")
        if actions:
            parts.append(f"I identified {len(actions)} possible action or follow-up point(s).")
        if emotional:
            parts.append("The emotional tone suggests there may be wellbeing or dysregulation themes worth reflecting on, rather than only task completion.")
        parts.append("This should be treated as reflective meeting intelligence, not a final professional decision or safeguarding threshold judgement.")
        return " ".join(parts)

    def _suggested_prompts(self, themes: list[str], unresolved: list[dict[str, Any]], safeguarding: list[dict[str, Any]]) -> list[str]:
        prompts = ["Turn this meeting into a reflective operational summary with clear actions."]
        if unresolved:
            prompts.append("Help me turn unresolved follow-ups from this meeting into a clear action list.")
        if safeguarding:
            prompts.append("Help me review the safeguarding-sensitive parts carefully, separating facts, concerns and next actions.")
        if themes:
            prompts.append(f"Compare these meeting themes with recent chronology and continuity memory: {', '.join(themes[:4])}.")
        return prompts[:5]
