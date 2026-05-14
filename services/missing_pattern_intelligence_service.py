from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any

from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, citation, evidence_gap, record_text, review_prompt, safe_payload, scope_records


class MissingPatternIntelligenceService:
    """Detects repeated missing-from-care patterns without predicting certainty."""

    def analyse(
        self,
        *,
        missing_episodes: list[dict[str, Any]],
        records: list[dict[str, Any]] | None = None,
        young_person_id: int | str | None = None,
        home_id: int | str | None = None,
    ) -> dict[str, Any]:
        episodes = scope_records(missing_episodes, young_person_id=young_person_id, home_id=home_id)
        related = scope_records(records or [], young_person_id=young_person_id, home_id=home_id)
        day_counts, time_counts = self._day_time_counts(episodes)
        locations = self._count_terms(episodes, ("location", "found_at", "returned_from"))
        associates = self._count_terms(episodes, ("associate", "peer", "family_link"))
        routes = self._count_terms(episodes, ("route", "transport_route"))
        triggers = self._trigger_counts([*episodes, *related])
        return_patterns = self._count_terms(episodes, ("return_presentation", "presentation_after_return", "returned_with"))
        gaps = self._gaps(episodes)
        prompts = self._orb_prompts(locations, triggers, time_counts, gaps)
        payload = {
            "summary": "records indicate missing-from-care patterns are available for professional review.",
            "episode_count": len(episodes),
            "repeated_missing_days_times": self._top(day_counts, "day") + self._top(time_counts, "time"),
            "repeated_emotional_triggers": self._top(triggers, "trigger"),
            "repeated_locations": self._top(locations, "location"),
            "repeated_associates": self._top(associates, "associate"),
            "repeated_transport_routes": self._top(routes, "route"),
            "repeated_family_peer_links": self._family_peer_links([*episodes, *related]),
            "repeated_return_patterns": self._top(return_patterns, "return_pattern"),
            "debrief_gaps": [gap for gap in gaps if gap["gap_id"] == "debrief"],
            "return_home_interview_gaps": [gap for gap in gaps if gap["gap_id"] == "return-home-interview"],
            "chronology_gaps": [gap for gap in gaps if gap["gap_id"] == "chronology"],
            "risk_review_gaps": [gap for gap in gaps if gap["gap_id"] == "risk-review"],
            "evidence_refs": [citation(episode, reason="evidence found: missing episode included in pattern review.") for episode in episodes],
            "orb_prompts": prompts,
            "review_prompts": [
                review_prompt("missing-plan-review", "review recommended: update missing protocol if repeated patterns remain current."),
                review_prompt("return-work-review", "consider checking return-home interview and debrief completion."),
            ],
            "limitations": [
                "records indicate these are historic patterns, not predictions.",
                "pattern suggests review only when source records confirm context.",
            ],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        return safe_payload(payload)

    def _day_time_counts(self, episodes: list[dict[str, Any]]) -> tuple[Counter[str], Counter[str]]:
        days: Counter[str] = Counter()
        times: Counter[str] = Counter()
        for episode in episodes:
            raw = episode.get("started_at") or episode.get("dateTime") or episode.get("date") or episode.get("created_at")
            if not raw:
                continue
            try:
                dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            except ValueError:
                continue
            days[dt.strftime("%A")] += 1
            bucket = "late evening" if dt.hour >= 20 else "evening" if dt.hour >= 17 else "afternoon" if dt.hour >= 12 else "morning"
            times[bucket] += 1
        return days, times

    def _count_terms(self, records: list[dict[str, Any]], fields: tuple[str, ...]) -> Counter[str]:
        counts: Counter[str] = Counter()
        for record in records:
            for name in fields:
                value = record.get(name)
                if isinstance(value, list):
                    counts.update(str(item) for item in value if item)
                elif value:
                    counts[str(value)] += 1
        return counts

    def _trigger_counts(self, records: list[dict[str, Any]]) -> Counter[str]:
        counts: Counter[str] = Counter()
        for record in records:
            text = record_text(record).lower()
            for label, terms in {
                "family contact": ("family", "mum", "dad", "contact"),
                "education pressure": ("school", "education", "timetable"),
                "routine disruption": ("cancel", "change", "routine"),
                "peer conflict": ("peer", "friend", "argument"),
                "poor sleep": ("sleep", "tired"),
            }.items():
                if any(term in text for term in terms):
                    counts[label] += 1
        return counts

    def _family_peer_links(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        links = []
        for label, count in self._trigger_counts(records).items():
            if label in {"family contact", "peer conflict"} and count >= 1:
                links.append({"link": label, "count": count, "summary": f"pattern suggests {label} appears in visible records."})
        return links

    def _gaps(self, episodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        gaps = []
        for episode in episodes:
            if not (episode.get("debrief_completed") or episode.get("debriefCompleted")):
                gaps.append(evidence_gap("debrief", "no evidence found: debrief completion is not visible for one episode."))
            if not (episode.get("return_home_interview_completed") or episode.get("returnHomeInterviewCompleted")):
                gaps.append(evidence_gap("return-home-interview", "no evidence found: return-home interview completion is not visible for one episode."))
            if not (episode.get("chronology_link_id") or episode.get("chronologyLinkId")):
                gaps.append(evidence_gap("chronology", "no evidence found: chronology link is not visible for one episode."))
            if not (episode.get("risk_review_completed") or episode.get("riskReviewCompleted")):
                gaps.append(evidence_gap("risk-review", "no evidence found: risk review completion is not visible for one episode."))
        return gaps

    def _top(self, counts: Counter[str], key: str) -> list[dict[str, Any]]:
        return [{"type": key, "value": value, "count": count, "summary": f"pattern suggests repeated {key}: {value}."} for value, count in counts.most_common() if count >= 1]

    def _orb_prompts(
        self,
        locations: Counter[str],
        triggers: Counter[str],
        time_counts: Counter[str],
        gaps: list[dict[str, Any]],
    ) -> list[str]:
        prompts = []
        if locations:
            prompts.append(f"records indicate previous missing episodes link to {locations.most_common(1)[0][0]}.")
        if triggers:
            prompts.append(f"pattern suggests missing episodes often follow {triggers.most_common(1)[0][0]}.")
        if time_counts:
            prompts.append(f"records suggest {time_counts.most_common(1)[0][0]} missing patterns.")
        if any(gap["gap_id"] == "return-home-interview" for gap in gaps):
            prompts.append("review recommended: a return-home interview appears overdue or not visible.")
        return prompts


missing_pattern_intelligence_service = MissingPatternIntelligenceService()
