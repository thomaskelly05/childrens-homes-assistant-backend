from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from db import academy_db
from db.connection import get_db_connection
from services.academy_service import AcademyService


@dataclass(frozen=True)
class RecommendationRule:
    key: str
    title: str
    reason: str
    priority: str
    module_keywords: tuple[str, ...]
    supervision_prompt: str
    manager_action: str


class AcademyIntelligenceService:
    """Builds OS-linked learning recommendations for IndiCare Academy.

    This first slice is deliberately schema-light. It reads from existing Academy
    tables and cautiously samples likely OS tables when they exist. Missing OS
    tables are treated as no signal, so the Academy can run while the wider OS
    continues to stabilise.
    """

    INCIDENT_WINDOW_DAYS = 90
    SUPERVISION_WINDOW_DAYS = 120
    DAILY_NOTE_WINDOW_DAYS = 30

    RULES: tuple[RecommendationRule, ...] = (
        RecommendationRule(
            key="incident_response",
            title="Incident response and reflective recording",
            reason="Recent incident activity suggests this learner may benefit from refreshed practice around incident response, debrief and defensible recording.",
            priority="high",
            module_keywords=("incident", "behaviour", "de-escalation", "restrictive", "restraint"),
            supervision_prompt="Explore the learner's confidence with incident response, de-escalation, post-incident reflection, and how they evidence the child's voice after an incident.",
            manager_action="Review one recent incident record with the learner and agree one practice improvement action.",
        ),
        RecommendationRule(
            key="daily_note_quality",
            title="Daily note quality and meaningful recording",
            reason="Recording signals suggest the learner may need support to strengthen daily notes, reflection, chronology value and child-centred language.",
            priority="medium",
            module_keywords=("daily note", "recording", "chronology", "professional curiosity"),
            supervision_prompt="Review whether daily notes describe impact, voice, presentation, actions taken and follow-up, rather than only listing events.",
            manager_action="Sample three daily notes and give feedback against the home recording standard.",
        ),
        RecommendationRule(
            key="supervision_themes",
            title="Supervision-to-learning follow through",
            reason="Supervision or practice themes indicate a learning action should be carried into Academy, not left only in supervision notes.",
            priority="medium",
            module_keywords=("supervision", "reflective", "safeguarding", "professional"),
            supervision_prompt="Turn the most recent supervision theme into a specific learning goal, evidence expectation and review date.",
            manager_action="Link one Academy module or workbook to the learner's next supervision action plan.",
        ),
        RecommendationRule(
            key="mandatory_training",
            title="Mandatory training recovery",
            reason="Mandatory Academy items are due or overdue and should be prioritised to protect compliance and practice safety.",
            priority="high",
            module_keywords=("safeguarding", "medication", "first aid", "fire", "mandatory"),
            supervision_prompt="Discuss barriers to completing mandatory training and agree protected completion time.",
            manager_action="Set a completion date and check progress weekly until recovered.",
        ),
        RecommendationRule(
            key="evidence_portfolio",
            title="Evidence portfolio building",
            reason="There is an opportunity to turn recent OS work into Academy evidence for competency, workbook or qualification progress.",
            priority="low",
            module_keywords=("evidence", "portfolio", "qualification", "workbook"),
            supervision_prompt="Identify one real practice example that can be written up as evidence for a workbook or qualification unit.",
            manager_action="Ask the learner to upload or write one evidence item linked to recent practice.",
        ),
    )

    def get_my_intelligence(self, *, current_user: dict[str, Any]) -> dict[str, Any]:
        return self.get_user_intelligence(
            user_id=self._current_user_id(current_user),
            current_user=current_user,
        )

    def get_user_intelligence(
        self,
        *,
        user_id: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        self._ensure_can_view_user(user_id=user_id, current_user=current_user)

        academy = AcademyService()
        profile = academy.get_learner_profile_summary(user_id)
        modules = academy.get_user_modules(user_id)
        workbooks = academy.get_user_workbooks(user_id)
        certificates = academy.get_user_certificates(user_id)
        evidence = academy.get_user_evidence(user_id)

        user_home_id = self._home_id_for_user(user_id) or self._current_user_home_id(current_user)
        signals = self._build_user_signals(user_id=user_id, home_id=user_home_id)

        learning_needs = self._derive_learning_needs(
            modules=modules,
            workbooks=workbooks,
            evidence=evidence,
            signals=signals,
        )
        recommendations = self._build_recommendations(learning_needs)

        return {
            "user_id": user_id,
            "home_id": user_home_id,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "priority_score": self._priority_score(learning_needs, modules, workbooks, signals),
            "profile": profile.model_dump() if profile else None,
            "academy_snapshot": {
                "modules_assigned": len(modules),
                "modules_overdue": sum(1 for row in modules if row.get("is_overdue")),
                "mandatory_due": sum(
                    1
                    for row in modules
                    if row.get("mandatory") and row.get("progress_status") not in {"completed", "passed"}
                ),
                "workbooks": len(workbooks),
                "workbooks_needing_amendment": sum(1 for row in workbooks if row.get("status") == "needs_amendment"),
                "certificates": len(certificates),
                "evidence_items": len(evidence),
            },
            "os_signals": signals,
            "learning_needs": learning_needs,
            "recommended_modules": recommendations["modules"],
            "recommended_workbooks": recommendations["workbooks"],
            "supervision_prompts": recommendations["supervision_prompts"],
            "practice_risks": recommendations["practice_risks"],
            "evidence_opportunities": recommendations["evidence_opportunities"],
            "manager_actions": recommendations["manager_actions"],
        }

    def get_home_intelligence(
        self,
        *,
        home_id: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        self._ensure_manager(current_user)

        compliance = AcademyService().get_home_compliance(home_id)
        staff_rows = self._staff_for_home(home_id)
        staff_payloads = [
            self.get_user_intelligence(user_id=int(row["id"]), current_user=current_user)
            for row in staff_rows[:50]
            if row.get("id")
        ]

        top_priorities = sorted(
            staff_payloads,
            key=lambda item: int(item.get("priority_score") or 0),
            reverse=True,
        )[:10]

        return {
            "home_id": home_id,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "compliance": compliance.model_dump() if compliance else None,
            "staff_count": len(staff_rows),
            "highest_priority_staff": [
                {
                    "user_id": item["user_id"],
                    "priority_score": item["priority_score"],
                    "learning_needs": item["learning_needs"][:3],
                    "manager_actions": item["manager_actions"][:3],
                }
                for item in top_priorities
            ],
            "home_learning_themes": self._home_learning_themes(staff_payloads),
        }

    def assign_recommendations(
        self,
        *,
        user_id: int,
        current_user: dict[str, Any],
        due_date: date | None = None,
    ) -> dict[str, Any]:
        self._ensure_manager(current_user)
        intelligence = self.get_user_intelligence(user_id=user_id, current_user=current_user)
        service = AcademyService()

        assigned: list[dict[str, Any]] = []
        for recommendation in intelligence.get("recommended_modules", []):
            module_id = recommendation.get("module_id")
            if not module_id:
                continue
            rows = service.assign_module_to_users(
                module_id=int(module_id),
                assigned_to_user_ids=[user_id],
                assigned_by_user_id=self._current_user_id(current_user),
                home_id=self._current_user_home_id(current_user),
                mandatory=recommendation.get("priority") == "high",
                due_date=due_date,
                assigned_reason=recommendation.get("reason"),
            )
            assigned.extend(rows)

        return {
            "user_id": user_id,
            "assigned_count": len(assigned),
            "assigned": assigned,
            "source_priority_score": intelligence.get("priority_score"),
        }

    def _build_user_signals(self, *, user_id: int, home_id: int | None) -> dict[str, Any]:
        return {
            "incident_window_days": self.INCIDENT_WINDOW_DAYS,
            "recent_incidents": self._count_recent_incidents(user_id=user_id, home_id=home_id),
            "recent_supervision_notes": self._count_recent_supervisions(user_id=user_id),
            "recent_daily_notes": self._count_recent_daily_notes(user_id=user_id, home_id=home_id),
            "daily_note_quality_warnings": self._count_daily_note_quality_warnings(user_id=user_id, home_id=home_id),
        }

    def _derive_learning_needs(
        self,
        *,
        modules: list[dict[str, Any]],
        workbooks: list[dict[str, Any]],
        evidence: list[dict[str, Any]],
        signals: dict[str, Any],
    ) -> list[dict[str, Any]]:
        needs: list[dict[str, Any]] = []

        if signals.get("recent_incidents", 0) >= 2:
            needs.append(self._need_from_rule("incident_response", signals.get("recent_incidents", 0)))

        if signals.get("daily_note_quality_warnings", 0) >= 3:
            needs.append(self._need_from_rule("daily_note_quality", signals.get("daily_note_quality_warnings", 0)))

        if signals.get("recent_supervision_notes", 0) > 0:
            needs.append(self._need_from_rule("supervision_themes", signals.get("recent_supervision_notes", 0)))

        mandatory_due = sum(
            1
            for row in modules
            if row.get("mandatory") and row.get("progress_status") not in {"completed", "passed"}
        )
        mandatory_overdue = sum(1 for row in modules if row.get("mandatory") and row.get("is_overdue"))
        if mandatory_due or mandatory_overdue:
            needs.append(
                {
                    **self._need_from_rule("mandatory_training", mandatory_overdue or mandatory_due),
                    "mandatory_due": mandatory_due,
                    "mandatory_overdue": mandatory_overdue,
                }
            )

        workbooks_needing_amendment = sum(1 for row in workbooks if row.get("status") == "needs_amendment")
        if len(evidence) < 2 or workbooks_needing_amendment:
            needs.append(
                {
                    **self._need_from_rule("evidence_portfolio", len(evidence)),
                    "workbooks_needing_amendment": workbooks_needing_amendment,
                }
            )

        return self._dedupe_needs(needs)

    def _build_recommendations(self, learning_needs: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        modules_catalogue = academy_db.list_modules(active=True)
        recommended_modules: list[dict[str, Any]] = []
        recommended_workbooks: list[dict[str, Any]] = []
        supervision_prompts: list[dict[str, Any]] = []
        practice_risks: list[dict[str, Any]] = []
        evidence_opportunities: list[dict[str, Any]] = []
        manager_actions: list[dict[str, Any]] = []

        for need in learning_needs:
            rule = self._rule_by_key(str(need["key"]))
            if not rule:
                continue

            matched_modules = self._match_modules(modules_catalogue, rule.module_keywords)
            for module in matched_modules[:3]:
                recommended_modules.append(
                    {
                        "module_id": module.get("id"),
                        "title": module.get("title"),
                        "code": module.get("code"),
                        "priority": rule.priority,
                        "reason": rule.reason,
                        "link": f"/academy/module-detail.html?id={module.get('id')}",
                    }
                )

            supervision_prompts.append(
                {"key": rule.key, "priority": rule.priority, "prompt": rule.supervision_prompt}
            )
            manager_actions.append(
                {"key": rule.key, "priority": rule.priority, "action": rule.manager_action}
            )
            practice_risks.append(
                {"key": rule.key, "priority": rule.priority, "risk": rule.reason}
            )
            evidence_opportunities.append(
                {
                    "key": rule.key,
                    "priority": rule.priority,
                    "opportunity": "Use recent OS records, supervision reflection or manager observation as Academy evidence where appropriate.",
                }
            )

            for module in matched_modules[:2]:
                for workbook in academy_db.list_workbooks(module_id=int(module["id"]), active=True)[:2]:
                    recommended_workbooks.append(
                        {
                            "workbook_id": workbook.get("id"),
                            "title": workbook.get("title"),
                            "code": workbook.get("code"),
                            "priority": rule.priority,
                            "reason": rule.reason,
                            "link": f"/academy/workbook-detail.html?workbook_id={workbook.get('id')}",
                        }
                    )

        return {
            "modules": self._dedupe_by_id(recommended_modules, "module_id"),
            "workbooks": self._dedupe_by_id(recommended_workbooks, "workbook_id"),
            "supervision_prompts": self._dedupe_by_key(supervision_prompts, "key"),
            "practice_risks": self._dedupe_by_key(practice_risks, "key"),
            "evidence_opportunities": self._dedupe_by_key(evidence_opportunities, "key"),
            "manager_actions": self._dedupe_by_key(manager_actions, "key"),
        }

    def _count_recent_incidents(self, *, user_id: int, home_id: int | None) -> int:
        since = date.today() - timedelta(days=self.INCIDENT_WINDOW_DAYS)
        queries = [
            (
                """
                SELECT COUNT(*) AS count
                FROM incidents
                WHERE incident_datetime::date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (
                    created_by_user_id = %s
                    OR staff_user_id = %s
                    OR lead_staff_user_id = %s
                  )
                """,
                (since, home_id, home_id, user_id, user_id, user_id),
            ),
            (
                """
                SELECT COUNT(*) AS count
                FROM young_person_incidents
                WHERE incident_datetime::date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (
                    created_by_user_id = %s
                    OR staff_user_id = %s
                    OR lead_staff_user_id = %s
                  )
                """,
                (since, home_id, home_id, user_id, user_id, user_id),
            ),
        ]
        return self._first_count_that_works(queries)

    def _count_recent_supervisions(self, *, user_id: int) -> int:
        since = date.today() - timedelta(days=self.SUPERVISION_WINDOW_DAYS)
        queries = [
            (
                """
                SELECT COUNT(*) AS count
                FROM supervision_notes
                WHERE supervision_date >= %s
                  AND (staff_user_id = %s OR supervisee_user_id = %s OR user_id = %s)
                """,
                (since, user_id, user_id, user_id),
            ),
            (
                """
                SELECT COUNT(*) AS count
                FROM supervisions
                WHERE supervision_date >= %s
                  AND (staff_user_id = %s OR supervisee_user_id = %s OR user_id = %s)
                """,
                (since, user_id, user_id, user_id),
            ),
        ]
        return self._first_count_that_works(queries)

    def _count_recent_daily_notes(self, *, user_id: int, home_id: int | None) -> int:
        since = date.today() - timedelta(days=self.DAILY_NOTE_WINDOW_DAYS)
        queries = [
            (
                """
                SELECT COUNT(*) AS count
                FROM daily_notes
                WHERE note_date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (created_by_user_id = %s OR staff_user_id = %s)
                """,
                (since, home_id, home_id, user_id, user_id),
            ),
            (
                """
                SELECT COUNT(*) AS count
                FROM young_person_daily_notes
                WHERE note_date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (created_by_user_id = %s OR staff_user_id = %s)
                """,
                (since, home_id, home_id, user_id, user_id),
            ),
        ]
        return self._first_count_that_works(queries)

    def _count_daily_note_quality_warnings(self, *, user_id: int, home_id: int | None) -> int:
        since = date.today() - timedelta(days=self.DAILY_NOTE_WINDOW_DAYS)
        queries = [
            (
                """
                SELECT COUNT(*) AS count
                FROM daily_notes
                WHERE note_date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (created_by_user_id = %s OR staff_user_id = %s)
                  AND (
                    COALESCE(young_person_voice, '') = ''
                    OR COALESCE(actions_required, '') = ''
                    OR length(COALESCE(presentation, '')) < 30
                  )
                """,
                (since, home_id, home_id, user_id, user_id),
            ),
            (
                """
                SELECT COUNT(*) AS count
                FROM young_person_daily_notes
                WHERE note_date >= %s
                  AND (%s IS NULL OR home_id = %s)
                  AND (created_by_user_id = %s OR staff_user_id = %s)
                  AND (
                    COALESCE(young_person_voice, '') = ''
                    OR COALESCE(actions_required, '') = ''
                    OR length(COALESCE(presentation, '')) < 30
                  )
                """,
                (since, home_id, home_id, user_id, user_id),
            ),
        ]
        return self._first_count_that_works(queries)

    def _first_count_that_works(self, queries: list[tuple[str, tuple[Any, ...]]]) -> int:
        for query, params in queries:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, params)
                        row = cur.fetchone()
                return int((dict(row) if row else {}).get("count") or 0)
            except Exception:
                continue
        return 0

    def _staff_for_home(self, home_id: int) -> list[dict[str, Any]]:
        queries = [
            (
                """
                SELECT id, first_name, last_name, email, role, home_id
                FROM users
                WHERE home_id = %s
                  AND COALESCE(is_active, TRUE) = TRUE
                ORDER BY first_name ASC, last_name ASC
                """,
                (home_id,),
            ),
            (
                """
                SELECT id, first_name, last_name, email, role, primary_home_id AS home_id
                FROM users
                WHERE primary_home_id = %s
                  AND COALESCE(is_active, TRUE) = TRUE
                ORDER BY first_name ASC, last_name ASC
                """,
                (home_id,),
            ),
        ]
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

    def _home_id_for_user(self, user_id: int) -> int | None:
        queries = [
            "SELECT home_id FROM users WHERE id = %s LIMIT 1",
            "SELECT primary_home_id AS home_id FROM users WHERE id = %s LIMIT 1",
        ]
        for query in queries:
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, (user_id,))
                        row = cur.fetchone()
                value = (dict(row) if row else {}).get("home_id")
                return int(value) if value else None
            except Exception:
                continue
        return None

    def _match_modules(self, modules: list[dict[str, Any]], keywords: tuple[str, ...]) -> list[dict[str, Any]]:
        scored: list[tuple[int, dict[str, Any]]] = []
        for module in modules:
            haystack = " ".join(
                str(module.get(field) or "")
                for field in ("title", "summary", "description", "module_family", "category_name", "code")
            ).lower()
            score = sum(1 for keyword in keywords if keyword.lower() in haystack)
            if score:
                scored.append((score, module))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [module for _, module in scored]

    def _priority_score(
        self,
        learning_needs: list[dict[str, Any]],
        modules: list[dict[str, Any]],
        workbooks: list[dict[str, Any]],
        signals: dict[str, Any],
    ) -> int:
        score = 20
        score += 15 * sum(1 for need in learning_needs if need.get("priority") == "high")
        score += 8 * sum(1 for need in learning_needs if need.get("priority") == "medium")
        score += 5 * sum(1 for row in modules if row.get("is_overdue"))
        score += 4 * sum(1 for row in workbooks if row.get("status") == "needs_amendment")
        score += min(20, int(signals.get("recent_incidents") or 0) * 4)
        return max(0, min(score, 100))

    def _home_learning_themes(self, staff_payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counts: dict[str, int] = {}
        for payload in staff_payloads:
            for need in payload.get("learning_needs", []):
                title = str(need.get("title") or need.get("key") or "Learning need")
                counts[title] = counts.get(title, 0) + 1
        return [
            {"title": title, "staff_count": count}
            for title, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)
        ]

    def _need_from_rule(self, key: str, signal_count: int) -> dict[str, Any]:
        rule = self._rule_by_key(key)
        if not rule:
            return {"key": key, "title": key, "priority": "low", "signal_count": signal_count}
        return {
            "key": rule.key,
            "title": rule.title,
            "reason": rule.reason,
            "priority": rule.priority,
            "signal_count": signal_count,
        }

    def _rule_by_key(self, key: str) -> RecommendationRule | None:
        return next((rule for rule in self.RULES if rule.key == key), None)

    def _dedupe_needs(self, needs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self._dedupe_by_key(needs, "key")

    def _dedupe_by_key(self, rows: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
        seen: set[str] = set()
        output: list[dict[str, Any]] = []
        for row in rows:
            value = str(row.get(key) or "")
            if not value or value in seen:
                continue
            seen.add(value)
            output.append(row)
        return output

    def _dedupe_by_id(self, rows: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
        seen: set[int] = set()
        output: list[dict[str, Any]] = []
        for row in rows:
            value = row.get(key)
            if not value:
                continue
            parsed = int(value)
            if parsed in seen:
                continue
            seen.add(parsed)
            output.append(row)
        return output

    def _current_user_id(self, current_user: dict[str, Any]) -> int:
        return int(current_user.get("id") or current_user.get("user_id"))

    def _current_user_role(self, current_user: dict[str, Any]) -> str:
        return str(current_user.get("role") or current_user.get("user_role") or "").strip().lower()

    def _current_user_home_id(self, current_user: dict[str, Any]) -> int | None:
        value = current_user.get("home_id") or current_user.get("primary_home_id")
        return int(value) if value else None

    def _ensure_can_view_user(self, *, user_id: int, current_user: dict[str, Any]) -> None:
        if user_id == self._current_user_id(current_user):
            return
        self._ensure_manager(current_user)

    def _ensure_manager(self, current_user: dict[str, Any]) -> None:
        role = self._current_user_role(current_user)
        if role not in {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
            "auditor",
        }:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view Academy intelligence.",
            )
