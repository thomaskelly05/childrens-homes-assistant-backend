from __future__ import annotations

from typing import Any

from services.provider_intelligence_service import ProviderIntelligenceService


class ProviderCommandCentreService:
    """Multi-home provider command centre with async aggregation and heatmaps."""

    def __init__(self, provider: ProviderIntelligenceService | None = None) -> None:
        self._provider = provider or ProviderIntelligenceService()

    def build(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        limit: int = 30,
        max_workers: int = 4,
    ) -> dict[str, Any]:
        convergence = self._provider.build_operational_convergence(
            conn,
            current_user=current_user,
            limit=limit,
            max_workers=max_workers,
        )
        homes = convergence.get("home_comparison") or []
        heatmap = self._operational_heatmap(homes)
        return {
            "ok": True,
            **convergence,
            "provider_operational_heatmap": heatmap,
            "home_comparison_scoring": sorted(
                [
                    {
                        "home_id": home.get("home_id"),
                        "home_name": home.get("home_name"),
                        "score": self._home_score(home),
                        "safeguarding_pressure": home.get("safeguarding_pressure"),
                        "emotional_climate": home.get("emotional_climate"),
                        "workforce_pressure": home.get("workforce_pressure"),
                        "inspection_readiness": home.get("inspection_readiness"),
                    }
                    for home in homes
                ],
                key=lambda item: item["score"],
                reverse=True,
            ),
            "command_centre_summary": (
                f"Provider command centre across {len(homes)} home(s) — "
                f"escalation score {convergence.get('operational_escalation_score')}."
            ),
        }

    def _home_score(self, home: dict[str, Any]) -> int:
        safeguarding = int((home.get("safeguarding_pressure") or {}).get("pressure_score") or 0)
        workforce = int((home.get("workforce_pressure") or {}).get("queue_items") or 0)
        inspection_penalty = 15 if home.get("inspection_readiness") == "requires_immediate_attention" else 0
        emotional_penalty = 10 if (home.get("emotional_climate") or {}).get("state") == "unsettled" else 0
        return min(100, safeguarding + min(workforce, 25) + inspection_penalty + emotional_penalty)

    def _operational_heatmap(self, homes: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "dimensions": ["safeguarding", "emotional_climate", "workforce", "inspection"],
            "homes": [
                {
                    "home_id": home.get("home_id"),
                    "home_name": home.get("home_name"),
                    "cells": {
                        "safeguarding": (home.get("safeguarding_pressure") or {}).get("state"),
                        "emotional_climate": (home.get("emotional_climate") or {}).get("state"),
                        "workforce": (home.get("workforce_pressure") or {}).get("state"),
                        "inspection": home.get("inspection_readiness"),
                    },
                }
                for home in homes
            ],
        }


provider_command_centre_service = ProviderCommandCentreService()
