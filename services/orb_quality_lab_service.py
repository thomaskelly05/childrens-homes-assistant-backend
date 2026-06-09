"""ORB Quality Lab — gold scenario listing and evaluation for founder review."""

from __future__ import annotations

import uuid
from typing import Any

from schemas.orb_quality_lab import (
    OrbQualityLabEvaluateResponse,
    OrbQualityLabOverview,
    OrbQualityLabRunItemResult,
    OrbQualityLabRunResponse,
    OrbQualityLabScenarioSummary,
)
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_expert_scenario_evaluator_service import orb_expert_scenario_evaluator_service


def _sample_answer(scenario: dict[str, Any]) -> str:
    markers = scenario.get("expected_markers") or []
    lines = [
        "Based only on what you have provided — I have not checked live IndiCare OS records.",
        "",
        f"## Response to: {scenario.get('title')}",
        "",
        "Key considerations:",
    ]
    for marker in markers:
        lines.append(f"- {str(marker).capitalize()}")
    lines.extend(
        [
            "",
            "Child voice: capture the young person's words where known; do not invent quotes.",
            "Manager oversight: notify and review within your local protocol.",
            "Recording: factual, dated, proportionate detail with chronology significance.",
        ]
    )
    if str(scenario.get("role", "")).startswith("nvq"):
        lines.append("Authenticity: describe only what you personally did; do not overclaim leadership.")
    return "\n".join(lines)


def _scenario_summary(scenario: dict[str, Any]) -> OrbQualityLabScenarioSummary:
    return OrbQualityLabScenarioSummary(
        scenario_id=str(scenario.get("scenario_id") or ""),
        title=str(scenario.get("title") or ""),
        family=str(scenario.get("family") or ""),
        role=str(scenario.get("role") or ""),
        risk_level=str(scenario.get("risk_level") or ""),
        expected_marker_count=len(scenario.get("expected_markers") or []),
    )


def _filter_scenarios(
    *,
    family: str | None = None,
    role: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    scenarios = orb_expert_scenario_bank_service.list_gold_scenarios()
    if family:
        scenarios = [s for s in scenarios if s.get("family") == family]
    if role:
        scenarios = [s for s in scenarios if s.get("role") == role]
    if limit:
        scenarios = scenarios[:limit]
    return scenarios


class OrbQualityLabService:
    def build_overview(self) -> OrbQualityLabOverview:
        families = orb_expert_scenario_bank_service.list_families()
        validation_errors = orb_expert_scenario_bank_service.validate_gold_scenarios()
        return OrbQualityLabOverview(
            gold_scenario_count=orb_expert_scenario_bank_service.gold_count(),
            family_count=len(families),
            validation_errors=validation_errors,
            families=[{"id": f["id"], "label": f["label"]} for f in families],
        )

    def list_scenarios(
        self,
        *,
        family: str | None = None,
        role: str | None = None,
        limit: int = 100,
    ) -> list[OrbQualityLabScenarioSummary]:
        scenarios = _filter_scenarios(family=family, role=role, limit=limit)
        return [_scenario_summary(s) for s in scenarios]

    def run_gold_pack(
        self,
        *,
        title: str | None = None,
        family: str | None = None,
        role: str | None = None,
        limit: int = 20,
        use_sample_answers: bool = True,
    ) -> OrbQualityLabRunResponse:
        scenarios = _filter_scenarios(family=family, role=role, limit=limit)
        results: list[OrbQualityLabRunItemResult] = []
        passed = 0

        for scenario in scenarios:
            answer = _sample_answer(scenario) if use_sample_answers else ""
            evaluation = orb_expert_scenario_evaluator_service.evaluate(
                scenario=scenario,
                answer=answer,
                role=scenario.get("role"),
            )
            if evaluation.passed:
                passed += 1
            excerpt = answer[:280] + ("…" if len(answer) > 280 else "")
            results.append(
                OrbQualityLabRunItemResult(
                    scenario_id=str(scenario.get("scenario_id") or ""),
                    title=str(scenario.get("title") or ""),
                    family=str(scenario.get("family") or ""),
                    role=str(scenario.get("role") or ""),
                    risk_level=str(scenario.get("risk_level") or ""),
                    passed=evaluation.passed,
                    score=evaluation.score,
                    missing_markers=list(evaluation.missing_required_markers),
                    unsafe_phrases=list(evaluation.unsafe_phrases_found),
                    overclaims=list(evaluation.overclaiming_found),
                    notes=list(evaluation.notes),
                    answer_source="sample-template" if use_sample_answers else "manual-paste",
                    answer_excerpt=excerpt,
                )
            )

        total = len(scenarios)
        pass_rate = round((passed / total) * 100, 1) if total else 0.0
        run_title = title or f"Gold pack ({total} scenarios)"
        if family:
            run_title = f"{run_title} — {family}"

        limitations = [
            "V1 uses sample-template answers only — live ORB route evaluation is not wired in this pass.",
            "Run results are returned to the founder UI; persistence and audit trail come in a later pass.",
        ]

        return OrbQualityLabRunResponse(
            run_id=f"run-{uuid.uuid4().hex[:12]}",
            title=run_title,
            scenario_count=total,
            passed=passed,
            failed=total - passed,
            pass_rate=pass_rate,
            route_call_skipped=True,
            validation_errors=orb_expert_scenario_bank_service.validate_gold_scenarios(),
            results=results,
            limitations=limitations,
        )

    def evaluate_answer(self, *, scenario_id: str, answer: str) -> OrbQualityLabEvaluateResponse:
        scenario = orb_expert_scenario_bank_service.get_gold_scenario(scenario_id)
        if not scenario:
            raise ValueError(f"Unknown scenario: {scenario_id}")
        evaluation = orb_expert_scenario_evaluator_service.evaluate(
            scenario=scenario,
            answer=answer,
            role=scenario.get("role"),
        )
        evaluation.scenario_id = scenario_id
        return OrbQualityLabEvaluateResponse(
            scenario_id=scenario_id,
            title=str(scenario.get("title") or ""),
            family=str(scenario.get("family") or ""),
            role=str(scenario.get("role") or ""),
            risk_level=str(scenario.get("risk_level") or ""),
            evaluation=evaluation,
        )


orb_quality_lab_service = OrbQualityLabService()
