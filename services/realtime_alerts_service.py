from __future__ import annotations

import json
from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.proactive_intelligence_service import ProactiveIntelligenceService
from services.predictive_risk_service import PredictiveRiskService


class RealtimeAlertsService:
    """Real-time alert layer for IndiCare.

    Turns proactive and predictive intelligence into active alerts that can be
    shown, acknowledged, escalated and audited. If persistent alert tables do
    not exist yet, generated live alerts are still returned safely.
    """

    def __init__(self) -> None:
        self.proactive = ProactiveIntelligenceService()
        self.predictive = PredictiveRiskService()

    def active_alerts(self, *, current_user: dict[str, Any], days: int = 30, home_id: int | None = None) -> dict[str, Any]:
        resolved_home_id = home_id or self._current_home_id(current_user)
        generated = self.proactive.build_alerts(current_user=current_user, days=days, home_id=resolved_home_id)
        generated_alerts = [self._normalise_generated_alert(alert, resolved_home_id) for alert in generated.get("alerts") or []]
        persistent_alerts = self._read_persistent_alerts(home_id=resolved_home_id)
        alerts = self._dedupe(persistent_alerts + generated_alerts)
        alerts = sorted(alerts, key=lambda item: self._level_score(item.get("level")), reverse=True)
        return {
            "ok": True,
            "home_id": resolved_home_id,
            "summary": self._summary(alerts),
            "alerts": alerts,
            "source": "realtime_alerts",
        }

    def child_alerts(self, *, young_person_id: int, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
        predictive = self.predictive.child_risk(young_person_id=young_person_id, current_user=current_user, days=days)
        risk = predictive.get("risk") or {}
        alerts = []
        for idx, signal in enumerate(risk.get("signals") or []):
            alerts.append({
                "id": f"predictive-child-{young_person_id}-{idx}",
                "level": signal.get("level") or "low",
                "category": "predictive_child_risk",
                "title": signal.get("title") or "Predictive risk signal",
                "message": signal.get("why") or "Predictive risk signal identified.",
                "why": signal.get("why") or "Risk pattern identified from recent records.",
                "recommended_action": signal.get("recommended_action") or "Review source records and decide next steps.",
                "home_id": self._current_home_id(current_user),
                "young_person_id": young_person_id,
                "status": "active",
                "source": "predictive_risk",
            })
        return {
            "ok": True,
            "young_person_id": young_person_id,
            "summary": self._summary(alerts),
            "risk": risk,
            "alerts": alerts,
        }

    def acknowledge_alert(self, *, alert_id: str, current_user: dict[str, Any], comment: str | None = None) -> dict[str, Any]:
        return self._alert_action(alert_id=alert_id, action="acknowledged", current_user=current_user, comment=comment)

    def escalate_alert(self, *, alert_id: str, current_user: dict[str, Any], comment: str | None = None) -> dict[str, Any]:
        return self._alert_action(alert_id=alert_id, action="escalated", current_user=current_user, comment=comment)

    def _alert_action(self, *, alert_id: str, action: str, current_user: dict[str, Any], comment: str | None) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            table = self._first_existing_table(conn, ["realtime_alerts", "alerts", "system_alerts"])
            log_table = self._first_existing_table(conn, ["alert_action_log", "audit_log", "leadership_oversight_log"])
            if table:
                cols = self._columns(conn, table)
                if "status" in cols and "id" in cols:
                    with conn.cursor() as cur:
                        cur.execute(f'UPDATE public."{table}" SET status = %s WHERE id::text = %s', (action, alert_id))
            if log_table:
                self._insert_action_log(conn, log_table, alert_id, action, current_user, comment)
            conn.commit()
        except Exception:
            if conn is not None:
                conn.rollback()
        finally:
            if conn is not None:
                release_db_connection(conn)
        return {"ok": True, "alert_id": alert_id, "status": action, "comment": comment}

    def _read_persistent_alerts(self, *, home_id: int | None) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            table = self._first_existing_table(conn, ["realtime_alerts", "alerts", "system_alerts"])
            if not table:
                return []
            cols = self._columns(conn, table)
            wanted = ["id", "level", "category", "title", "message", "why", "recommended_action", "home_id", "young_person_id", "status", "created_at"]
            select_cols = [column for column in wanted if column in cols]
            if not select_cols:
                return []
            quoted_cols = ", ".join([f'"{column}"' for column in select_cols])
            where = []
            params: list[Any] = []
            if "status" in cols:
                where.append("COALESCE(status, 'active') = 'active'")
            if home_id and "home_id" in cols:
                where.append("home_id = %s")
                params.append(home_id)
            where_sql = "WHERE " + " AND ".join(where) if where else ""
            query = f'SELECT {quoted_cols} FROM public."{table}" {where_sql} ORDER BY created_at DESC NULLS LAST LIMIT 50'
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                return [dict(row) for row in cur.fetchall()]
        except Exception:
            return []
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _normalise_generated_alert(self, alert: dict[str, Any], home_id: int | None) -> dict[str, Any]:
        title = alert.get("title") or alert.get("message") or "Alert"
        return {
            "id": alert.get("id") or f"generated-{self._slug(title)}",
            "level": alert.get("level") or "low",
            "category": alert.get("category") or "generated",
            "title": title,
            "message": alert.get("message") or title,
            "why": alert.get("why") or "Generated from live intelligence.",
            "recommended_action": alert.get("recommended_action") or alert.get("action") or "Review source records and decide next steps.",
            "home_id": home_id,
            "status": "active",
            "source": "generated",
        }

    def _dedupe(self, alerts: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen = set()
        deduped = []
        for alert in alerts:
            key = (alert.get("category"), alert.get("title"), alert.get("home_id"), alert.get("young_person_id"))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(alert)
        return deduped

    def _summary(self, alerts: list[dict[str, Any]]) -> dict[str, int]:
        return {
            "total": len(alerts),
            "critical": len([a for a in alerts if a.get("level") == "critical"]),
            "high": len([a for a in alerts if a.get("level") == "high"]),
            "medium": len([a for a in alerts if a.get("level") == "medium"]),
            "low": len([a for a in alerts if a.get("level") == "low"]),
        }

    def _insert_action_log(self, conn: Any, table: str, alert_id: str, action: str, current_user: dict[str, Any], comment: str | None) -> None:
        cols = self._columns(conn, table)
        payload = {
            "alert_id": alert_id,
            "action": action,
            "status": action,
            "user_id": self._current_user_id(current_user),
            "home_id": self._current_home_id(current_user),
            "comment": comment,
            "notes": comment,
            "metadata": {"source": "realtime_alerts_service"},
            "created_at": "NOW()",
        }
        values = {key: value for key, value in payload.items() if key in cols and value is not None}
        if not values:
            return
        col_sql = ", ".join([f'"{key}"' for key in values])
        placeholders = []
        params = []
        for value in values.values():
            if value == "NOW()":
                placeholders.append("NOW()")
            elif isinstance(value, (dict, list)):
                placeholders.append("%s::jsonb")
                params.append(json.dumps(value))
            else:
                placeholders.append("%s")
                params.append(value)
        with conn.cursor() as cur:
            cur.execute(f'INSERT INTO public."{table}" ({col_sql}) VALUES ({", ".join(placeholders)})', tuple(params))

    def _level_score(self, level: Any) -> int:
        return {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(str(level or "low").lower(), 0)

    def _slug(self, value: str) -> str:
        return "".join(ch.lower() if ch.isalnum() else "-" for ch in value)[:80].strip("-") or "alert"

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id")
            return int(value) if value else None
        except Exception:
            return None

    def _current_user_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
            return int(value) if value else None
        except Exception:
            return None

    def _first_existing_table(self, conn: Any, names: list[str]) -> str | None:
        with conn.cursor() as cur:
            for name in names:
                cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (name,))
                row = cur.fetchone()
                exists = row.get("exists") if isinstance(row, dict) else row and row[0]
                if exists:
                    return name
        return None

    def _columns(self, conn: Any, table_name: str) -> set[str]:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table_name,))
            return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}
