"""Child-centred chronology story from signed-off archive — safe summaries only."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from schemas.child_archive import ChildArchiveFilter, ChildArchiveRecord
from schemas.child_chronology_story import (
    ChronologyStoryEvent,
    ChronologyStoryFilter,
    ChronologyStoryGap,
    ChronologyStoryResponse,
    ChronologyStorySection,
)
from services.child_archive_service import child_archive_service


class ChildChronologyStoryService:
    def create_event_from_archive(
        self,
        archive_record: ChildArchiveRecord,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChronologyStoryEvent:
        _ = current_user
        _ = conn
        event_date = archive_record.event_date or archive_record.signed_off_at
        recorded_at = archive_record.recorded_at
        return ChronologyStoryEvent(
            id=f"story_{archive_record.id}",
            event_date=event_date,
            recorded_at=recorded_at if recorded_at and recorded_at[:10] != (event_date or "")[:10] else None,
            title=archive_record.title,
            safe_summary=archive_record.safe_summary,
            record_type=archive_record.record_type,
            source_type=archive_record.source_type,
            author_name=archive_record.author_name,
            signed_off_by_name=archive_record.signed_off_by_name,
            source_route=archive_record.source_route or f"/young-people/{archive_record.child_id}/archive",
            archive_record_id=archive_record.id,
            plan_impacts=list(archive_record.plan_impact_ids or []),
            lifeecho_suggestion=archive_record.lifeecho_memory_id,
            tags=list(archive_record.tags or []),
            safeguarding_sensitive=archive_record.safeguarding_sensitive,
        )

    def group_events_by_month(self, events: list[ChronologyStoryEvent]) -> list[ChronologyStorySection]:
        buckets: dict[str, list[ChronologyStoryEvent]] = defaultdict(list)
        for event in events:
            raw = event.event_date or ""
            label = raw[:7] if len(raw) >= 7 else "Undated"
            buckets[label].append(event)
        sections: list[ChronologyStorySection] = []
        for label in sorted(buckets.keys(), reverse=True):
            month_events = sorted(
                buckets[label],
                key=lambda e: e.event_date or "",
                reverse=True,
            )
            sections.append(
                ChronologyStorySection(
                    kind="month",
                    label=label,
                    events=month_events,
                    summary=f"{len(month_events)} moment{'s' if len(month_events) != 1 else ''} this month",
                )
            )
        return sections

    def identify_story_themes(self, events: list[ChronologyStoryEvent]) -> list[str]:
        themes: set[str] = set()
        for event in events:
            for tag in event.tags:
                if tag and not tag.startswith("archive"):
                    themes.add(tag.replace("-", " "))
            if event.record_type:
                themes.add(event.record_type.replace("_", " "))
        return sorted(themes)[:12]

    def identify_story_gaps(
        self,
        events: list[ChronologyStoryEvent],
        child_id: int,
    ) -> list[ChronologyStoryGap]:
        gaps: list[ChronologyStoryGap] = []
        if not events:
            gaps.append(
                ChronologyStoryGap(
                    label="No signed-off story yet",
                    hint="Submit and sign off daily notes or key records to build this child's chronology.",
                    route_hint=f"/young-people/{child_id}/archive",
                )
            )
            gaps.append(
                ChronologyStoryGap(
                    label="Start recording",
                    hint="Create a draft from the child workspace, then submit when ready.",
                    route_hint=f"/record?child_id={child_id}",
                )
            )
            return gaps
        recent_dates = [e.event_date[:10] for e in events if e.event_date and len(e.event_date) >= 10]
        if recent_dates:
            latest = max(recent_dates)
            cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).date().isoformat()
            if latest < cutoff:
                gaps.append(
                    ChronologyStoryGap(
                        label="No recent signed-off records",
                        hint="No archive-linked story events in the last 90 days — check recording and review queues.",
                        route_hint=f"/record/reviews?child_id={child_id}",
                    )
                )
        return gaps

    def safe_story_summary(self, events: list[ChronologyStoryEvent]) -> str:
        if not events:
            return "No signed-off story events yet. Records appear here after formal sign-off — drafts are not shown."
        recent = events[:5]
        parts = [f"{e.title}: {e.safe_summary[:120]}" for e in recent if e.safe_summary]
        return (
            f"This child's story includes {len(events)} signed-off moments. "
            + (" Recent highlights: " + " · ".join(parts[:3]) if parts else "")
        )[:800]

    def build_story(
        self,
        filters: ChronologyStoryFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChronologyStoryResponse:
        archive_list = child_archive_service.list_archive(
            ChildArchiveFilter(
                child_id=filters.child_id,
                record_type=None,
                search=filters.search,
                page=1,
                page_size=500,
            ),
            current_user,
            conn=conn,
        )
        events: list[ChronologyStoryEvent] = []
        for rec in archive_list.records:
            if rec.status in {"draft", "awaiting_review"}:
                continue
            if filters.safeguarding_sensitive is False and rec.safeguarding_sensitive:
                continue
            if filters.record_type and rec.record_type != filters.record_type:
                continue
            if filters.author_user_id and rec.author_user_id != filters.author_user_id:
                continue
            if filters.plan_impact and not rec.plan_impact_ids:
                continue
            if filters.lifeecho_memories and not rec.lifeecho_memory_id:
                continue
            events.append(self.create_event_from_archive(rec, current_user, conn=conn))

        sections = self.group_events_by_month(events)
        themes = self.identify_story_themes(events)
        return ChronologyStoryResponse(
            child_id=filters.child_id,
            sections=sections,
            themes=themes,
            safe_story_summary=self.safe_story_summary(events),
            total_events=len(events),
            story_gaps=self.identify_story_gaps(events, filters.child_id),
        )


child_chronology_story_service = ChildChronologyStoryService()
