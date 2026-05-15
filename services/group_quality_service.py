from __future__ import annotations

from collections import Counter
from typing import Any

from services.provider_oversight_service import provider_oversight_service


class GroupQualityService:
    """Cross-home QA aggregation for managers without exposing frontline noise."""

    def quality_summary(
        self,
        *,
        current_user: dict[str, Any],
        homes: list[dict[str, Any]],
        qa_samples: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        oversight = provider_oversight_service.overview(current_user=current_user, homes=homes)
        visible_home_ids = {str(home["home_id"]) for home in oversight["homes"]}
        samples = [sample for sample in qa_samples or [] if str(sample.get("home_id") or sample.get("homeId")) in visible_home_ids]
        themes = Counter(str(theme) for sample in samples for theme in sample.get("themes", []) if theme)
        overdue = [sample for sample in samples if sample.get("status") in {"overdue", "review_required"}]
        return {
            "home_count": oversight["home_count"],
            "sample_count": len(samples),
            "cross_home_qa": {
                "recurring_themes": [{"theme": theme, "count": count} for theme, count in themes.most_common(8)],
                "overdue_reviews": len(overdue),
                "training_oversight": sum(int(home.get("training_overdue") or 0) for home in oversight["homes"]),
            },
            "inspection_readiness_comparison": [
                {"home_id": home["home_id"], "status": home["inspection_readiness"]}
                for home in oversight["homes"]
            ],
            "guardrail": "Group quality summaries are manager-only sampling aids, not frontline dashboards or inspection grades.",
        }


group_quality_service = GroupQualityService()
