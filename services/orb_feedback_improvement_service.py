from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any
from uuid import uuid4

from schemas.orb_feedback import ORB_FEEDBACK_SCENARIO_LOOP_REASONS, OrbImprovementCandidate

REASON_GAP_LABELS: dict[str, str] = {
    "missed_safeguarding": "missed_safeguarding_marker",
    "missed_child_voice": "missed_child_voice_lens",
    "missed_ofsted_reg44": "missed_reg44_reg45_lens",
    "missed_manager_oversight": "missed_manager_oversight",
    "missed_risk": "missed_risk_assessment",
    "missed_recording": "missed_recording_quality",
    "missed_nvq_learning": "missed_nvq_learning_lens",
    "incorrect_source": "source_anchor_issue",
    "unsafe": "unsafe_wording",
    "too_generic": "answer_too_generic",
    "wrong_role": "wrong_role_lens",
    "not_practical": "not_practical_guidance",
}


REASON_TO_CANDIDATE_TYPE: dict[str, str] = {
    "missed_safeguarding": "expected_marker",
    "missed_child_voice": "role_lens_issue",
    "missed_manager_oversight": "role_lens_issue",
    "missed_ofsted_reg44": "expected_marker",
    "missed_nvq_learning": "role_lens_issue",
    "incorrect_source": "source_anchor",
    "unsafe": "must_not_say",
    "missed_risk": "expected_marker",
    "missed_recording": "expected_marker",
}


