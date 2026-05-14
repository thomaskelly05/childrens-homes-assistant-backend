from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from typing import Any

from schemas.data_intelligence import ChronologyCluster, IntelligenceRecord
from services.intelligence_cache_service import intelligence_cache_service
from services.regulatory_graph_service import _as_metadata, _event_date, _in_scope, _record_id, _summary, _title


CLUSTER_THEMES = (
    "emotional_wellbeing",
    "safeguarding",
    "missing_episodes",
    "education",
    "health",
    "family_contact",
    "positive_progress",
    "placement_stability",
    "relationships",
    "keywork_direct_work",
    "incidents",
    "management_oversight",
)


def _cluster_id(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str, ensure_ascii=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


class ChronologyClusterService:
    """Builds metadata-driven chronology cluster summaries before raw event retrieval."""

    def cluster_records(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        scope: dict[str, Any] | None = None,
    ) -> list[ChronologyCluster]:
        buckets: dict[tuple[int | None, int | None, str], list[IntelligenceRecord | dict[str, Any]]] = defaultdict(list)
        for record in records:
            if not _in_scope(record, scope):
                continue
            metadata = _as_metadata(record)
            if not metadata:
                continue
            for theme in self._themes_for_record(record):
                buckets[(metadata.operational.young_person_id, metadata.operational.home_id, theme)].append(record)

        clusters: list[ChronologyCluster] = []
        for (young_person_id, home_id, theme), items in buckets.items():
            clusters.append(self._build_cluster(young_person_id=young_person_id, home_id=home_id, theme=theme, records=items))
        return sorted(clusters, key=lambda item: (item.theme, item.date_range.get("start") or ""))

    def cluster_summaries(
        self,
        records: list[IntelligenceRecord | dict[str, Any]],
        *,
        scope: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        return [cluster.model_dump(mode="json") for cluster in self.cluster_records(records, scope=scope)]

    def themes_for_metadata(self, metadata: Any) -> list[str]:
        care = metadata.care
        themes = {
            "emotional_wellbeing": care.emotional_wellbeing_present,
            "safeguarding": care.safeguarding_marker or care.risk_marker,
            "missing_episodes": care.missing_marker,
            "education": care.education_present,
            "health": care.health_present,
            "family_contact": care.family_contact_present,
            "positive_progress": care.positive_progress_present,
            "relationships": care.relationship_present,
            "keywork_direct_work": metadata.operational.record_type == "keywork_direct_work",
            "incidents": care.incident_marker or metadata.operational.record_type == "incident",
            "management_oversight": care.manager_review_required,
        }
        selected = [theme for theme, present in themes.items() if present]
        return selected or ["placement_stability"]

    def _themes_for_record(self, record: IntelligenceRecord | dict[str, Any]) -> list[str]:
        metadata = _as_metadata(record)
        if not metadata:
            return ["placement_stability"]
        return self.themes_for_metadata(metadata)

    def _build_cluster(
        self,
        *,
        young_person_id: int | None,
        home_id: int | None,
        theme: str,
        records: list[IntelligenceRecord | dict[str, Any]],
    ) -> ChronologyCluster:
        dates = sorted([date for record in records if (date := _event_date(record))])
        event_ids = [_record_id(record) for record in records if _record_id(record) not in (None, "")]
        regulations: list[str] = []
        sccif: list[str] = []
        actions: list[int | str] = []
        evidence: list[int | str] = []
        for record in records:
            metadata = _as_metadata(record)
            if not metadata:
                continue
            regulations.extend(metadata.regulatory.children_home_regulation_ids)
            sccif.extend(metadata.regulatory.sccif_area_ids)
            actions.extend(metadata.operational.linked_action_ids)
            evidence.extend(metadata.operational.linked_evidence_ids)

        cache_key = intelligence_cache_service.build_cache_key(
            cache_type="chronology_cluster_summary",
            home_id=home_id,
            young_person_id=young_person_id,
            date_range=f"{dates[0] if dates else ''}:{dates[-1] if dates else ''}",
            extra={"theme": theme, "events": event_ids[:20]},
        )
        cluster_id = _cluster_id({"home_id": home_id, "young_person_id": young_person_id, "theme": theme, "events": event_ids})
        return ChronologyCluster(
            cluster_id=cluster_id,
            young_person_id=young_person_id,
            home_id=home_id,
            theme=theme,
            date_range={"start": dates[0] if dates else None, "end": dates[-1] if dates else None},
            summary=self._summary(theme, records),
            supporting_event_ids=event_ids[:25],
            linked_actions=sorted(set(actions), key=str)[:20],
            linked_evidence=sorted(set(evidence), key=str)[:20],
            linked_regulations=sorted(set(regulations)),
            linked_sccif=sorted(set(sccif)),
            last_updated_at=dates[-1] if dates else None,
            cache_key=cache_key,
        )

    def _summary(self, theme: str, records: list[IntelligenceRecord | dict[str, Any]]) -> str:
        titles = [_title(record) for record in records[:3]]
        snippets = [_summary(record) for record in records[:2] if _summary(record)]
        theme_label = theme.replace("_", " ")
        base = f"{len(records)} {theme_label} event{'s' if len(records) != 1 else ''}"
        if titles:
            base += f": {', '.join(titles)}"
        if snippets:
            base += f". Key evidence: {' / '.join(snippets)[:260]}"
        return base


chronology_cluster_service = ChronologyClusterService()
