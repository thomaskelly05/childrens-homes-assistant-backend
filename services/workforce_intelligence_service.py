from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

from psycopg2.extras import RealDictCursor

from services.workforce_journey_service import WorkforceJourneyService, _date, _iso, _safe_int


CHILD_VOICE_TERMS = {
    "child said",
    "young person said",
    "told staff",
    "shared that",
    "wishes",
    "feelings",
    "voice",
    "asked for",
    "wanted",
}
SAFEGUARDING_TERMS = {
    "safeguarding",
    "risk",
    "disclosure",
    "allegation",
    "concern",
    "missing",
    "exploitation",
    "harm",
    "injury",
    "manager informed",
}
RESTORATIVE_TERMS = {
    "repair",
    "restorative",
    "reconnect",
    "relationship",
    "regulated",
    "co-regulated",
    "de-escalated",
    "pace",
    "curious",
    "empathy",
}
REFLECTION_TERMS = {
    "reflected",
    "learning",
    "next time",
    "what worked",
    "what could",
    "because",
    "impact",
    "support needed",
}
VAGUE_TERMS = {"fine", "okay", "ok", "settled", "no issues", "normal", "usual", "good day"}
CONFLICT_TERMS = {"argument", "conflict", "refused", "aggressive", "shouting", "restraint", "sanction"}
POSITIVE_TERMS = {"positive", "praised", "achievement", "engaged", "enjoyed", "laughed", "trusted", "settled"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _join_text(record: dict[str, Any], fields: Iterable[str]) -> str:
    return " ".join(_text(record.get(field)) for field in fields if _text(record.get(field)))


def _contains_any(text: str, terms: set[str]) -> bool:
    haystack = text.lower()
    return any(term in haystack for term in terms)


def _days_since(value: Any, *, today: date | None = None) -> int | None:
    parsed = _date(value)
    if not parsed:
        return None
    return ((today or _now().date()) - parsed).days


def _event_date(row: dict[str, Any]) -> str | None:
    for key in ("event_at", "occurred_at", "date_time", "created_at", "updated_at", "review_date", "completion_date", "expiry_date", "due_date"):
        value = row.get(key)
        if value:
            return _iso(value)
    return None


def _staff_name(row: dict[str, Any]) -> str:
    return (
        _text(row.get("staff_name"))
        or " ".join(part for part in [_text(row.get("first_name")), _text(row.get("last_name"))] if part)
        or _text(row.get("email"))
        or f"Staff #{row.get('staff_id') or row.get('id') or 'unknown'}"
    )


def calculate_recording_quality_score(record: dict[str, Any], *, now: datetime | None = None) -> dict[str, Any]:
    """Score one recording without relying on a particular source table shape."""

    now = now or _now()
    text = _join_text(
        record,
        (
            "summary",
            "body",
            "note",
            "notes",
            "description",
            "presentation",
            "activities",
            "education_update",
            "health_update",
            "family_update",
            "behaviour_update",
            "young_person_voice",
            "child_voice",
            "positives",
            "actions_required",
            "staff_response",
            "restorative_follow_up",
            "reflection",
        ),
    )
    word_count = len([word for word in text.split() if word.strip()])
    has_child_voice = bool(_text(record.get("young_person_voice") or record.get("child_voice"))) or _contains_any(text, CHILD_VOICE_TERMS)
    has_safeguarding = _contains_any(text, SAFEGUARDING_TERMS)
    has_restorative = _contains_any(text, RESTORATIVE_TERMS)
    vague_hits = sorted(term for term in VAGUE_TERMS if term in text.lower())
    reflection_text = _text(record.get("reflection"))
    has_reflection = bool(reflection_text) or _contains_any(text, REFLECTION_TERMS) or word_count >= 90
    strong_reflection = bool(reflection_text and _contains_any(reflection_text, REFLECTION_TERMS)) or (has_reflection and word_count >= 60)

    occurred = record.get("note_date") or record.get("date_time") or record.get("occurred_at") or record.get("event_at")
    submitted = record.get("submitted_at") or record.get("created_at") or record.get("updated_at")
    timeliness_hours: float | None = None
    try:
        occurred_dt = datetime.fromisoformat(str(occurred).replace("Z", "+00:00")) if occurred else None
        submitted_dt = datetime.fromisoformat(str(submitted).replace("Z", "+00:00")) if submitted else None
        if occurred_dt and submitted_dt:
            if occurred_dt.tzinfo is None:
                occurred_dt = occurred_dt.replace(tzinfo=timezone.utc)
            if submitted_dt.tzinfo is None:
                submitted_dt = submitted_dt.replace(tzinfo=timezone.utc)
            timeliness_hours = max(0.0, (submitted_dt - occurred_dt).total_seconds() / 3600)
    except Exception:
        timeliness_hours = None

    score = 40
    score += 15 if has_child_voice else 0
    score += 12 if has_safeguarding else 0
    score += 12 if has_restorative else 0
    score += 14 if has_reflection else 0
    score += 7 if timeliness_hours is not None and timeliness_hours <= 24 else 0
    score -= min(20, len(vague_hits) * 6)
    if word_count < 25:
        score -= 12
    score = max(0, min(100, score))

    return {
        "record_id": str(record.get("id") or record.get("source_id") or ""),
        "staff_id": record.get("staff_id") or record.get("author_id") or record.get("created_by_user_id"),
        "score": score,
        "rating": "strong" if score >= 75 else "developing" if score >= 55 else "manager_review",
        "child_voice_present": has_child_voice,
        "safeguarding_language_present": has_safeguarding,
        "restorative_language_present": has_restorative,
        "vague_wording_hits": vague_hits,
        "reflection_quality": "strong" if strong_reflection else "limited" if has_reflection else "missing",
        "timeliness_hours": timeliness_hours,
        "created_at": _iso(record.get("created_at") or record.get("updated_at")),
        "source_type": record.get("source_type") or record.get("record_type") or "recording",
        "title": record.get("title") or record.get("shift_type") or "Care record",
    }


def calculate_workforce_risk_score(signals: dict[str, int]) -> dict[str, Any]:
    score = 0
    score += int(signals.get("overdue_supervisions", 0)) * 12
    score += int(signals.get("expired_training", 0)) * 10
    score += int(signals.get("missing_training", 0)) * 8
    score += int(signals.get("practice_concerns", 0)) * 14
    score += int(signals.get("wellbeing_flags", 0)) * 8
    score += int(signals.get("incident_count", 0)) * 5
    score += int(signals.get("role_changes", 0)) * 4
    score = max(0, min(100, score))
    return {
        "score": score,
        "level": "critical" if score >= 75 else "high" if score >= 50 else "medium" if score >= 25 else "low",
        "signals": signals,
    }


def aggregate_chronology_events(events: list[dict[str, Any]]) -> dict[str, Any]:
    sorted_events = sorted(events, key=lambda item: _text(item.get("event_at")), reverse=True)
    by_type = Counter(_text(item.get("event_type")) or "event" for item in sorted_events)
    by_staff = Counter(_text(item.get("staff_id")) for item in sorted_events if _text(item.get("staff_id")))
    return {
        "events": sorted_events,
        "summary": {
            "total": len(sorted_events),
            "by_type": dict(by_type),
            "by_staff": dict(by_staff),
            "latest_event_at": sorted_events[0].get("event_at") if sorted_events else None,
        },
    }


class WorkforceIntelligenceService:
    """Reusable workforce intelligence layer for dashboards, reports and ORB."""

    def __init__(self, journey_service: WorkforceJourneyService | None = None) -> None:
        self.journey = journey_service or WorkforceJourneyService()

    def dashboard(self, conn, *, current_user: dict[str, Any]) -> dict[str, Any]:
        command = self.command_centre(conn, current_user=current_user)
        return {
            "generated_at": _now().isoformat(),
            "chronology": self.chronology(conn, current_user=current_user, limit=20),
            "recording_quality": self.recording_quality(conn, current_user=current_user),
            "risk": self.risk(conn, current_user=current_user),
            "relationships": self.relationships(conn, current_user=current_user),
            "command_centre": command,
            "orb_context": self.orb_context(conn, current_user=current_user),
        }

    def chronology(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None, limit: int = 100) -> dict[str, Any]:
        home_id = self.journey._home_id(current_user)
        events: list[dict[str, Any]] = []
        events.extend(self._persisted_chronology(conn, staff_id=staff_id, home_id=home_id))
        events.extend(self._events_from_supervision(conn, current_user=current_user, staff_id=staff_id))
        events.extend(self._events_from_training(conn, current_user=current_user, staff_id=staff_id))
        events.extend(self._events_from_optional(conn, "staff_probation_reviews", "probation", staff_id=staff_id, home_id=home_id))
        events.extend(self._events_from_optional(conn, "staff_practice_concerns", "practice_concern", staff_id=staff_id, home_id=home_id))
        events.extend(self._events_from_optional(conn, "staff_wellbeing_checkins", "wellbeing", staff_id=staff_id, home_id=home_id))
        events.extend(self._events_from_optional(conn, "workforce_evidence", "evidence", staff_id=staff_id, home_id=home_id))
        events.extend(self._events_from_optional(conn, "incidents", "incident", staff_id=staff_id, home_id=home_id, staff_columns=("staff_id", "created_by_user_id", "author_id")))
        events.extend(self._events_from_optional(conn, "daily_notes", "recording", staff_id=staff_id, home_id=home_id, staff_columns=("staff_id", "author_id", "created_by_user_id")))
        linked_evidence = self._evidence_index(conn, staff_id=staff_id, home_id=home_id)
        for event in events:
            key = (event.get("source_table"), _safe_int(event.get("source_id")))
            event["linked_evidence"] = linked_evidence.get(key, [])
        aggregated = aggregate_chronology_events(events)
        aggregated["events"] = aggregated["events"][:limit]
        aggregated["inspection_threads"] = [
            "Children's Homes Regulations 2015 Reg 13 leadership and management",
            "SCCIF leadership and management",
            "Workforce competence, safeguarding culture and relational practice",
        ]
        return aggregated

    def recording_quality(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        rows = self._recording_rows(conn, current_user=current_user, staff_id=staff_id)
        scored = [calculate_recording_quality_score(row) for row in rows]
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for item in scored:
            grouped[str(item.get("staff_id") or "unknown")].append(item)
        staff_scores = []
        for key, items in grouped.items():
            average = round(sum(int(item["score"]) for item in items) / len(items)) if items else 0
            staff_scores.append(
                {
                    "staff_id": key,
                    "average_score": average,
                    "rating": "strong" if average >= 75 else "developing" if average >= 55 else "manager_review",
                    "record_count": len(items),
                    "child_voice_presence": round(sum(1 for item in items if item["child_voice_present"]) / len(items) * 100) if items else 0,
                    "safeguarding_language": round(sum(1 for item in items if item["safeguarding_language_present"]) / len(items) * 100) if items else 0,
                    "restorative_language": round(sum(1 for item in items if item["restorative_language_present"]) / len(items) * 100) if items else 0,
                    "vague_wording": sum(len(item["vague_wording_hits"]) for item in items),
                }
            )
        concerns = [item for item in scored if item["score"] < 55 or item["vague_wording_hits"]]
        return {
            "records": scored[:120],
            "staff_scores": sorted(staff_scores, key=lambda item: item["average_score"]),
            "home_trends": {
                "average_score": round(sum(int(item["score"]) for item in scored) / len(scored)) if scored else None,
                "records_reviewed": len(scored),
                "manager_review_required": len([item for item in scored if item["rating"] == "manager_review"]),
            },
            "concerns": concerns[:20],
            "scoring_model": {
                "child_voice": 15,
                "safeguarding_language": 12,
                "restorative_language": 12,
                "reflection_quality": 14,
                "timeliness": 7,
                "vague_wording_penalty": -6,
            },
        }

    def risk(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        training = self.journey.training_matrix(conn, current_user=current_user, staff_id=staff_id)
        supervision = self.journey.list_supervision(conn, current_user=current_user, staff_id=staff_id)
        staff_rows = [row["staff"] for row in training.get("matrix", [])]
        risks = []
        for row in training.get("matrix", []):
            staff = row.get("staff") or {}
            sid = _safe_int(staff.get("id"))
            items = row.get("items") or []
            staff_supervisions = [item for item in supervision.get("records", []) if _safe_int(item.get("staff_id")) == sid]
            signals = {
                "overdue_supervisions": self._overdue_supervision_count(staff_supervisions),
                "expired_training": len([item for item in items if item.get("status") == "expired"]),
                "missing_training": len([item for item in items if item.get("status") == "missing"]),
                "practice_concerns": len(self.journey._optional_rows(conn, "staff_practice_concerns", staff_id=sid)),
                "wellbeing_flags": len(self.journey._optional_rows(conn, "staff_wellbeing_checkins", staff_id=sid)),
                "incident_count": len(self.journey._optional_rows(conn, "incidents", staff_id=sid)),
                "role_changes": len(self.journey._optional_rows(conn, "workforce_chronology_events", staff_id=sid)),
            }
            risks.append({"staff": staff, **calculate_workforce_risk_score(signals)})
        average = round(sum(item["score"] for item in risks) / len(risks)) if risks else 0
        health_score = max(0, 100 - average)
        return {
            "staff_risks": sorted(risks, key=lambda item: item["score"], reverse=True),
            "home_health": {
                "score": health_score,
                "level": "healthy" if health_score >= 75 else "watch" if health_score >= 50 else "fragile",
                "staff_count": len(staff_rows),
                "high_risk_staff": len([item for item in risks if item["level"] in {"high", "critical"}]),
            },
            "alerts": [item for item in risks if item["level"] in {"high", "critical"}],
        }

    def relationships(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        rows = self._recording_rows(conn, current_user=current_user, staff_id=staff_id)
        pairs: dict[tuple[str, str], dict[str, Any]] = {}
        for row in rows:
            sid = str(row.get("staff_id") or row.get("author_id") or row.get("created_by_user_id") or "unknown")
            child_id = str(row.get("young_person_id") or row.get("child_id") or row.get("person_id") or "unknown")
            if sid == "unknown" or child_id == "unknown":
                continue
            key = (sid, child_id)
            pair = pairs.setdefault(
                key,
                {"staff_id": sid, "young_person_id": child_id, "interactions": 0, "positive_engagement": 0, "conflict_indicators": 0, "latest_contact_at": None},
            )
            text = _join_text(row, ("summary", "body", "note", "notes", "description", "presentation", "positives", "behaviour_update", "staff_response"))
            pair["interactions"] += 1
            pair["positive_engagement"] += 1 if _contains_any(text, POSITIVE_TERMS) else 0
            pair["conflict_indicators"] += 1 if _contains_any(text, CONFLICT_TERMS) else 0
            pair["latest_contact_at"] = max([value for value in [pair["latest_contact_at"], _event_date(row)] if value], default=None)
        indicators = []
        for pair in pairs.values():
            relational_safety = max(0, min(100, 70 + pair["positive_engagement"] * 5 - pair["conflict_indicators"] * 8))
            indicators.append({**pair, "relational_safety_score": relational_safety})
        return {
            "indicators": sorted(indicators, key=lambda item: item["relational_safety_score"]),
            "home_view": {
                "tracked_relationships": len(indicators),
                "positive_engagements": sum(item["positive_engagement"] for item in indicators),
                "conflict_indicators": sum(item["conflict_indicators"] for item in indicators),
                "stability_notes": "Keyworker stability improves when the same staff-child pairs show regular positive engagement and low conflict indicators.",
            },
            "child_views": self._group_by(indicators, "young_person_id"),
            "staff_views": self._group_by(indicators, "staff_id"),
        }

    def command_centre(self, conn, *, current_user: dict[str, Any]) -> dict[str, Any]:
        risk = self.risk(conn, current_user=current_user)
        quality = self.recording_quality(conn, current_user=current_user)
        chronology = self.chronology(conn, current_user=current_user, limit=30)
        recognition = [event for event in chronology["events"] if event.get("event_type") == "recognition"]
        alerts = []
        alerts.extend({"type": "workforce_risk", "severity": item["level"], "title": item["staff"].get("title"), "detail": item["signals"]} for item in risk["alerts"][:10])
        alerts.extend({"type": "recording_quality", "severity": "medium", "title": item["title"], "detail": item} for item in quality["concerns"][:10])
        alerts.extend({"type": event.get("event_type"), "severity": event.get("severity") or "info", "title": event.get("title"), "detail": event} for event in chronology["events"][:10] if event.get("event_type") in {"practice_concern", "wellbeing", "incident"})
        return {
            "role_scope": "manager" if self.journey._is_manager(current_user) else "self",
            "alerts": alerts[:20],
            "practice_concerns": [event for event in chronology["events"] if event.get("event_type") == "practice_concern"][:10],
            "wellbeing_alerts": [event for event in chronology["events"] if event.get("event_type") == "wellbeing"][:10],
            "staffing_instability": risk["home_health"],
            "recognition": recognition[:10],
            "inspection_readiness": {
                "summary": "Workforce intelligence links chronology, risk, recording quality, relational practice and evidence for Reg 13 and SCCIF leadership review.",
                "evidence_threads": chronology["inspection_threads"],
            },
        }

    def orb_context(self, conn, *, current_user: dict[str, Any], staff_id: int | None = None) -> dict[str, Any]:
        chronology = self.chronology(conn, current_user=current_user, staff_id=staff_id, limit=12)
        risk = self.risk(conn, current_user=current_user, staff_id=staff_id)
        quality = self.recording_quality(conn, current_user=current_user, staff_id=staff_id)
        evidence = self.journey.evidence(conn, current_user=current_user)
        return {
            "workforce_summary": {
                "chronology_events": chronology["summary"]["total"],
                "home_workforce_health": risk["home_health"],
                "recording_quality": quality["home_trends"],
                "inspection_threads": chronology["inspection_threads"],
            },
            "evidence_sources": [
                {
                    "source_type": "workforce_evidence",
                    "source_id": str(item.get("id")),
                    "title": item.get("title"),
                    "summary": item.get("summary"),
                    "route": "/staff/evidence",
                    "regulation_links": ["reg_13_leadership_and_management"],
                    "sccif_links": ["leadership_and_management"],
                }
                for item in evidence.get("items", [])[:12]
            ],
            "assistant_prompts": [
                "Summarise workforce chronology and linked evidence.",
                "Explain workforce operational risks and management oversight.",
                "Review supervision culture, competence and recording quality.",
                "Prepare inspection-ready workforce evidence for Reg 13 and SCCIF.",
            ],
        }

    def _persisted_chronology(self, conn, *, staff_id: int | None, home_id: int | None) -> list[dict[str, Any]]:
        rows = self.journey._optional_rows(conn, "workforce_chronology_events", staff_id=staff_id, home_id=home_id, limit=250)
        return [self._normalise_event(row, row.get("event_type") or "workforce_event", "workforce_chronology_events") for row in rows]

    def _events_from_supervision(self, conn, *, current_user: dict[str, Any], staff_id: int | None) -> list[dict[str, Any]]:
        return [
            self._normalise_event(row, "supervision", "workforce_supervision_records", title=row.get("title") or "Supervision record")
            for row in self.journey.list_supervision(conn, current_user=current_user, staff_id=staff_id).get("records", [])
        ]

    def _events_from_training(self, conn, *, current_user: dict[str, Any], staff_id: int | None) -> list[dict[str, Any]]:
        events = []
        for row in self.journey.training_matrix(conn, current_user=current_user, staff_id=staff_id).get("matrix", []):
            staff = row.get("staff") or {}
            for item in row.get("items") or []:
                if item.get("status") in {"due", "expired", "missing", "completed"}:
                    events.append(
                        self._normalise_event(
                            {**item, "staff_id": staff.get("id"), "home_id": staff.get("home_id"), "event_at": item.get("expiry_date") or item.get("completion_date")},
                            "training",
                            "staff_training_matrix",
                            title=f"{item.get('training_name') or 'Training'}: {item.get('status')}",
                        )
                    )
        return events

    def _events_from_optional(
        self,
        conn,
        table: str,
        event_type: str,
        *,
        staff_id: int | None,
        home_id: int | None,
        staff_columns: tuple[str, ...] = ("staff_id", "staff_user_id", "user_id"),
    ) -> list[dict[str, Any]]:
        rows = self._optional_rows_with_staff_columns(conn, table, staff_id=staff_id, home_id=home_id, staff_columns=staff_columns)
        return [self._normalise_event(row, event_type, table) for row in rows]

    def _normalise_event(self, row: dict[str, Any], event_type: str, source_table: str, *, title: str | None = None) -> dict[str, Any]:
        source_id = row.get("source_id") or row.get("id")
        event_title = title or row.get("title") or row.get("training_name") or row.get("milestone") or event_type.replace("_", " ").title()
        event_staff_id = row.get("staff_id") or row.get("staff_user_id") or row.get("user_id") or row.get("author_id") or row.get("created_by_user_id")
        return {
            "id": f"{source_table}:{source_id or event_title}:{event_staff_id or 'home'}",
            "event_type": event_type,
            "title": event_title,
            "summary": row.get("summary") or row.get("notes") or row.get("reflection") or row.get("description") or row.get("review_note") or row.get("status"),
            "staff_id": event_staff_id,
            "staff_name": _staff_name(row),
            "home_id": row.get("home_id"),
            "event_at": _event_date(row) or _now().isoformat(),
            "severity": row.get("severity") or row.get("priority") or ("medium" if event_type in {"practice_concern", "wellbeing"} else "info"),
            "source_table": source_table,
            "source_id": source_id,
            "route": row.get("route") or ("/staff/evidence" if source_table == "workforce_evidence" else None),
            "raw": row,
        }

    def _recording_rows(self, conn, *, current_user: dict[str, Any], staff_id: int | None) -> list[dict[str, Any]]:
        home_id = self.journey._home_id(current_user)
        rows = []
        for table in ("daily_notes", "young_person_daily_notes", "incidents"):
            rows.extend(
                self._optional_rows_with_staff_columns(
                    conn,
                    table,
                    staff_id=staff_id,
                    home_id=home_id,
                    staff_columns=("staff_id", "author_id", "created_by_user_id", "recorded_by_user_id"),
                )
            )
        existing = self.journey._optional_rows(conn, "staff_recording_quality", staff_id=staff_id, home_id=home_id)
        rows.extend(existing)
        return rows[:250]

    def _optional_rows_with_staff_columns(
        self,
        conn,
        table: str,
        *,
        staff_id: int | None,
        home_id: int | None,
        staff_columns: tuple[str, ...],
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        if not self.journey._table_exists(conn, table):
            return []
        cols = self.journey._columns(conn, table)
        filters = []
        params: list[Any] = []
        if staff_id is not None:
            usable = [col for col in staff_columns if col in cols]
            if not usable:
                return []
            filters.append("(" + " OR ".join(f"{col} = %s" for col in usable) + ")")
            params.extend([staff_id] * len(usable))
        if home_id is not None and "home_id" in cols:
            filters.append("home_id = %s")
            params.append(home_id)
        where = f"WHERE {' AND '.join(filters)}" if filters else ""
        order_col = "created_at" if "created_at" in cols else "updated_at" if "updated_at" in cols else "id" if "id" in cols else None
        order = f"ORDER BY {order_col} DESC NULLS LAST" if order_col else ""
        params.append(limit)
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f"SELECT * FROM {table} {where} {order} LIMIT %s", tuple(params))
                return [dict(row) for row in cur.fetchall() or []]
        except Exception:
            return []

    def _evidence_index(self, conn, *, staff_id: int | None, home_id: int | None) -> dict[tuple[Any, Any], list[dict[str, Any]]]:
        rows = self.journey._optional_rows(conn, "workforce_evidence", staff_id=staff_id, home_id=home_id, limit=250)
        index: dict[tuple[Any, Any], list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            index[(row.get("source_table"), _safe_int(row.get("source_id")))].append(row)
        return index

    def _overdue_supervision_count(self, rows: list[dict[str, Any]]) -> int:
        count = 0
        for row in rows:
            status = _lower(row.get("status"))
            age = _days_since(row.get("created_at") or row.get("updated_at"))
            if status in {"overdue", "returned"} or (age is not None and age > 60 and status not in {"reviewed", "archived"}):
                count += 1
        return count

    def _group_by(self, rows: list[dict[str, Any]], key: str) -> dict[str, list[dict[str, Any]]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            grouped[str(row.get(key) or "unknown")].append(row)
        return dict(grouped)
