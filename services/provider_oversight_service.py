from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import HTTPException

from core.policy_engine import context_from_user, policy_engine


class ProviderOversightService:
    """Provider-scoped operational aggregation without cross-provider record exposure."""

    def build_overview(self, *, current_user: dict[str, Any], records: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        context = context_from_user(current_user)
        if context.tenancy_scope not in {"provider", "platform"} and not context.provider_oversight_access:
            raise HTTPException(status_code=403, detail="Provider oversight access is required.")
        rows = self._visible_records(context, records or [])
        queues = self._queues(rows)
        return {
            "ok": True,
            "provider_id": context.provider_id,
            "home_ids": list(context.home_ids),
            "tenancy_scope": context.tenancy_scope,
            "summary": {
                "records": len(rows),
                "homes_in_scope": len({row.get("home_id") for row in rows if row.get("home_id")}) or len(context.home_ids),
                "unresolved_operational_states": len(queues["unresolved_operational_states"]),
                "safeguarding_escalations": len(queues["safeguarding_escalation_queues"]),
                "inspection_gaps": len(queues["inspection_gaps"]),
                "unsigned_governance_actions": len(queues["unsigned_governance_actions"]),
            },
            "queues": queues,
        }

    def category(self, *, current_user: dict[str, Any], category: str, records: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        overview = self.build_overview(current_user=current_user, records=records)
        queues = overview["queues"]
        return {
            "ok": True,
            "provider_id": overview["provider_id"],
            "category": category,
            "items": queues.get(category, []),
            "count": len(queues.get(category, [])),
        }

    def _visible_records(self, context, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        visible: list[dict[str, Any]] = []
        for row in records:
            provider_id = row.get("provider_id")
            home_id = row.get("home_id")
            if context.tenancy_scope == "platform":
                visible.append(row)
            elif provider_id is not None and int(provider_id) == context.provider_id:
                visible.append(row)
            elif home_id is not None and int(home_id) in context.home_ids:
                visible.append(row)
        return visible

    def _queues(self, records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        queues = {
            "safeguarding_escalation_queues": [],
            "unresolved_operational_states": [],
            "stale_evidence": [],
            "overdue_reviews": [],
            "missing_chronology": [],
            "unsigned_governance_actions": [],
            "inspection_gaps": [],
            "staff_compliance_gaps": [],
            "unresolved_signoffs": [],
        }
        for row in records:
            status = str(row.get("status") or row.get("lifecycle_status") or "").lower()
            entity_type = str(row.get("entity_type") or row.get("record_type") or "").lower()
            if entity_type == "safeguarding" or row.get("safeguarding"):
                queues["safeguarding_escalation_queues"].append(row)
            if status not in {"resolved", "closed", "completed", "approved", "signed_off"}:
                queues["unresolved_operational_states"].append(row)
            if row.get("stale_evidence"):
                queues["stale_evidence"].append(row)
            if row.get("overdue") or status == "overdue":
                queues["overdue_reviews"].append(row)
            if not row.get("chronology_ids") and row.get("requires_chronology"):
                queues["missing_chronology"].append(row)
            if row.get("governance_required") and not row.get("signed_off_at"):
                queues["unsigned_governance_actions"].append(row)
            if row.get("inspection_gap") or row.get("evidence_gap"):
                queues["inspection_gaps"].append(row)
            if entity_type == "staff" and (row.get("compliance_gap") or status == "overdue"):
                queues["staff_compliance_gaps"].append(row)
            if row.get("signoff_required") and not row.get("signed_off_at"):
                queues["unresolved_signoffs"].append(row)
        return queues

    def overview(
        self,
        *,
        current_user: dict[str, Any],
        homes: list[dict[str, Any]],
        action_plans: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        context = context_from_user(current_user)
        if not (context.provider_oversight_access or policy_engine.has_permission(current_user, "governance:review")):
            raise PermissionError("Provider oversight is manager-only")
        visible_homes = [home for home in homes if self._home_visible(context, home)]
        actions = [action for action in action_plans or [] if self._action_visible(action, visible_homes)]
        status_counts = Counter(str(action.get("status") or "open") for action in actions)
        return {
            "provider_id": context.provider_id,
            "home_count": len(visible_homes),
            "homes": [
                {
                    "home_id": home.get("id") or home.get("home_id"),
                    "name": home.get("name"),
                    "inspection_readiness": home.get("inspection_readiness") or "not_sampled",
                    "safeguarding_escalations": int(home.get("safeguarding_escalations") or 0),
                    "training_overdue": int(home.get("training_overdue") or 0),
                }
                for home in visible_homes
            ],
            "action_plan_tracking": dict(status_counts),
            "guardrail": "Provider oversight uses canonical provider/home scope.",
        }

    def _home_visible(self, context, home: dict[str, Any]) -> bool:
        provider_id = home.get("provider_id") or home.get("providerId")
        home_id = home.get("id") or home.get("home_id")
        if context.tenancy_scope == "platform":
            return True
        if context.provider_oversight_access and provider_id is not None:
            return int(provider_id) == context.provider_id
        return int(home_id) in context.home_ids if home_id is not None else False

    def _action_visible(self, action: dict[str, Any], visible_homes: list[dict[str, Any]]) -> bool:
        home_ids = {str(home.get("id") or home.get("home_id")) for home in visible_homes}
        return str(action.get("home_id") or action.get("homeId")) in home_ids

    def permissions(self, current_user: dict[str, Any]) -> dict[str, bool]:
        return {
            permission: policy_engine.has_permission(current_user, permission)
            for permission in ("provider:oversight", "governance:review", "inspection:review", "safeguarding:review")
        }

    def risk_summary(self, *, current_user: dict[str, Any], records: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        overview = self.build_overview(current_user=current_user, records=records)
        levels = Counter(str(row.get("risk") or row.get("severity") or "unknown").lower() for row in self._all_items(overview["queues"]))
        return {"ok": True, "provider_id": overview["provider_id"], "risk": dict(levels)}

    def _all_items(self, queues: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
        seen: set[int] = set()
        rows: list[dict[str, Any]] = []
        for items in queues.values():
            for row in items:
                marker = id(row)
                if marker not in seen:
                    seen.add(marker)
                    rows.append(row)
        return rows


provider_oversight_service = ProviderOversightService()
