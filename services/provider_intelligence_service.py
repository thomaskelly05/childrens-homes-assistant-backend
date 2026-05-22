from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.manager_intelligence_service import ManagerIntelligenceService
from services.document_os_core import evidence_ref, matching_records, NO_EVIDENCE_FOUND
from services.operational_feed_service import build_operational_feed


class ProviderIntelligenceService:
    """Provider-level intelligence across multiple homes.

    Gives directors, RIs and provider leaders a single view of risk, evidence
    gaps, review pressure and operational intelligence across homes.
    """

    def __init__(self) -> None:
        self.manager_intelligence = ManagerIntelligenceService()

    def build_dashboard(self, *, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
        homes = self._homes_for_user(current_user)
        results = []
        for home in homes:
            home_id = self._safe_int(home.get("id"))
            if not home_id:
                continue
            intelligence = self.manager_intelligence.build_dashboard(
                current_user={**current_user, "home_id": home_id},
                home_id=home_id,
                days=days,
            )
            if not intelligence.get("ok"):
                results.append({
                    "home_id": home_id,
                    "home_name": home.get("name") or home.get("home_name") or f"Home {home_id}",
                    "risk": "unknown",
                    "incidents": 0,
                    "safeguarding": 0,
                    "missing": 0,
                    "review_queue": 0,
                    "evidence_gaps": 0,
                    "document_gaps": 0,
                    "error": intelligence.get("detail") or intelligence.get("error"),
                })
                continue
            risks = intelligence.get("risks") or {}
            summary = intelligence.get("summary") or {}
            results.append({
                "home_id": home_id,
                "home_name": home.get("name") or home.get("home_name") or f"Home {home_id}",
                "risk": risks.get("status") or "low",
                "incidents": risks.get("incident_count") or 0,
                "safeguarding": risks.get("safeguarding_count") or 0,
                "missing": risks.get("missing_count") or 0,
                "review_queue": summary.get("review_queue") or 0,
                "evidence_gaps": len(intelligence.get("evidence_gaps") or []),
                "document_gaps": len(intelligence.get("document_gaps") or []),
                "recommended_actions": intelligence.get("recommended_actions") or [],
            })
        return {
            "ok": True,
            "days": days,
            "summary": self._summary(results),
            "homes": sorted(results, key=lambda item: self._risk_score(item.get("risk")), reverse=True),
        }

    def _home_snapshot_from_feed(self, home: dict[str, Any], feed: dict[str, Any]) -> dict[str, Any]:
        home_id = self._safe_int(home.get("id"))
        climate = (feed.get("home_operational_intelligence") or {}).get("home_climate") or {}
        inspection = feed.get("inspection_intelligence") or {}
        queue = feed.get("manager_queue") or {}
        return {
            "home_id": home_id,
            "home_name": home.get("name") or f"Home {home_id}",
            "safeguarding_pressure": climate.get("safeguarding_pressure"),
            "emotional_climate": climate.get("emotional_climate"),
            "workforce_pressure": climate.get("workforce_pressure"),
            "inspection_readiness": inspection.get("overall_readiness"),
            "manager_queue_total": queue.get("total"),
            "event_count": feed.get("event_count"),
        }

    def _build_home_feed_snapshot(self, conn: Any, home: dict[str, Any], *, limit: int) -> dict[str, Any] | None:
        home_id = self._safe_int(home.get("id"))
        if not home_id:
            return None
        feed = build_operational_feed(conn, home_id=home_id, limit=limit)
        return self._home_snapshot_from_feed(home, feed)

    def build_operational_convergence(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        limit: int = 30,
        max_workers: int = 4,
    ) -> dict[str, Any]:
        """Cross-home operational convergence from live operational feed intelligence."""
        homes = self._homes_for_user(current_user)
        home_snapshots: list[dict[str, Any]] = []
        eligible = [home for home in homes if self._safe_int(home.get("id"))]

        if len(eligible) <= 1:
            for home in eligible:
                snapshot = self._build_home_feed_snapshot(conn, home, limit=limit)
                if snapshot:
                    home_snapshots.append(snapshot)
        else:
            workers = min(max_workers, len(eligible))
            with ThreadPoolExecutor(max_workers=workers) as executor:
                futures = {
                    executor.submit(self._build_home_feed_snapshot, conn, home, limit=limit): home
                    for home in eligible
                }
                for future in as_completed(futures):
                    snapshot = future.result()
                    if snapshot:
                        home_snapshots.append(snapshot)

        safeguarding_scores = [
            int((snap.get("safeguarding_pressure") or {}).get("pressure_score") or 0)
            for snap in home_snapshots
        ]
        emotional_unsettled = sum(
            1 for snap in home_snapshots if (snap.get("emotional_climate") or {}).get("state") == "unsettled"
        )
        inspection_risk = sum(
            1 for snap in home_snapshots if snap.get("inspection_readiness") == "requires_immediate_attention"
        )
        workforce_pressure = sum(
            int((snap.get("workforce_pressure") or {}).get("queue_items") or 0) for snap in home_snapshots
        )
        placement_pressure = sum(
            1 for snap in home_snapshots if (snap.get("safeguarding_pressure") or {}).get("state") != "stable"
        )

        escalation_score = min(
            100,
            sum(safeguarding_scores) + (emotional_unsettled * 5) + (inspection_risk * 10) + min(workforce_pressure, 30),
        )

        return {
            "ok": True,
            "cross_home_safeguarding_pressure": {
                "total_pressure_score": sum(safeguarding_scores),
                "homes_under_pressure": sum(
                    1 for snap in home_snapshots
                    if (snap.get("safeguarding_pressure") or {}).get("state") != "stable"
                ),
            },
            "cross_home_emotional_climate": {
                "unsettled_homes": emotional_unsettled,
                "homes": [
                    {"home_id": snap["home_id"], "state": (snap.get("emotional_climate") or {}).get("state")}
                    for snap in home_snapshots
                ],
            },
            "provider_inspection_risk": {
                "homes_requiring_attention": inspection_risk,
                "readiness_breakdown": [snap.get("inspection_readiness") for snap in home_snapshots],
            },
            "workforce_pressure": {"total_queue_items": workforce_pressure},
            "placement_stability_indicators": {"homes_with_pressure": placement_pressure},
            "home_comparison": sorted(
                home_snapshots,
                key=lambda item: int((item.get("safeguarding_pressure") or {}).get("pressure_score") or 0),
                reverse=True,
            ),
            "operational_escalation_score": escalation_score,
            "summary": (
                f"Provider intelligence across {len(home_snapshots)} home(s) with escalation score {escalation_score}."
            ),
        }

    def build_os_snapshot(self, *, records: list[dict[str, Any]], current_user: dict[str, Any] | None = None) -> dict[str, Any]:
        """Provider Oversight OS snapshot from supplied evidence only."""
        areas = {
            "safeguarding": ("safeguarding", "missing", "exploitation", "lado"),
            "inspection_readiness": ("ofsted", "inspection", "reg 44", "reg 45"),
            "workforce": ("staff", "supervision", "agency", "training"),
            "quality_assurance": ("qa", "audit", "quality assurance", "evidence gap"),
            "placement_stability": ("placement", "stability", "breakdown", "notice"),
        }
        sections = {}
        for area, terms in areas.items():
            matches = matching_records(records, terms)
            sections[area] = {
                "summary": f"{len(matches)} evidence item(s) found." if matches else NO_EVIDENCE_FOUND,
                "evidence_links": [evidence_ref(record, reason=f"provider oversight: {area}") for record in matches[:10]],
            }
        return {
            "ok": True,
            "status": "draft",
            "editable": True,
            "human_review_required": True,
            "provider_id": (current_user or {}).get("provider_id"),
            "sections": sections,
        }

    def _homes_for_user(self, current_user: dict[str, Any]) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            table = self._first_existing_table(conn, ["homes", "care_homes", "childrens_homes"])
            if not table:
                home_id = self._safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))
                return [{"id": home_id, "name": "Current home"}] if home_id else []
            cols = self._columns(conn, table)
            id_col = "id"
            name_col = "name" if "name" in cols else "home_name" if "home_name" in cols else None
            provider_col = "provider_id" if "provider_id" in cols else "organisation_id" if "organisation_id" in cols else None
            where = []
            params: list[Any] = []
            provider_id = self._safe_int(current_user.get("provider_id") or current_user.get("organisation_id") or current_user.get("organization_id"))
            role = str(current_user.get("role") or current_user.get("user_role") or "").lower()
            if provider_col and provider_id:
                where.append(f'"{provider_col}" = %s')
                params.append(provider_id)
            elif role not in {"admin", "super_admin", "superadmin", "provider_admin", "responsible_individual", "ri", "director"}:
                home_id = self._safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))
                if home_id:
                    where.append('"id" = %s')
                    params.append(home_id)
            where_sql = "WHERE " + " AND ".join(where) if where else ""
            select_name = f', "{name_col}" AS name' if name_col else ", NULL AS name"
            with conn.cursor() as cur:
                cur.execute(f'SELECT "{id_col}" AS id {select_name} FROM public."{table}" {where_sql} ORDER BY "{id_col}" ASC LIMIT 100', tuple(params))
                return [dict(row) for row in cur.fetchall()]
        except Exception:
            home_id = self._safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))
            return [{"id": home_id, "name": "Current home"}] if home_id else []
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _summary(self, homes: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "total_homes": len(homes),
            "high_risk": len([home for home in homes if home.get("risk") == "high"]),
            "medium_risk": len([home for home in homes if home.get("risk") == "medium"]),
            "low_risk": len([home for home in homes if home.get("risk") == "low"]),
            "unknown_risk": len([home for home in homes if home.get("risk") == "unknown"]),
            "total_incidents": sum(int(home.get("incidents") or 0) for home in homes),
            "total_safeguarding": sum(int(home.get("safeguarding") or 0) for home in homes),
            "total_review_queue": sum(int(home.get("review_queue") or 0) for home in homes),
            "total_evidence_gaps": sum(int(home.get("evidence_gaps") or 0) for home in homes),
        }

    def _risk_score(self, risk: Any) -> int:
        return {"high": 3, "medium": 2, "low": 1, "unknown": 0}.get(str(risk or "unknown"), 0)

    def _safe_int(self, value: Any) -> int | None:
        try:
            parsed = int(value)
            return parsed if parsed > 0 else None
        except Exception:
            return None

    def _first_existing_table(self, conn, names: list[str]) -> str | None:
        with conn.cursor() as cur:
            for name in names:
                cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (name,))
                row = cur.fetchone()
                exists = row.get("exists") if isinstance(row, dict) else row and row[0]
                if exists:
                    return name
        return None

    def _columns(self, conn, table_name: str) -> set[str]:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table_name,))
            return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}
