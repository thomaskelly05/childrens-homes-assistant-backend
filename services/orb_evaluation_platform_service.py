"""ORB Evaluation & Red Team Platform — scenario run orchestration for founder/admin."""

from __future__ import annotations

import asyncio
import concurrent.futures
import uuid
from collections.abc import Coroutine
from typing import Any, TypeVar

from schemas.orb_evaluation_platform import (
    OrbEvaluationOverview,
    OrbEvaluationRunRequest,
    OrbEvaluationRunResponse,
    OrbEvaluationScenarioPayload,
    OrbEvaluationScenarioResult,
)
from services.orb_evaluation_runner_service import orb_evaluation_runner_service
from services.orb_quality_lab_live_runner_service import live_llm_available

_T = TypeVar("_T")

_in_memory_scenarios: list[dict[str, Any]] = []


def _run_coro_sync(coro: Coroutine[Any, Any, _T]) -> _T:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        return executor.submit(asyncio.run, coro).result()


def _scenario_to_dict(scenario: OrbEvaluationScenarioPayload | dict[str, Any]) -> dict[str, Any]:
    if isinstance(scenario, OrbEvaluationScenarioPayload):
        return scenario.model_dump(by_alias=True)
    return dict(scenario)


class OrbEvaluationPlatformService:
  def build_overview(self) -> OrbEvaluationOverview:
      return OrbEvaluationOverview(
          live_llm_available=live_llm_available(),
          scenario_template_count=39,
          supported_pack_types=["standard", "high-risk", "adversarial", "custom", "retest"],
          limitations=[
              "Synthetic scenarios only — never real child, staff, or provider records.",
              "Live-llm mode calls /orb/standalone/conversation with ORB safety prompts preserved.",
              "Scoring and red team analysis run in the founder evaluation UI layer.",
          ],
      )

  def list_scenarios(self, *, limit: int = 500) -> list[dict[str, Any]]:
      return _in_memory_scenarios[:limit]

  def store_scenarios(self, scenarios: list[dict[str, Any]]) -> dict[str, Any]:
      global _in_memory_scenarios
      safe = [s for s in scenarios if isinstance(s, dict)]
      _in_memory_scenarios = safe[-5000:]
      return {"count": len(_in_memory_scenarios), "stored": len(safe)}

  def run_evaluation(self, request: OrbEvaluationRunRequest) -> OrbEvaluationRunResponse:
      scenarios = self._resolve_scenarios(request)
      if not scenarios:
          return OrbEvaluationRunResponse(
              run_id=f"eval-{uuid.uuid4().hex[:12]}",
              title=request.title or "Empty evaluation run",
              mode=request.mode,
              status="failed",
              scenario_count=0,
              completed_count=0,
              live_llm_available=live_llm_available(),
              scenario_results=[],
              limitations=["No scenarios available for this run."],
              error="No scenarios to evaluate",
          )

      llm_available = live_llm_available()
      if request.mode == "live-llm" and not llm_available:
          return OrbEvaluationRunResponse(
              run_id=f"eval-{uuid.uuid4().hex[:12]}",
              title=request.title or "Failed evaluation run",
              mode=request.mode,
              status="failed",
              scenario_count=len(scenarios),
              completed_count=0,
              live_llm_available=False,
              scenario_results=[],
              limitations=[
                  "Live LLM unavailable — OPENAI_API_KEY not configured.",
                  "No answers were fabricated.",
              ],
              error="Live LLM unavailable — OPENAI_API_KEY not configured in this environment.",
          )

      results: list[OrbEvaluationScenarioResult] = []
      for scenario in scenarios:
          item = self._run_single_scenario(scenario, mode=request.mode, llm_available=llm_available)
          results.append(item)

      completed = sum(1 for r in results if r.ok or r.answer)
      title = request.title or f"ORB Evaluation ({len(scenarios)} scenarios)"
      if request.pack_type != "standard":
          title = f"{title} [{request.pack_type}]"
      if request.mode == "live-llm":
          title = f"{title} [live-llm]"

      return OrbEvaluationRunResponse(
          run_id=f"eval-{uuid.uuid4().hex[:12]}",
          title=title,
          mode=request.mode,
          status="completed",
          scenario_count=len(scenarios),
          completed_count=completed,
          live_llm_available=llm_available,
          scenario_results=results,
          limitations=self._build_limitations(mode=request.mode, llm_available=llm_available),
      )

  def _resolve_scenarios(self, request: OrbEvaluationRunRequest) -> list[dict[str, Any]]:
      if request.scenarios:
          items = [_scenario_to_dict(s) for s in request.scenarios[: request.limit]]
          return items
      if request.scenario_ids:
          wanted = {str(sid) for sid in request.scenario_ids}
          matched = [s for s in _in_memory_scenarios if str(s.get("id") or "") in wanted]
          return matched[: request.limit]
      return _in_memory_scenarios[: request.limit]

  def _run_single_scenario(
      self,
      scenario: dict[str, Any],
      *,
      mode: str,
      llm_available: bool,
  ) -> OrbEvaluationScenarioResult:
      scenario_id = str(scenario.get("id") or "")
      question = str(scenario.get("question") or "")

      if mode == "template":
          markers = scenario.get("expectedResponseFocus") or []
          answer = self._template_answer(scenario, markers)
          return OrbEvaluationScenarioResult(
              scenario_id=scenario_id,
              question=question,
              answer=answer,
              ok=True,
          )

      if not llm_available:
          return OrbEvaluationScenarioResult(
              scenario_id=scenario_id,
              question=question,
              answer="",
              ok=False,
              error="Live LLM unavailable — OPENAI_API_KEY not configured.",
          )

      live_result = _run_coro_sync(orb_evaluation_runner_service.run_scenario(scenario))
      return OrbEvaluationScenarioResult(
          scenario_id=scenario_id,
          question=question,
          answer=str(live_result.get("answer") or ""),
          ok=bool(live_result.get("ok")),
          error=live_result.get("error"),
          model_route=live_result.get("model_route"),
          retried=bool(live_result.get("retried")),
      )

  def _template_answer(self, scenario: dict[str, Any], markers: list[Any]) -> str:
      lines = [
          "Based only on what you have provided — I have not checked live IndiCare OS records.",
          "",
          f"## Synthetic scenario: {scenario.get('category')}",
          "",
          "Key considerations:",
      ]
      for marker in markers:
          lines.append(f"- {marker}")
      lines.extend(
          [
              "",
              "Safeguarding: follow your home safeguarding policy and escalate concerns you cannot safely manage.",
              "Child voice: record the young person's words where known; do not invent quotes.",
              "Local policy: apply your organisation's procedures and use professional judgement.",
          ]
      )
      return "\n".join(lines)

  def _build_limitations(self, *, mode: str, llm_available: bool) -> list[str]:
      limitations = [
          "ORB Evaluation Platform uses synthetic scenarios only — never real child, staff, or provider records.",
      ]
      if mode == "template":
          limitations.append(
              "Template mode stitches expected focus markers for rubric regression — not for launch evidence."
          )
      elif not llm_available:
          limitations.append("Live LLM mode requested but OPENAI_API_KEY is not configured.")
          limitations.append("No answers were fabricated.")
      else:
          limitations.append(
              "Live-llm mode calls /orb/standalone/conversation brain path with ORB safety prompts preserved."
          )
      return limitations


orb_evaluation_platform_service = OrbEvaluationPlatformService()
