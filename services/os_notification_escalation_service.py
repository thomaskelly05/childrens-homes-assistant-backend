"""Notification escalation — overdue checks, manager routing, metadata-only events."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import table_exists
from schemas.os_notification_analytics import (
    NotificationAnalyticsFilters,
    NotificationAutomationHealth,
    NotificationEscalationRunRecord,
)
from schemas.os_notification_preferences import (
    SEVERITY_ORDER,
    NotificationEscalationCandidate,
    NotificationEscalationCheckRequest,
    NotificationEscalationCheckResponse,
    NotificationEscalationHealth,
    NotificationEscalationRule,
)
from schemas.os_notifications import OsNotificationItem
from services.audit_event_service import record_audit_event
from services.os_notification_adapter_service import os_notification_adapter_service
from services.os_notification_preference_service import os_notification_preference_service

logger = logging.getLogger("indicare.os_notification_escalations")

ESCALATION_SAFETY_NOTICE = (
    "Escalations support manager oversight. They do not make safeguarding decisions."
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    return default


def _iso_dt(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        raw = value.replace("Z", "+00:00")
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def _severity_rank(severity: str) -> int:
    return SEVERITY_ORDER.get(_text(severity, "low").lower(), 0)


class OsNotificationEscalationService:
    def __init__(self) -> None:
        self._memory_rules: list[dict[str, Any]] = []
        self._memory_events: list[dict[str, Any]] = []
        self._memory_runs: list[dict[str, Any]] = []
        self._seed_defaults()

    def _seed_defaults(self) -> None:
        if self._memory_rules:
            return
        for rule in self.default_escalation_rules():
            self._memory_rules.append(rule.model_dump())

    def _detect_rules_mode(self, conn: Any | None = None) -> str:
        if conn is None:
            return "memory"
        try:
            if table_exists(conn, "os_notification_escalation_rules"):
                return "postgresql"
        except Exception:
            pass
        return "memory"

    def _detect_events_mode(self, conn: Any | None = None) -> str:
        if conn is None:
            return "memory"
        try:
            if table_exists(conn, "os_notification_escalation_events"):
                return "postgresql"
        except Exception:
            pass
        return "memory"

    def _detect_runs_mode(self, conn: Any | None = None) -> str:
        if conn is None:
            return "memory"
        try:
            if table_exists(conn, "os_notification_escalation_check_runs"):
                return "postgresql"
        except Exception:
            pass
        return "memory"

    def _user_name(self, current_user: dict[str, Any]) -> str:
        first = _text(current_user.get("first_name"))
        last = _text(current_user.get("last_name"))
        return " ".join(part for part in (first, last) if part).strip() or _text(current_user.get("email"), "User")

    def _row_to_run(self, row: dict[str, Any]) -> NotificationEscalationRunRecord:
        return NotificationEscalationRunRecord(
            id=_text(row.get("id")),
            triggered_by_user_id=row.get("triggered_by_user_id"),
            triggered_by_name=row.get("triggered_by_name"),
            home_id=row.get("home_id"),
            dry_run=bool(row.get("dry_run", True)),
            started_at=_iso_dt(row.get("started_at")) or _now_iso(),
            completed_at=_iso_dt(row.get("completed_at")),
            candidate_count=int(row.get("candidate_count") or 0),
            event_count=int(row.get("event_count") or 0),
            urgent_count=int(row.get("urgent_count") or 0),
            safeguarding_count=int(row.get("safeguarding_count") or 0),
            recording_count=int(row.get("recording_count") or 0),
            isn_count=int(row.get("isn_count") or 0),
            daily_brief_count=int(row.get("daily_brief_count") or 0),
            warnings=_parse_json(row.get("warnings"), []),
            recommendations=_parse_json(row.get("recommendations"), []),
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def _count_categories(self, candidates: list[NotificationEscalationCandidate]) -> dict[str, int]:
        urgent = safeguarding = recording = isn = daily_brief = 0
        for c in candidates:
            sev = _text(c.severity).lower()
            src = _text(c.source)
            cat = _text(c.category)
            if sev == "urgent":
                urgent += 1
            if cat == "safeguarding_network" or src == "isn":
                safeguarding += 1
            if src in ("recording_alert", "recording_alerts") or cat == "recording":
                recording += 1
            if src == "isn":
                isn += 1
            if src == "manager_daily_brief" or cat == "daily_brief":
                daily_brief += 1
        return {
            "urgent_count": urgent,
            "safeguarding_count": safeguarding,
            "recording_count": recording,
            "isn_count": isn,
            "daily_brief_count": daily_brief,
        }

    def build_run_record(
        self,
        response: NotificationEscalationCheckResponse,
        current_user: dict[str, Any],
        started_at: str,
        *,
        home_id: int | None = None,
        completed_at: str | None = None,
    ) -> NotificationEscalationRunRecord:
        run_id = response.run_id or f"esc_run:{uuid4().hex[:12]}"
        counts = {
            "candidate_count": response.candidate_count or len(response.candidates),
            "event_count": response.event_count or len(response.created_notifications),
            "urgent_count": response.urgent_count,
            "safeguarding_count": response.safeguarding_count,
            "recording_count": response.recording_count,
            "isn_count": response.isn_count,
            "daily_brief_count": response.daily_brief_count,
        }
        return NotificationEscalationRunRecord(
            id=run_id,
            triggered_by_user_id=_user_id(current_user) or None,
            triggered_by_name=self._user_name(current_user),
            home_id=home_id,
            dry_run=response.dry_run,
            started_at=started_at,
            completed_at=completed_at or _now_iso(),
            warnings=list(response.warnings),
            recommendations=list(response.recommendations),
            metadata={
                **(response.metadata or {}),
                "no_raw_body": True,
                "metadata_only": True,
            },
            **counts,
        )

    def record_check_run(
        self,
        current_user: dict[str, Any],
        response: NotificationEscalationCheckResponse,
        started_at: str,
        conn: Any | None = None,
        *,
        home_id: int | None = None,
    ) -> NotificationEscalationRunRecord:
        record = self.build_run_record(
            response,
            current_user,
            started_at,
            home_id=home_id,
            completed_at=_now_iso(),
        )
        row = record.model_dump()
        mode = self._detect_runs_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO os_notification_escalation_check_runs (
                            id, triggered_by_user_id, triggered_by_name, home_id, dry_run,
                            candidate_count, event_count, urgent_count, safeguarding_count,
                            recording_count, isn_count, daily_brief_count,
                            warnings, recommendations, metadata, started_at, completed_at
                        ) VALUES (
                            %(id)s, %(triggered_by_user_id)s, %(triggered_by_name)s, %(home_id)s, %(dry_run)s,
                            %(candidate_count)s, %(event_count)s, %(urgent_count)s, %(safeguarding_count)s,
                            %(recording_count)s, %(isn_count)s, %(daily_brief_count)s,
                            %(warnings)s, %(recommendations)s, %(metadata)s, %(started_at)s, %(completed_at)s
                        )
                        """,
                        {
                            **row,
                            "warnings": Json(row.get("warnings") or []),
                            "recommendations": Json(row.get("recommendations") or []),
                            "metadata": Json(row.get("metadata") or {}),
                        },
                    )
                conn.commit()
            except Exception as exc:
                logger.warning("escalation_run_persist_failed: %s", exc)
        self._memory_runs.insert(0, row)
        return record

    def list_check_runs(
        self,
        current_user: dict[str, Any],
        filters: NotificationAnalyticsFilters | None = None,
        conn: Any | None = None,
        *,
        limit: int = 20,
    ) -> list[NotificationEscalationRunRecord]:
        _ = current_user
        mode = self._detect_runs_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                clauses = ["1=1"]
                params: dict[str, Any] = {"limit": limit}
                if filters and filters.home_id is not None:
                    clauses.append("home_id = %(home_id)s")
                    params["home_id"] = filters.home_id
                if filters and filters.user_id:
                    clauses.append("triggered_by_user_id = %(user_id)s")
                    params["user_id"] = filters.user_id
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"""
                        SELECT * FROM os_notification_escalation_check_runs
                        WHERE {' AND '.join(clauses)}
                        ORDER BY started_at DESC
                        LIMIT %(limit)s
                        """,
                        params,
                    )
                    rows = cur.fetchall()
                    if rows:
                        return [self._row_to_run(dict(r)) for r in rows]
            except Exception as exc:
                logger.warning("escalation_runs_load_failed: %s", exc)
        runs = list(self._memory_runs[:limit])
        return [NotificationEscalationRunRecord.model_validate(r) for r in runs]

    def get_last_check_run(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> NotificationEscalationRunRecord | None:
        runs = self.list_check_runs(current_user, conn=conn, limit=1)
        return runs[0] if runs else None

    def build_automation_health(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> NotificationAutomationHealth:
        last = self.get_last_check_run(current_user, conn=conn)
        warnings: list[str] = []
        if not last:
            warnings.append("No escalation check recorded yet.")
        warnings.append("Background scheduler not configured yet.")
        warnings.append("Push and email are not configured yet.")
        return NotificationAutomationHealth(
            status="ok",
            manual_checks_available=True,
            scheduler_configured=False,
            push_configured=False,
            email_configured=False,
            last_check_at=last.started_at if last else None,
            warnings=warnings,
            metadata={"no_raw_body": True},
        )

    def get_health(self, conn: Any | None = None) -> NotificationEscalationHealth:
        rules_mode = self._detect_rules_mode(conn)
        events_mode = self._detect_events_mode(conn)
        rules = self.list_escalation_rules({"role": "admin"}, conn=conn)
        events_count = len(self._memory_events)
        if events_mode == "postgresql" and conn is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM os_notification_escalation_events")
                    events_count = int(cur.fetchone()[0])
            except Exception:
                pass
        return NotificationEscalationHealth(
            status="ok",
            persistence_available=rules_mode == "postgresql",
            storage_mode=rules_mode,
            rules_count=len(rules),
            events_count=events_count,
        )

    def default_escalation_rules(self) -> list[NotificationEscalationRule]:
        return [
            NotificationEscalationRule(
                id="esc:isn_urgent_unacked",
                name="Urgent ISN not acknowledged within 60 minutes",
                source="isn",
                category="safeguarding_network",
                min_severity="urgent",
                status="active",
                trigger_after_minutes=60,
                route_to_role="registered_manager",
                applies_to_isn=True,
                applies_to_safeguarding=True,
                urgent_override=True,
                metadata={"also_route": "safeguarding_lead"},
            ),
            NotificationEscalationRule(
                id="esc:isn_high_unacked",
                name="High safeguarding network not acknowledged within 240 minutes",
                source="isn",
                category="safeguarding_network",
                min_severity="high",
                status="active",
                trigger_after_minutes=240,
                route_to_role="registered_manager",
                applies_to_isn=True,
                applies_to_safeguarding=True,
            ),
            NotificationEscalationRule(
                id="esc:recording_urgent_unacked",
                name="Urgent recording alert not acknowledged within 120 minutes",
                source="recording_alert",
                category="recording",
                min_severity="urgent",
                status="active",
                trigger_after_minutes=120,
                route_to_role="registered_manager",
                applies_to_recording=True,
            ),
            NotificationEscalationRule(
                id="esc:changes_requested_pending",
                name="Changes requested pending over 24 hours",
                source="recording_alert",
                category="recording",
                min_severity="medium",
                status="active",
                trigger_after_minutes=1440,
                route_to_role="senior",
                applies_to_recording=True,
                metadata={"alert_types": ["changes_requested_pending"]},
            ),
            NotificationEscalationRule(
                id="esc:daily_brief_midday",
                name="Daily brief not reviewed by midday",
                source="manager_daily_brief",
                category="daily_brief",
                min_severity="medium",
                status="active",
                trigger_after_minutes=720,
                route_to_role="registered_manager",
                metadata={"check_type": "daily_brief_unreviewed"},
            ),
            NotificationEscalationRule(
                id="esc:medication_review_due",
                name="Medication error review due over 60 minutes",
                source="recording_alert",
                category="recording",
                min_severity="high",
                status="active",
                trigger_after_minutes=60,
                route_to_role="registered_manager",
                applies_to_recording=True,
                metadata={"alert_types": ["medication_error_review_due"]},
            ),
        ]

    def _row_to_rule(self, row: dict[str, Any]) -> NotificationEscalationRule:
        return NotificationEscalationRule(
            id=_text(row.get("id")),
            name=_text(row.get("name")),
            source=row.get("source"),
            category=row.get("category"),
            min_severity=row.get("min_severity") or "high",
            status=row.get("status") or "active",
            trigger_after_minutes=int(row.get("trigger_after_minutes") or 240),
            route_to_role=row.get("route_to_role"),
            route_to_user_id=row.get("route_to_user_id"),
            route_to_user_name=row.get("route_to_user_name"),
            home_id=row.get("home_id"),
            applies_to_safeguarding=bool(row.get("applies_to_safeguarding")),
            applies_to_isn=bool(row.get("applies_to_isn")),
            applies_to_recording=bool(row.get("applies_to_recording")),
            urgent_override=bool(row.get("urgent_override", True)),
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def list_escalation_rules(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> list[NotificationEscalationRule]:
        _ = current_user
        mode = self._detect_rules_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM os_notification_escalation_rules
                        WHERE status = 'active' OR status = 'draft'
                        ORDER BY trigger_after_minutes ASC
                        """
                    )
                    rows = cur.fetchall()
                    if rows:
                        return [self._row_to_rule(dict(r)) for r in rows]
            except Exception as exc:
                logger.warning("escalation_rules_load_failed: %s", exc)
        return [NotificationEscalationRule.model_validate(r) for r in self._memory_rules]

    def create_or_update_rule(
        self,
        current_user: dict[str, Any],
        rule: NotificationEscalationRule,
        conn: Any | None = None,
    ) -> NotificationEscalationRule:
        rule_id = rule.id or f"esc:{uuid4().hex[:12]}"
        rule = rule.model_copy(update={"id": rule_id})
        row = rule.model_dump()
        mode = self._detect_rules_mode(conn)

        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO os_notification_escalation_rules (
                            id, name, source, category, min_severity, status,
                            trigger_after_minutes, route_to_role, route_to_user_id,
                            route_to_user_name, home_id, applies_to_safeguarding,
                            applies_to_isn, applies_to_recording, urgent_override, metadata, updated_at
                        ) VALUES (
                            %(id)s, %(name)s, %(source)s, %(category)s, %(min_severity)s, %(status)s,
                            %(trigger_after_minutes)s, %(route_to_role)s, %(route_to_user_id)s,
                            %(route_to_user_name)s, %(home_id)s, %(applies_to_safeguarding)s,
                            %(applies_to_isn)s, %(applies_to_recording)s, %(urgent_override)s, %(metadata)s, NOW()
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            source = EXCLUDED.source,
                            category = EXCLUDED.category,
                            min_severity = EXCLUDED.min_severity,
                            status = EXCLUDED.status,
                            trigger_after_minutes = EXCLUDED.trigger_after_minutes,
                            route_to_role = EXCLUDED.route_to_role,
                            route_to_user_id = EXCLUDED.route_to_user_id,
                            route_to_user_name = EXCLUDED.route_to_user_name,
                            home_id = EXCLUDED.home_id,
                            applies_to_safeguarding = EXCLUDED.applies_to_safeguarding,
                            applies_to_isn = EXCLUDED.applies_to_isn,
                            applies_to_recording = EXCLUDED.applies_to_recording,
                            urgent_override = EXCLUDED.urgent_override,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW()
                        """,
                        {**row, "metadata": Json(row.get("metadata") or {})},
                    )
                conn.commit()
            except Exception as exc:
                logger.warning("escalation_rule_persist_failed: %s", exc)

        updated = False
        for idx, existing in enumerate(self._memory_rules):
            if existing.get("id") == rule_id:
                self._memory_rules[idx] = row
                updated = True
                break
        if not updated:
            self._memory_rules.append(row)

        try:
            record_audit_event(
                event_type="governance",
                action="notification_escalation_rule_updated",
                actor=current_user,
                resource_type="notification_escalation_rule",
                resource_id=rule_id,
                metadata={"no_raw_body": True},
            )
        except Exception:
            pass
        return rule

    def age_minutes(self, item: OsNotificationItem) -> int:
        created = _parse_dt(item.created_at)
        if not created:
            return 0
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - created
        return max(0, int(delta.total_seconds() / 60))

    def is_candidate_unresolved(self, item: OsNotificationItem) -> bool:
        status = _text(item.status).lower()
        if status in ("resolved", "archived", "acknowledged"):
            return False
        return True

    def should_escalate(self, item: OsNotificationItem, rule: NotificationEscalationRule) -> bool:
        if rule.status != "active":
            return False

        source = _text(item.source)
        if source == "recording_alerts":
            source = "recording_alert"

        check_type = (rule.metadata or {}).get("check_type")
        if check_type == "daily_brief_unreviewed":
            if item.type != "manager_daily_brief_reminder":
                return False
            now = datetime.now(timezone.utc)
            if now.hour < 12 and not (rule.metadata or {}).get("force"):
                return False
        elif rule.source:
            source_match = rule.source == source
            if not source_match:
                if rule.applies_to_isn and source == "isn":
                    source_match = True
                elif rule.applies_to_recording and source in ("recording_alert", "recording_alerts"):
                    source_match = True
                if not source_match:
                    return False

        category = _text(item.category)
        if rule.category and rule.category != category and check_type != "daily_brief_unreviewed":
            return False

        severity = _text(item.severity)
        if _severity_rank(severity) < _severity_rank(rule.min_severity):
            return False

        meta = item.metadata or {}
        alert_types = (rule.metadata or {}).get("alert_types")
        if alert_types:
            atype = _text(meta.get("alert_type"))
            if atype and atype not in alert_types:
                return False

        if rule.applies_to_isn and source != "isn":
            if not rule.applies_to_safeguarding:
                return False
        if rule.applies_to_recording and source not in ("recording_alert", "recording_alerts"):
            return False
        if rule.applies_to_safeguarding:
            if not os_notification_preference_service.is_urgent_safeguarding_item(item):
                if category != "safeguarding_network":
                    return False

        age = self.age_minutes(item)
        if age < rule.trigger_after_minutes:
            return False

        if not self.is_candidate_unresolved(item):
            return False

        return True

    def find_escalation_candidates(
        self,
        items: list[OsNotificationItem],
        rules: list[NotificationEscalationRule],
    ) -> list[NotificationEscalationCandidate]:
        candidates: list[NotificationEscalationCandidate] = []
        seen_keys: set[str] = set()

        for item in items:
            key = _text(item.notification_key or item.id)
            for rule in rules:
                if not self.should_escalate(item, rule):
                    continue
                dedupe = f"{key}:{rule.id}"
                if dedupe in seen_keys:
                    continue
                seen_keys.add(dedupe)
                candidates.append(
                    NotificationEscalationCandidate(
                        notification_key=key,
                        source=_text(item.source),
                        category=_text(item.category, "system"),
                        severity=_text(item.severity, "medium"),
                        title=item.title,
                        safe_summary=item.safe_summary or "Operational notification may need oversight.",
                        route=item.route,
                        age_minutes=self.age_minutes(item),
                        current_status=_text(item.status, "unread"),
                        escalation_rule_id=rule.id,
                        route_to_role=rule.route_to_role,
                        route_to_user_id=rule.route_to_user_id,
                        metadata={
                            "no_raw_body": True,
                            "metadata_only": True,
                            "rule_name": rule.name,
                        },
                    )
                )
        return candidates

    def _event_exists(self, notification_key: str, rule_id: str, conn: Any | None) -> bool:
        for ev in self._memory_events:
            if ev.get("notification_key") == notification_key and ev.get("escalation_rule_id") == rule_id:
                if ev.get("status") == "created":
                    return True
        mode = self._detect_events_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 1 FROM os_notification_escalation_events
                        WHERE notification_key = %s AND escalation_rule_id = %s AND status = 'created'
                        LIMIT 1
                        """,
                        (notification_key, rule_id),
                    )
                    return cur.fetchone() is not None
            except Exception:
                pass
        return False

    def create_escalation_event(
        self,
        candidate: NotificationEscalationCandidate,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> str:
        event_id = f"esc_event:{uuid4().hex[:12]}"
        row = {
            "id": event_id,
            "notification_key": candidate.notification_key,
            "escalation_rule_id": candidate.escalation_rule_id,
            "source": candidate.source,
            "category": candidate.category,
            "severity": candidate.severity,
            "route_to_role": candidate.route_to_role,
            "route_to_user_id": candidate.route_to_user_id,
            "safe_summary": candidate.safe_summary,
            "route": candidate.route,
            "status": "created",
            "metadata": {
                **candidate.metadata,
                "created_by": _user_id(current_user),
                "no_raw_body": True,
            },
        }
        mode = self._detect_events_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO os_notification_escalation_events (
                            id, notification_key, escalation_rule_id, source, category,
                            severity, route_to_role, route_to_user_id, safe_summary, route,
                            status, metadata
                        ) VALUES (
                            %(id)s, %(notification_key)s, %(escalation_rule_id)s, %(source)s, %(category)s,
                            %(severity)s, %(route_to_role)s, %(route_to_user_id)s, %(safe_summary)s, %(route)s,
                            %(status)s, %(metadata)s
                        )
                        """,
                        {**row, "metadata": Json(row["metadata"])},
                    )
                conn.commit()
            except Exception as exc:
                logger.warning("escalation_event_persist_failed: %s", exc)
        self._memory_events.append(row)
        return event_id

    def build_recommendations(self, candidates: list[NotificationEscalationCandidate]) -> list[str]:
        if not candidates:
            return ["No overdue escalation candidates at this time. Continue routine oversight checks."]
        recs: list[str] = []
        by_role: dict[str, int] = {}
        for c in candidates:
            role = c.route_to_role or "manager"
            by_role[role] = by_role.get(role, 0) + 1
        for role, count in sorted(by_role.items(), key=lambda x: -x[1]):
            recs.append(
                f"{count} item(s) may need {role.replace('_', ' ')} oversight — review in the notification centre."
            )
        isn_count = sum(1 for c in candidates if c.source == "isn")
        if isn_count:
            recs.append(
                f"{isn_count} safeguarding network item(s) are overdue for acknowledgement. "
                "Route to registered manager or safeguarding lead."
            )
        recs.append(ESCALATION_SAFETY_NOTICE)
        return recs

    def run_escalation_check(
        self,
        current_user: dict[str, Any],
        request: NotificationEscalationCheckRequest | None = None,
        conn: Any | None = None,
    ) -> NotificationEscalationCheckResponse:
        started_at = _now_iso()
        req = request or NotificationEscalationCheckRequest(dry_run=True)
        feed = os_notification_adapter_service.build_feed(
            current_user,
            limit=100,
            unread_only=False,
            conn=conn,
            skip_preference_filter=True,
        )
        items = list(feed.items)
        if not req.include_resolved:
            items = [i for i in items if self.is_candidate_unresolved(i) or i.unread]

        rules = self.list_escalation_rules(current_user, conn=conn)
        if req.home_id is not None:
            items = [i for i in items if i.home_id is None or i.home_id == req.home_id]

        candidates = self.find_escalation_candidates(items, rules)
        created: list[str] = []
        warnings: list[str] = []

        for candidate in candidates:
            if not candidate.route_to_role and not candidate.route_to_user_id:
                warnings.append(
                    f"Could not resolve route for {candidate.notification_key}; "
                    "event recorded with role routing only."
                )
            if req.dry_run:
                continue
            if self._event_exists(candidate.notification_key, candidate.escalation_rule_id, conn):
                continue
            event_id = self.create_escalation_event(candidate, current_user, conn=conn)
            created.append(event_id)

        if not req.dry_run:
            try:
                record_audit_event(
                    event_type="governance",
                    action="notification_escalation_check",
                    actor=current_user,
                    resource_type="notification_escalation",
                    metadata={
                        "dry_run": False,
                        "candidates": len(candidates),
                        "created": len(created),
                        "no_raw_body": True,
                    },
                )
            except Exception:
                pass

        cat_counts = self._count_categories(candidates)
        run_id = f"esc_run:{uuid4().hex[:12]}"
        response = NotificationEscalationCheckResponse(
            generated_at=_now_iso(),
            dry_run=req.dry_run,
            run_id=run_id,
            candidates=candidates,
            created_notifications=created,
            candidate_count=len(candidates),
            event_count=len(created),
            warnings=warnings,
            recommendations=self.build_recommendations(candidates),
            metadata={
                "no_raw_body": True,
                "metadata_only": True,
                "rules_evaluated": len(rules),
            },
            **cat_counts,
        )
        try:
            self.record_check_run(
                current_user,
                response,
                started_at,
                conn=conn,
                home_id=req.home_id,
            )
        except Exception as exc:
            logger.warning("escalation_run_record_failed: %s", exc)
            warnings.append("Escalation check completed but run history could not be saved.")
            response.warnings = warnings
        return response


os_notification_escalation_service = OsNotificationEscalationService()