class OrbFeedbackImprovementService:
    def summarise_feedback(self, feedback_batch: list[dict[str, Any]], *, days: int = 7) -> dict[str, Any]:
        down = [row for row in feedback_batch if row.get("rating") == "down"]
        up = [row for row in feedback_batch if row.get("rating") == "up"]
        return {
            "days": days,
            "total": len(feedback_batch),
            "thumbs_up": len(up),
            "thumbs_down": len(down),
            "by_reason": self.group_feedback_by_reason(feedback_batch),
            "by_family": self.group_feedback_by_scenario_family(feedback_batch),
            "by_action": self.group_feedback_by_action(feedback_batch),
            "by_role": self.group_feedback_by_role(feedback_batch),
            "recurring_gaps": self.identify_recurring_gaps(feedback_batch),
            "scenario_marker_suggestions": self.suggest_scenario_marker_updates(feedback_batch),
            "source_review_items": self.suggest_source_review_items(feedback_batch),
            "prompt_improvement_items": self.suggest_prompt_improvement_items(feedback_batch),
        }

    def group_feedback_by_reason(self, feedback_batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter()
        for row in feedback_batch:
            if row.get("rating") != "down":
                continue
            reason = str(row.get("reason") or "other")
            counter[reason] += 1
        return [{"reason": k, "count": v} for k, v in counter.most_common()]

    def group_feedback_by_scenario_family(self, feedback_batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter()
        for row in feedback_batch:
            if row.get("rating") != "down":
                continue
            family = str(row.get("detected_family") or "").strip()
            if family:
                counter[family] += 1
        return [{"family": k, "count": v} for k, v in counter.most_common()]

    def group_feedback_by_action(self, feedback_batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter()
        for row in feedback_batch:
            if row.get("rating") != "down":
                continue
            action = str(row.get("action_id") or "").strip()
            if action:
                counter[action] += 1
        return [{"action_id": k, "count": v} for k, v in counter.most_common()]

    def group_feedback_by_role(self, feedback_batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter()
        for row in feedback_batch:
            role = str(row.get("profile_role") or "unspecified").strip() or "unspecified"
            if row.get("rating") == "down":
                counter[role] += 1
        return [{"profile_role": k, "count": v} for k, v in counter.most_common()]

    def identify_recurring_gaps(self, feedback_batch: list[dict[str, Any]], *, min_count: int = 3) -> list[dict[str, Any]]:
        grouped: dict[str, dict[str, Any]] = {}
        for row in feedback_batch:
            if row.get("rating") != "down":
                continue
            reason = str(row.get("reason") or "other")
            gap = REASON_GAP_LABELS.get(reason, reason)
            entry = grouped.setdefault(
                gap,
                {"gap": gap, "count": 0, "affected_families": set(), "reasons": Counter()},
            )
            entry["count"] += 1
            entry["reasons"][reason] += 1
            family = str(row.get("detected_family") or "").strip()
            if family:
                entry["affected_families"].add(family)

        results = []
        for gap, entry in grouped.items():
            if entry["count"] < min_count:
                continue
            families = sorted(entry["affected_families"])
            top_reason = entry["reasons"].most_common(1)[0][0] if entry["reasons"] else "other"
            results.append(
                {
                    "gap": gap,
                    "count": entry["count"],
                    "affected_families": families,
                    "suggested_action": self._suggested_action_for_gap(gap, top_reason, families),
                }
            )
        results.sort(key=lambda item: item["count"], reverse=True)
        return results

    def _suggested_action_for_gap(self, gap: str, reason: str, families: list[str]) -> str:
        family_hint = families[0] if families else "relevant scenario families"
        if "safeguarding" in gap or reason == "missed_safeguarding":
            return f"Review safeguarding markers for {family_hint}"
        if "source" in gap:
            return "Review source anchor registry and citation rules for affected topics"
        if "child_voice" in gap:
            return "Strengthen child voice lens in scenario packets"
        if "role" in gap or reason == "wrong_role":
            return "Review role-lens routing for profile roles with repeated downvotes"
        return f"Review expert scenario bank for {family_hint}"

    def suggest_scenario_marker_updates(self, feedback_batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        suggestions = []
        for gap in self.identify_recurring_gaps(feedback_batch, min_count=2):
            if any(
                marker in gap["gap"]
                for marker in ("marker", "safeguarding", "recording", "reg44", "risk")
            ):
                suggestions.append(
                    {
                        "type": "scenario_marker",
                        "gap": gap["gap"],
                        "families": gap["affected_families"],
                        "note": gap["suggested_action"],
                        "review_required": True,
                    }
                )
        return suggestions

    def suggest_source_review_items(self, feedback_batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        anchor_counter: Counter[str] = Counter()
        for row in feedback_batch:
            if row.get("rating") != "down" or row.get("reason") != "incorrect_source":
                continue
            for anchor in row.get("source_anchors") or []:
                anchor_counter[str(anchor)] += 1
        for anchor, count in anchor_counter.most_common(10):
            items.append({"source_anchor": anchor, "downvote_count": count, "review_required": True})
        return items

    def suggest_prompt_improvement_items(self, feedback_batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        tier_counter: Counter[str] = Counter()
        reason_counter: Counter[str] = Counter()
        for row in feedback_batch:
            if row.get("rating") != "down":
                continue
            tier = str(row.get("prompt_tier") or "unknown")
            tier_counter[tier] += 1
            reason_counter[str(row.get("reason") or "other")] += 1
        items = []
        for reason, count in reason_counter.most_common(5):
            if reason in {"too_generic", "too_long", "too_short", "wrong_tone", "not_practical"}:
                items.append(
                    {
                        "focus": reason,
                        "count": count,
                        "note": "Review prompt tier instructions and answer style — no automatic prompt edits",
                        "review_required": True,
                    }
                )
        for tier, count in tier_counter.most_common(3):
            items.append(
                {
                    "prompt_tier": tier,
                    "downvote_count": count,
                    "review_required": True,
                }
            )
        return items

    def generate_improvement_candidates(
        self, feedback_batch: list[dict[str, Any]]
    ) -> list[OrbImprovementCandidate]:
        candidates: list[OrbImprovementCandidate] = []
        grouped: dict[tuple[str, str | None], list[dict[str, Any]]] = defaultdict(list)

        for row in feedback_batch:
            if row.get("rating") != "down":
                continue
            reason = str(row.get("reason") or "")
            if reason not in ORB_FEEDBACK_SCENARIO_LOOP_REASONS:
                continue
            family = str(row.get("detected_family") or "").strip() or None
            grouped[(reason, family)].append(row)

        for (reason, family), rows in grouped.items():
            candidate_type = REASON_TO_CANDIDATE_TYPE.get(reason, "scenario_variant")
            proposed = self._proposed_change_for_reason(reason, rows[0], family)
            candidates.append(
                OrbImprovementCandidate(
                    candidate_id=str(uuid4()),
                    candidate_type=candidate_type,
                    source_feedback_ids=[row["id"] for row in rows if row.get("id") is not None],
                    proposed_change=proposed,
                    affected_family=family,
                    affected_action=rows[0].get("action_id"),
                    review_required=True,
                )
            )
        return candidates

    def _proposed_change_for_reason(
        self, reason: str, sample: dict[str, Any], family: str | None
    ) -> dict[str, Any]:
        comment = str(sample.get("comment") or "").strip()[:500]
        base = {
            "summary": f"Review-required improvement from feedback reason: {reason}",
            "evidence_comment": comment or None,
            "review_required": True,
            "auto_apply": False,
        }
        if reason == "missed_safeguarding":
            return {**base, "expected_marker": "safeguarding_escalation_check", "family": family}
        if reason == "missed_child_voice":
            return {**base, "role_lens": "child_voice", "family": family}
        if reason == "missed_manager_oversight":
            return {**base, "role_lens": "manager_oversight", "family": family}
        if reason == "missed_ofsted_reg44":
            return {**base, "expected_marker": "reg44_reg45_oversight", "family": family}
        if reason == "missed_nvq_learning":
            return {**base, "role_lens": "nvq_learning", "family": family}
        if reason == "incorrect_source":
            anchors = sample.get("source_anchors") or []
            return {**base, "source_anchor": anchors[0] if anchors else None, "family": family}
        return {**base, "scenario_variant_note": comment, "family": family}

    def build_admin_summary(self, feedback_batch: list[dict[str, Any]], *, days: int = 30) -> dict[str, Any]:
        down = sum(1 for r in feedback_batch if r.get("rating") == "down")
        up = sum(1 for r in feedback_batch if r.get("rating") == "up")
        total = len(feedback_batch)
        ratio = round(up / total, 3) if total else 0.0
        recurring = self.identify_recurring_gaps(feedback_batch)
        source_issues = self.suggest_source_review_items(feedback_batch)
        candidates = self.generate_improvement_candidates(feedback_batch)
        return {
            "total_feedback": total,
            "thumbs_up": up,
            "thumbs_down": down,
            "thumbs_up_ratio": ratio,
            "top_reasons": self.group_feedback_by_reason(feedback_batch),
            "top_scenario_families": self.group_feedback_by_scenario_family(feedback_batch),
            "top_actions_with_downvotes": self.group_feedback_by_action(feedback_batch),
            "recurring_gaps": recurring,
            "source_issues": source_issues,
            "suggested_improvement_candidates": [c.model_dump() for c in candidates],
            "days": days,
        }


orb_feedback_improvement_service = OrbFeedbackImprovementService()
