"""ORB Quality Lab — gold scenario listing and evaluation for founder review."""

from __future__ import annotations

import asyncio
import concurrent.futures
import uuid
from collections.abc import Coroutine
from typing import Any, TypeVar

_T = TypeVar("_T")


def _run_coro_sync(coro: Coroutine[Any, Any, _T]) -> _T:
    """Run async ORB brain calls from sync quality-lab service code."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        return executor.submit(asyncio.run, coro).result()

from schemas.orb_quality_lab import (
    OrbQualityLabEvaluateResponse,
    OrbQualityLabHumanReview,
    OrbQualityLabOverview,
    OrbQualityLabRunItemResult,
    OrbQualityLabRunResponse,
    OrbQualityLabScenarioSummary,
    OrbQualityLabScoringBreakdown,
    QualityRunMode,
)
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_expert_scenario_evaluator_service import orb_expert_scenario_evaluator_service
from services.orb_quality_lab_live_runner_service import (
    live_llm_available,
    orb_quality_lab_live_runner_service,
)
from services.orb_quality_lab_scenario_coverage_service import (
    orb_quality_lab_scenario_coverage_service,
)
from services.orb_quality_lab_scoring_service import (
    build_scoring_breakdown,
    detect_critical_failure,
    requires_human_review,
)


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
    scenario_ids: list[str] | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    scenarios = orb_expert_scenario_bank_service.list_gold_scenarios()
    if scenario_ids:
        wanted = {str(sid) for sid in scenario_ids}
        scenarios = [s for s in scenarios if str(s.get("scenario_id") or "") in wanted]
    if family:
        scenarios = [s for s in scenarios if s.get("family") == family]
    if role:
        scenarios = [s for s in scenarios if s.get("role") == role]
    if limit:
        scenarios = scenarios[:limit]
    return scenarios


def _answer_source_for_mode(run_mode: QualityRunMode) -> str:
    return "sample-template" if run_mode == "template" else "live-llm"


class OrbQualityLabService:
    def build_overview(self) -> OrbQualityLabOverview:
        families = orb_expert_scenario_bank_service.list_families()
        validation_errors = orb_expert_scenario_bank_service.validate_gold_scenarios()
        coverage = orb_quality_lab_scenario_coverage_service.audit_gold_coverage()
        return OrbQualityLabOverview(
            gold_scenario_count=orb_expert_scenario_bank_service.gold_count(),
            family_count=len(families),
            validation_errors=validation_errors,
            families=[{"id": f["id"], "label": f["label"]} for f in families],
            live_llm_available=live_llm_available(),
            default_run_mode="live-llm",
            coverage=coverage,
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
        scenario_ids: list[str] | None = None,
        use_sample_answers: bool | None = None,
        run_mode: QualityRunMode = "live-llm",
    ) -> OrbQualityLabRunResponse:
        if use_sample_answers is True:
            run_mode = "template"
        elif use_sample_answers is False:
            run_mode = "live-llm"

        scenarios = _filter_scenarios(
            family=family,
            role=role,
            scenario_ids=scenario_ids,
            limit=limit,
        )
        results: list[OrbQualityLabRunItemResult] = []
        passed = 0
        critical_failures = 0
        pending_human_reviews = 0
        model_route_used: str | None = None
        route_call_skipped = run_mode == "template"
        llm_available = live_llm_available()

        for scenario in scenarios:
            item = self._evaluate_scenario(
                scenario,
                run_mode=run_mode,
                llm_available=llm_available,
            )
            if item.passed:
                passed += 1
            if item.critical_failure:
                critical_failures += 1
            if item.requires_human_review and (
                not item.human_review or item.human_review.review_status == "pending-human-review"
            ):
                pending_human_reviews += 1
            if item.model_route:
                provider = item.model_route.get("provider") or ""
                model = item.model_route.get("model") or ""
                if provider or model:
                    model_route_used = f"{provider}/{model}".strip("/")
            results.append(item)

        total = len(scenarios)
        pass_rate = round((passed / total) * 100, 1) if total else 0.0
        run_title = title or f"Gold pack ({total} scenarios)"
        if family:
            run_title = f"{run_title} — {family}"
        if run_mode == "live-llm":
            run_title = f"{run_title} [live-llm]"

        limitations = self._build_limitations(run_mode=run_mode, llm_available=llm_available)
        coverage = orb_quality_lab_scenario_coverage_service.audit_gold_coverage()

        return OrbQualityLabRunResponse(
            run_id=f"run-{uuid.uuid4().hex[:12]}",
            title=run_title,
            scenario_count=total,
            passed=passed,
            failed=total - passed,
            pass_rate=pass_rate,
            run_mode=run_mode,
            route_call_skipped=route_call_skipped,
            live_llm_available=llm_available,
            model_route_used=model_route_used,
            critical_failures=critical_failures,
            pending_human_reviews=pending_human_reviews,
            validation_errors=orb_expert_scenario_bank_service.validate_gold_scenarios(),
            results=results,
            limitations=limitations,
            coverage=coverage,
        )

    def _evaluate_scenario(
        self,
        scenario: dict[str, Any],
        *,
        run_mode: QualityRunMode,
        llm_available: bool,
    ) -> OrbQualityLabRunItemResult:
        live_call_error: str | None = None
        model_route: dict[str, str | None] | None = None
        answer = ""

        if run_mode == "template":
            answer = _sample_answer(scenario)
        else:
            if not llm_available:
                live_call_error = "Live LLM unavailable — OPENAI_API_KEY not configured in this environment."
                answer = ""
            else:
                live_result = _run_coro_sync(
                    orb_quality_lab_live_runner_service.run_scenario(scenario)
                )
                if live_result.get("ok"):
                    answer = str(live_result.get("answer") or "")
                    model_route = live_result.get("model_route")
                else:
                    live_call_error = str(live_result.get("error") or "Live ORB brain call failed")
                    answer = str(live_result.get("answer") or "")

        evaluation = orb_expert_scenario_evaluator_service.evaluate(
            scenario=scenario,
            answer=answer,
            role=scenario.get("role"),
        )

        breakdown_dict = build_scoring_breakdown(
            scenario=scenario,
            answer=answer,
            evaluation=evaluation,
        )
        critical, critical_reasons = detect_critical_failure(
            scenario=scenario,
            answer=answer,
            evaluation=evaluation,
        )
        if live_call_error:
            critical = True
            critical_reasons = list(critical_reasons) + ["live_call_failed"]
            evaluation = evaluation.model_copy(update={"passed": False})

        needs_review = requires_human_review(
            scenario=scenario,
            evaluation=evaluation,
            critical_failure=critical,
        )
        human_review = (
            OrbQualityLabHumanReview(review_status="pending-human-review")
            if needs_review
            else None
        )

        excerpt = answer[:280] + ("…" if len(answer) > 280 else "")
        if live_call_error and not excerpt:
            excerpt = live_call_error[:280]

        return OrbQualityLabRunItemResult(
            scenario_id=str(scenario.get("scenario_id") or ""),
            title=str(scenario.get("title") or ""),
            family=str(scenario.get("family") or ""),
            role=str(scenario.get("role") or ""),
            risk_level=str(scenario.get("risk_level") or ""),
            passed=evaluation.passed and not critical,
            score=evaluation.score,
            missing_markers=list(evaluation.missing_required_markers),
            unsafe_phrases=list(evaluation.unsafe_phrases_found),
            overclaims=list(evaluation.overclaiming_found),
            notes=list(evaluation.notes),
            answer_source=_answer_source_for_mode(run_mode),  # type: ignore[arg-type]
            answer_excerpt=excerpt,
            generated_answer=answer,
            run_mode=run_mode,
            critical_failure=critical,
            critical_failure_reasons=critical_reasons,
            requires_human_review=needs_review,
            scoring_breakdown=OrbQualityLabScoringBreakdown(**breakdown_dict),
            human_review=human_review,
            live_call_error=live_call_error,
            model_route=model_route,
        )

    def _build_limitations(
        self,
        *,
        run_mode: QualityRunMode,
        llm_available: bool,
    ) -> list[str]:
        limitations = [
            "Quality Lab uses synthetic GOLD scenarios only — never real child, staff, or provider records.",
        ]
        if run_mode == "template":
            limitations.append(
                "Template mode stitches expected markers into sample answers for rubric regression only."
            )
        elif not llm_available:
            limitations.append(
                "Live LLM mode requested but OPENAI_API_KEY is not configured — scenarios recorded as failed."
            )
            limitations.append(
                "Run live-llm verification in staging or production where the ORB brain can call the LLM."
            )
        else:
            limitations.append(
                "Live-llm mode calls /orb/standalone/conversation brain path with ORB safety prompts preserved."
            )
            limitations.append(
                "High-risk and critical-failure results require human review before launch recommendation."
            )
        limitations.append(
            "Run results are returned to the founder/admin UI; persistence is best-effort via founder persistence."
        )
        return limitations

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
        breakdown_dict = build_scoring_breakdown(
            scenario=scenario,
            answer=answer,
            evaluation=evaluation,
        )
        critical, critical_reasons = detect_critical_failure(
            scenario=scenario,
            answer=answer,
            evaluation=evaluation,
        )
        return OrbQualityLabEvaluateResponse(
            scenario_id=scenario_id,
            title=str(scenario.get("title") or ""),
            family=str(scenario.get("family") or ""),
            role=str(scenario.get("role") or ""),
            risk_level=str(scenario.get("risk_level") or ""),
            evaluation=evaluation,
            scoring_breakdown=OrbQualityLabScoringBreakdown(**breakdown_dict),
            critical_failure=critical,
            critical_failure_reasons=critical_reasons,
        )


orb_quality_lab_service = OrbQualityLabService()
