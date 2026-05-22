from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from repositories.isn_repository import isn_repository

SAFE_TERMS = ["safe", "trusted", "calm", "help", "support"]
UNSAFE_TERMS = ["scared", "unsafe", "fear", "worried", "threat", "forced", "trapped"]
LOCATION_TERMS = ["station", "hotel", "park", "taxi", "house", "flat", "school"]


class ISNChildVoiceService:
    """Correlates child voice and safeguarding intelligence through a trauma-informed lens."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def correlation(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        limit: int = 1000,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(
            conn,
            current_user=current_user,
            filters={"young_person_id": young_person_id} if young_person_id else {},
            limit=limit,
        )

        voice_entries = []
        emotional_indicators: Counter[str] = Counter()
        contextual_locations: Counter[str] = Counter()
        linked_signal_ids: dict[str, list[str]] = defaultdict(list)

        for signal in signals:
            text = " ".join(
                str(value or "")
                for value in [signal.summary, signal.intelligence_notes]
            ).lower()

            if not text:
                continue

            emotions = self._emotion_terms(text)
            locations = self._location_terms(text)

            for emotion in emotions:
                emotional_indicators[emotion] += 1
                linked_signal_ids[emotion].append(signal.id)

            for location in locations:
                contextual_locations[location] += 1
                linked_signal_ids[location].append(signal.id)

            voice_entries.append(
                {
                    "signal_id": signal.id,
                    "risk_level": signal.risk_level,
                    "voice_summary": signal.summary,
                    "emotional_indicators": emotions,
                    "contextual_locations": locations,
                    "signal_type": signal.signal_type,
                }
            )

        return {
            "ok": True,
            "country": "UK",
            "young_person_id": young_person_id,
            "voice_entries": voice_entries,
            "emotional_mapping": [
                {
                    "indicator": key,
                    "count": value,
                    "linked_signal_ids": linked_signal_ids[key],
                }
                for key, value in emotional_indicators.most_common()
            ],
            "contextual_locations": [
                {
                    "location": key,
                    "count": value,
                    "linked_signal_ids": linked_signal_ids[key],
                }
                for key, value in contextual_locations.most_common()
            ],
            "principle": "Child voice must sit alongside contextual safeguarding intelligence.",
        }

    def _emotion_terms(self, text: str) -> list[str]:
        output = []
        for term in SAFE_TERMS:
            if term in text:
                output.append(f"protective:{term}")
        for term in UNSAFE_TERMS:
            if term in text:
                output.append(f"vulnerability:{term}")
        return output

    def _location_terms(self, text: str) -> list[str]:
        return [term for term in LOCATION_TERMS if term in text]


isn_child_voice_service = ISNChildVoiceService()
