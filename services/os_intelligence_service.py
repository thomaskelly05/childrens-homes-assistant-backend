from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection


class OSIntelligenceService:
    """Production-safe intelligence layer for the residential children's home OS.

    Uses existing records only. It does not require new schema and is tolerant of
    missing tables/columns by falling back safely. The aim is to turn records into
    actionable insight: risk, safeguarding, care plan review, child voice,
    therapeutic practice and inspection readiness.
    """

    def child_intelligence(self, *, young_person_id: int) -> dict[str, Any]:
        daily = self._daily_notes(young_person_id)
        incidents = self._incidents(young_person_id)
        risks = self._risks(young_person_id)
        plans = self._plans(young_person_id)

        child_voice = self._child_voice(daily)
        incident_patterns = self._incident_patterns(incidents)
        safeguarding = self._safeguarding_signals(daily, incidents)
        risk_actions = self._risk_actions(incidents, risks)
        care_plan_actions = self._care_plan_actions(daily, incidents, plans)
        therapeutic = self._therapeutic_quality(daily, incidents, plans)
        readiness = self._inspection_readiness(
            child_voice=child_voice,
            safeguarding=safeguarding,
            risk_actions=risk_actions,
            care_plan_actions=care_plan_actions,
            therapeutic=therapeutic,
            incidents=incidents,
            risks=risks,
            plans=plans,
        )

        return {
            "ok": True,
            "generated_at": self._now(),
            "young_person_id": young_person_id,
            "summary": {
                "daily_records_30_days": len(daily),
                "incidents_30_days": len(incidents),
                "active_risks": len(risks),
                "active_plans": len(plans),
                "inspection_readiness_score": readiness.get("score"),
                "priority_action_count": len(readiness.get("actions", [])),
            },
            "child_voice": child_voice,
            "incident_patterns": incident_patterns,
            "safeguarding": safeguarding,
            "risk_actions": risk_actions,
            "care_plan_actions": care_plan_actions,
            "therapeutic_quality": therapeutic,
            "inspection_readiness": readiness,
            "assistant_prompts": [
                "Summarise this child's lived experience and progress.",
                "What risks or safeguarding patterns need manager review?",
                "Which care plan or risk assessment needs updating?",
                "Prepare an Ofsted-ready child summary with evidence.",
            ],
        }

    def home_intelligence(self, *, home_id: int) -> dict[str, Any]:
        children = self._children(home_id)
        child_outputs = []
        for child in children[:30]:
            cid = child.get("id") or child.get("young_person_id")
            if not cid:
                continue
            try:
                output = self.child_intelligence(young_person_id=int(cid))
                output["name"] = self._child_name(child)
                child_outputs.append(output)
            except Exception:
                continue

        high_priority = []
        for item in child_outputs:
            score = int((item.get("inspection_readiness") or {}).get("score") or 0)
            actions = (item.get("inspection_readiness") or {}).get("actions") or []
            if score < 75 or actions:
                high_priority.append({
                    "young_person_id": item.get("young_person_id"),
                    "name": item.get("name") or f"Young person {item.get('young_person_id')}",
                    "score": score,
                    "actions": actions[:5],
                    "href": f"/young-people-shell?young_person_id={item.get('young_person_id')}",
                })

        scores = [int((item.get("inspection_readiness") or {}).get("score") or 0) for item in child_outputs]
        avg_score = round(sum(scores) / len(scores)) if scores else 0
        return {
            "ok": True,
            "generated_at": self._now(),
            "home_id": home_id,
            "summary": {
                "children_reviewed": len(child_outputs),
                "average_inspection_readiness": avg_score,
                "children_needing_review": len(high_priority),
            },
            "children_needing_review": high_priority,
            "assistant_prompts": [
                "Which children need manager review first?",
                "What are the main safeguarding themes across the home?",
                "Prepare a Reg 45 evidence summary from current intelligence.",
            ],
        }

    def _daily_notes(self, young_person_id: int) -> list[dict[str, Any]]:
        since = date.today() - timedelta(days=30)
        return self._optional_rows([
            (
                """
                SELECT * FROM daily_notes
                WHERE young_person_id = %s AND note_date >= %s
                ORDER BY note_date DESC, id DESC
                LIMIT 80
                """,
                (young_person_id, since),
            ),
            (
                """
                SELECT * FROM young_person_daily_notes
                WHERE young_person_id = %s AND note_date >= %s
                ORDER BY note_date DESC, id DESC
                LIMIT 80
                """,
                (young_person_id, since),
            ),
        ])

    def _incidents(self, young_person_id: int) -> list[dict[str, Any]]:
        since = date.today() - timedelta(days=30)
        return self._optional_rows([
            (
                """
                SELECT * FROM incidents
                WHERE young_person_id = %s AND incident_datetime::date >= %s
                ORDER BY incident_datetime DESC, id DESC
                LIMIT 80
                """,
                (young_person_id, since),
            ),
            (
                """
                SELECT * FROM young_person_incidents
                WHERE young_person_id = %s AND incident_datetime::date >= %s
                ORDER BY incident_datetime DESC, id DESC
                LIMIT 80
                """,
                (young_person_id, since),
            ),
        ])

    def _risks(self, young_person_id: int) -> list[dict[str, Any]]:
        return self._optional_rows([
            (
                """
                SELECT * FROM young_person_risk_assessments
                WHERE young_person_id = %s AND COALESCE(archived, false) = false
                ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            ),
            (
                """
                SELECT * FROM risk_assessments
                WHERE young_person_id = %s AND COALESCE(archived, false) = false
                ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            ),
        ])

    def _plans(self, young_person_id: int) -> list[dict[str, Any]]:
        return self._optional_rows([
            (
                """
                SELECT * FROM young_person_support_plans
                WHERE young_person_id = %s AND COALESCE(archived, false) = false
                ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            ),
            (
                """
                SELECT * FROM support_plans
                WHERE young_person_id = %s AND COALESCE(archived, false) = false
                ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            ),
        ])

    def _children(self, home_id: int) -> list[dict[str, Any]]:
        return self._optional_rows([
            (
                """
                SELECT id, first_name, last_name, home_id
                FROM young_people
                WHERE home_id = %s
                ORDER BY first_name, last_name
                LIMIT 100
                """,
                (home_id,),
            )
        ])

    def _child_voice(self, daily: list[dict[str, Any]]) -> dict[str, Any]:
        voices = []
        missing = 0
        for row in daily:
            voice = self._first(row, ["young_person_voice", "child_voice", "voice"])
            if voice:
                voices.append({"recorded_at": row.get("note_date") or row.get("created_at"), "voice": voice})
            else:
                missing += 1
        return {
            "status": "visible" if voices else "not_visible",
            "recent_voice_count": len(voices),
            "missing_voice_count": missing,
            "examples": voices[:8],
        }

    def _incident_patterns(self, incidents: list[dict[str, Any]]) -> dict[str, Any]:
        by_category: dict[str, int] = {}
        by_type: dict[str, int] = {}
        for row in incidents:
            cat = str(row.get("category") or "uncategorised").lower()
            typ = str(row.get("incident_type") or "incident").lower()
            by_category[cat] = by_category.get(cat, 0) + 1
            by_type[typ] = by_type.get(typ, 0) + 1
        patterns = []
        for key, count in by_category.items():
            if count >= 3:
                patterns.append({"type": "category_repeat", "priority": "high", "message": f"{count} incidents recorded as {key} in the last 30 days."})
        for key, count in by_type.items():
            if count >= 3:
                patterns.append({"type": "type_repeat", "priority": "high", "message": f"{count} incidents of type {key} in the last 30 days."})
        if len(incidents) >= 5:
            patterns.append({"type": "frequency", "priority": "high", "message": f"{len(incidents)} incidents in the last 30 days require review."})
        return {"incident_count": len(incidents), "patterns": patterns, "status": "review_needed" if patterns else "stable"}

    def _safeguarding_signals(self, daily: list[dict[str, Any]], incidents: list[dict[str, Any]]) -> dict[str, Any]:
        words = ["missing", "self-harm", "self harm", "exploitation", "police", "lado", "injury", "restraint", "physical intervention", "disclosure", "allegation"]
        signals = []
        for source, rows in [("daily_diary", daily), ("incident", incidents)]:
            for row in rows:
                text = self._record_text(row).lower()
                found = [word for word in words if word in text]
                if found:
                    signals.append({"source": source, "record_id": row.get("id"), "keywords": found[:5], "recorded_at": row.get("note_date") or row.get("incident_datetime") or row.get("created_at")})
        return {"status": "manager_review_required" if signals else "no_signals_found", "signals": signals[:15], "signal_count": len(signals)}

    def _risk_actions(self, incidents: list[dict[str, Any]], risks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        actions = []
        if incidents and not risks:
            actions.append({"priority": "high", "type": "risk_missing", "message": "Incidents are recorded but no active risk assessment was found."})
        for risk in risks:
            review_date = self._parse_date(risk.get("review_date"))
            if review_date and review_date < date.today():
                actions.append({"priority": "high", "type": "risk_overdue", "message": f"Risk assessment '{risk.get('title') or risk.get('category') or risk.get('id')}' is overdue for review."})
        if len(incidents) >= 3:
            actions.append({"priority": "high", "type": "risk_update_suggested", "message": "Incident frequency suggests the risk assessment should be reviewed and updated."})
        return actions[:10]

    def _care_plan_actions(self, daily: list[dict[str, Any]], incidents: list[dict[str, Any]], plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
        actions = []
        if not plans:
            actions.append({"priority": "high", "type": "care_plan_missing", "message": "No active care/support plan was found."})
        for plan in plans:
            review_date = self._parse_date(plan.get("review_date"))
            if review_date and review_date < date.today():
                actions.append({"priority": "high", "type": "care_plan_overdue", "message": f"Care/support plan '{plan.get('title') or plan.get('plan_type') or plan.get('id')}' is overdue for review."})
        if len(daily) < 5:
            actions.append({"priority": "medium", "type": "daily_story_gap", "message": "There are limited daily life diary records in the last 30 days."})
        if len(incidents) >= 3:
            actions.append({"priority": "medium", "type": "care_plan_update_suggested", "message": "Repeated incidents suggest the care plan should be reviewed for proactive support."})
        return actions[:10]

    def _therapeutic_quality(self, daily: list[dict[str, Any]], incidents: list[dict[str, Any]], plans: list[dict[str, Any]]) -> dict[str, Any]:
        pace_terms = ["pace", "curious", "curiosity", "empathy", "empathic", "acceptance", "playful", "playfulness", "co-regulation", "regulation"]
        rows = daily + incidents + plans
        mentions = 0
        for row in rows:
            text = self._record_text(row).lower()
            if any(term in text for term in pace_terms):
                mentions += 1
        status = "visible" if mentions >= 3 else "needs_strengthening" if rows else "no_records"
        return {"status": status, "pace_mentions": mentions, "records_reviewed": len(rows), "message": "PACE/therapeutic language is visible." if status == "visible" else "Therapeutic/PACE reflection should be more visible in records."}

    def _inspection_readiness(self, **kwargs: Any) -> dict[str, Any]:
        score = 100
        actions = []
        child_voice = kwargs.get("child_voice") or {}
        safeguarding = kwargs.get("safeguarding") or {}
        risk_actions = kwargs.get("risk_actions") or []
        care_plan_actions = kwargs.get("care_plan_actions") or []
        therapeutic = kwargs.get("therapeutic") or {}
        incidents = kwargs.get("incidents") or []
        risks = kwargs.get("risks") or []
        plans = kwargs.get("plans") or []

        if child_voice.get("status") != "visible":
            score -= 15
            actions.append({"priority": "high", "message": "Child voice is not visible enough in recent records."})
        if safeguarding.get("signal_count", 0) > 0:
            score -= 10
            actions.append({"priority": "high", "message": "Safeguarding signals require manager review."})
        if risk_actions:
            score -= min(25, len(risk_actions) * 8)
            actions.extend(risk_actions[:4])
        if care_plan_actions:
            score -= min(25, len(care_plan_actions) * 8)
            actions.extend(care_plan_actions[:4])
        if therapeutic.get("status") != "visible":
            score -= 10
            actions.append({"priority": "medium", "message": "PACE/therapeutic reflection should be strengthened."})
        if incidents and not risks:
            score -= 15
        if not plans:
            score -= 15

        score = max(0, min(100, score))
        status = "strong" if score >= 85 else "review_needed" if score >= 65 else "urgent_review_required"
        return {"score": score, "status": status, "actions": actions[:12]}

    def _optional_rows(self, queries: list[tuple[str, tuple[Any, ...]]]) -> list[dict[str, Any]]:
        for query, params in queries:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, params)
                        rows = cur.fetchall()
                return [dict(row) for row in rows]
            except Exception:
                continue
        return []

    def _first(self, row: dict[str, Any], keys: list[str]) -> str:
        for key in keys:
            value = row.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()
        return ""

    def _record_text(self, row: dict[str, Any]) -> str:
        parts = []
        for value in row.values():
            if isinstance(value, (str, int, float)):
                parts.append(str(value))
        return "\n".join(parts)

    def _parse_date(self, value: Any) -> date | None:
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
        except Exception:
            try:
                return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
            except Exception:
                return None

    def _child_name(self, child: dict[str, Any]) -> str:
        return " ".join([str(child.get("first_name") or ""), str(child.get("last_name") or "")]).strip() or f"Young person {child.get('id')}"

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"
