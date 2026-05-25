"""Notification preferences — role defaults, user overrides, urgent safeguarding override."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES, table_exists
from schemas.os_notification_preferences import (
    SEVERITY_ORDER,
    NotificationPreferenceHealth,
    NotificationPreferenceResponse,
    NotificationPreferenceRule,
    NotificationPreferenceSet,
    NotificationPreferenceUpdateRequest,
)
from schemas.os_notifications import OsNotificationItem
from services.audit_event_service import record_audit_event

logger = logging.getLogger("indicare.os_notification_preferences")

PUSH_EMAIL_NOT_CONFIGURED = "Push and email delivery are not configured yet. In-app notifications remain active."

MANAGER_FAMILY_ROLES = frozenset(
    {
        "manager",
        "registered_manager",
        "deputy_manager",
        "deputy",
        "senior",
        "senior_practitioner",
        "responsible_individual",
        "ri",
        "admin",
        "provider_admin",
        "safeguarding_lead",
    }
)

SUPPORT_ROLES = frozenset(
    {
        "support_worker",
        "staff",
        "rsw",
        "residential_support_worker",
        "key_worker",
    }
)

URGENT_SAFEGUARDING_TYPES = frozenset(
    {
        "isn_safeguarding_alert",
        "isn_escalation_required",
        "isn_review_required",
        "isn_manager_action_required",
        "isn_recording_linked_alert",
        "recording_alert_safeguarding",
        "recording_alert_urgent",
        "safeguarding_review_due",
        "safeguarding_escalation_required",
    }
)

DEFAULT_SOURCES: list[tuple[str, str]] = [
    ("recording_alert", "recording"),
    ("isn", "safeguarding_network"),
    ("manager_daily_brief", "daily_brief"),
    ("recording_review", "review"),
    ("intelligence_action", "action"),
    ("governance", "governance"),
    ("system", "system"),
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


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


def _severity_rank(severity: str) -> int:
    return SEVERITY_ORDER.get(_text(severity, "low").lower(), 0)


class OsNotificationPreferenceService:
    def __init__(self) -> None:
        self._memory_rules: dict[str, list[dict[str, Any]]] = {}

    def _detect_storage_mode(self, conn: Any | None = None) -> str:
        if conn is None:
            return "memory"
        try:
            if table_exists(conn, "os_notification_preferences"):
                return "postgresql"
        except Exception:
            pass
        return "memory"

    def get_health(self, conn: Any | None = None) -> NotificationPreferenceHealth:
        mode = self._detect_storage_mode(conn)
        return NotificationPreferenceHealth(
            status="ok",
            persistence_available=mode == "postgresql",
            storage_mode=mode,
            push_email_configured=False,
        )

    def _rule_id(self, scope: str, scope_id: str | None, source: str, category: str) -> str:
        sid = scope_id or "default"
        return f"pref:{scope}:{sid}:{source}:{category}"

    def build_default_rules_for_role(self, role: str) -> list[NotificationPreferenceRule]:
        role_key = _text(role, "staff").lower()
        rules: list[NotificationPreferenceRule] = []

        is_manager = (
            role_key in {r.lower() for r in MANAGER_ROLES}
            or any(tok in role_key for tok in ("manager", "deputy", "senior", "registered", "admin", "safeguarding"))
        )
        is_support = role_key in SUPPORT_ROLES or "support" in role_key
        is_hr = "hr" in role_key or "workforce" in role_key

        for source, category in DEFAULT_SOURCES:
            enabled = True
            min_severity = "low"
            in_app = True

            if is_manager:
                if category in ("workforce",):
                    enabled = False
            elif is_support:
                if category in ("governance", "daily_brief"):
                    enabled = False
                if category == "safeguarding_network":
                    min_severity = "high"
                if category == "recording":
                    min_severity = "medium"
            elif is_hr:
                if category in ("safeguarding_network", "recording", "review"):
                    enabled = False
                min_severity = "medium"
            else:
                if category not in ("system", "handover", "action"):
                    enabled = False
                min_severity = "high"

            rules.append(
                NotificationPreferenceRule(
                    id=self._rule_id("role_default", role_key, source, category),
                    scope="role_default",
                    scope_id=None,
                    role=role_key,
                    source=source,
                    category=category,
                    enabled=enabled,
                    min_severity=min_severity,
                    in_app_enabled=in_app,
                    email_enabled=False,
                    push_enabled=False,
                    urgent_override=True,
                    metadata={"role_default": True, "no_raw_body": True},
                )
            )

        if "handover" not in {c for _, c in DEFAULT_SOURCES}:
            rules.append(
                NotificationPreferenceRule(
                    id=self._rule_id("role_default", role_key, "system", "handover"),
                    scope="role_default",
                    role=role_key,
                    source="system",
                    category="handover",
                    enabled=is_support or is_manager,
                    min_severity="low",
                    in_app_enabled=True,
                    urgent_override=True,
                    metadata={"role_default": True},
                )
            )

        return rules

    def _row_to_rule(self, row: dict[str, Any]) -> NotificationPreferenceRule:
        return NotificationPreferenceRule(
            id=_text(row.get("id")),
            scope=row.get("scope") or "user",
            scope_id=row.get("scope_id"),
            role=row.get("role"),
            source=row.get("source"),
            category=row.get("category"),
            enabled=bool(row.get("enabled", True)),
            min_severity=row.get("min_severity") or "low",
            in_app_enabled=bool(row.get("in_app_enabled", True)),
            email_enabled=bool(row.get("email_enabled", False)),
            push_enabled=bool(row.get("push_enabled", False)),
            urgent_override=bool(row.get("urgent_override", True)),
            quiet_hours_enabled=bool(row.get("quiet_hours_enabled", False)),
            quiet_hours_start=row.get("quiet_hours_start"),
            quiet_hours_end=row.get("quiet_hours_end"),
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def _load_user_rules(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> list[NotificationPreferenceRule]:
        uid = _user_id(current_user)
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM os_notification_preferences
                        WHERE scope = 'user' AND scope_id = %s
                        ORDER BY source, category
                        """,
                        (uid,),
                    )
                    return [self._row_to_rule(dict(r)) for r in cur.fetchall()]
            except Exception as exc:
                logger.warning("preference_load_failed: %s", exc)
        key = f"user:{uid}"
        return [self._row_to_rule(r) for r in self._memory_rules.get(key, [])]

    def get_preferences(
        self,
        current_user: dict[str, Any],
        scope: str = "user",
        conn: Any | None = None,
    ) -> NotificationPreferenceResponse:
        role = _user_role(current_user)
        role_defaults = self.build_default_rules_for_role(role)
        user_rules = self._load_user_rules(current_user, conn=conn) if scope == "user" else []
        effective = self._merge_rules(role_defaults, user_rules)
        limitations = [PUSH_EMAIL_NOT_CONFIGURED]
        if not user_rules:
            limitations.append("Using role-based defaults until you save custom preferences.")

        pref_set = NotificationPreferenceSet(
            scope="user",
            scope_id=_user_id(current_user),
            role=role,
            rules=user_rules or effective,
            urgent_safeguarding_always_on=True,
            limitations=limitations,
            updated_at=_now_iso(),
        )
        return NotificationPreferenceResponse(
            preferences=pref_set,
            role_defaults=role_defaults,
            effective_rules=effective,
            limitations=limitations,
            push_email_status="not_configured_yet",
        )

    def _merge_rules(
        self,
        role_defaults: list[NotificationPreferenceRule],
        user_rules: list[NotificationPreferenceRule],
    ) -> list[NotificationPreferenceRule]:
        if not user_rules:
            return list(role_defaults)
        by_key: dict[tuple[str, str], NotificationPreferenceRule] = {
            (r.source, r.category): r for r in role_defaults
        }
        for rule in user_rules:
            by_key[(rule.source, rule.category)] = rule
        return list(by_key.values())

    def effective_preferences_for_user(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> list[NotificationPreferenceRule]:
        resp = self.get_preferences(current_user, conn=conn)
        return resp.effective_rules

    def update_preferences(
        self,
        current_user: dict[str, Any],
        request: NotificationPreferenceUpdateRequest,
        conn: Any | None = None,
    ) -> NotificationPreferenceResponse:
        uid = _user_id(current_user)
        mode = self._detect_storage_mode(conn)
        now = _now_iso()
        stored: list[dict[str, Any]] = []

        for rule in request.rules:
            rule_id = rule.id or self._rule_id("user", uid, rule.source, rule.category)
            row = {
                "id": rule_id,
                "scope": "user",
                "scope_id": uid,
                "role": _user_role(current_user),
                "source": rule.source,
                "category": rule.category,
                "enabled": rule.enabled,
                "min_severity": rule.min_severity,
                "in_app_enabled": rule.in_app_enabled,
                "email_enabled": False,
                "push_enabled": False,
                "urgent_override": rule.urgent_override,
                "quiet_hours_enabled": rule.quiet_hours_enabled,
                "quiet_hours_start": rule.quiet_hours_start,
                "quiet_hours_end": rule.quiet_hours_end,
                "metadata": {**rule.metadata, "no_raw_body": True, "updated_by": uid},
                "updated_at": now,
            }
            stored.append(row)

            if mode == "postgresql" and conn is not None:
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO os_notification_preferences (
                                id, scope, scope_id, role, source, category,
                                enabled, min_severity, in_app_enabled, email_enabled, push_enabled,
                                urgent_override, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                                metadata, updated_at
                            ) VALUES (
                                %(id)s, %(scope)s, %(scope_id)s, %(role)s, %(source)s, %(category)s,
                                %(enabled)s, %(min_severity)s, %(in_app_enabled)s, %(email_enabled)s, %(push_enabled)s,
                                %(urgent_override)s, %(quiet_hours_enabled)s, %(quiet_hours_start)s, %(quiet_hours_end)s,
                                %(metadata)s, %(updated_at)s
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                enabled = EXCLUDED.enabled,
                                min_severity = EXCLUDED.min_severity,
                                in_app_enabled = EXCLUDED.in_app_enabled,
                                email_enabled = EXCLUDED.email_enabled,
                                push_enabled = EXCLUDED.push_enabled,
                                urgent_override = EXCLUDED.urgent_override,
                                quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
                                quiet_hours_start = EXCLUDED.quiet_hours_start,
                                quiet_hours_end = EXCLUDED.quiet_hours_end,
                                metadata = EXCLUDED.metadata,
                                updated_at = EXCLUDED.updated_at
                            """,
                            {**row, "metadata": Json(row["metadata"])},
                        )
                    conn.commit()
                except Exception as exc:
                    logger.warning("preference_persist_failed: %s", exc)
                    mode = "memory"

        key = f"user:{uid}"
        self._memory_rules[key] = stored
        self.record_preference_audit(current_user, {"rules_updated": len(stored)}, conn=conn)
        return self.get_preferences(current_user, conn=conn)

    def is_urgent_safeguarding_item(self, item: OsNotificationItem) -> bool:
        item_type = _text(item.type)
        if item_type in URGENT_SAFEGUARDING_TYPES:
            return True
        severity = _text(item.severity).lower()
        category = _text(item.category).lower()
        source = _text(item.source).lower()
        meta = item.metadata or {}
        alert_type = _text(meta.get("alert_type"))
        if alert_type in ("safeguarding_review_due", "safeguarding_escalation_required", "high_risk_review_due"):
            return True
        if category == "safeguarding_network" and severity in ("urgent", "high"):
            return True
        if source == "isn" and severity in ("urgent", "high"):
            return True
        if item_type.startswith("isn_") and severity in ("urgent", "high"):
            return True
        return False

    def should_show_item(
        self,
        item: OsNotificationItem,
        preferences: list[NotificationPreferenceRule],
    ) -> bool:
        if self.is_urgent_safeguarding_item(item):
            return True

        source = _text(item.source)
        if source == "recording_alerts":
            source = "recording_alert"
        category = _text(item.category, "system")
        severity = _text(item.severity, "medium")

        rule = None
        for pref in preferences:
            if pref.source == source and pref.category == category:
                rule = pref
                break
        if rule is None:
            for pref in preferences:
                if pref.category == category:
                    rule = pref
                    break

        if rule is None:
            return True

        if not rule.enabled or not rule.in_app_enabled:
            if rule.urgent_override and self.is_urgent_safeguarding_item(item):
                return True
            return False

        if _severity_rank(severity) < _severity_rank(rule.min_severity):
            if rule.urgent_override and self.is_urgent_safeguarding_item(item):
                return True
            return False

        return True

    def apply_preferences(
        self,
        items: list[OsNotificationItem],
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> tuple[list[OsNotificationItem], int]:
        preferences = self.effective_preferences_for_user(current_user, conn=conn)
        visible: list[OsNotificationItem] = []
        hidden = 0
        for item in items:
            if self.should_show_item(item, preferences):
                visible.append(item)
            else:
                hidden += 1
        return visible, hidden

    def record_preference_audit(
        self,
        current_user: dict[str, Any],
        changes: dict[str, Any],
        conn: Any | None = None,
    ) -> None:
        _ = conn
        try:
            record_audit_event(
                event_type="governance",
                action="notification_preferences_updated",
                actor=current_user,
                resource_type="notification_preferences",
                resource_id=_user_id(current_user),
                metadata={**changes, "no_raw_body": True},
            )
        except Exception as exc:
            logger.debug("preference_audit_skipped: %s", exc)


os_notification_preference_service = OsNotificationPreferenceService()
