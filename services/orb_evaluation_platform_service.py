"""ORB Evaluation & Red Team Platform — scenario run orchestration for founder/admin."""

from __future__ import annotations

import asyncio
import concurrent.futures
import uuid
from collections.abc import Coroutine
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, TypeVar

from schemas.orb_evaluation_platform import (
    OrbEvaluationOverview,
    OrbEvaluationProcessResponse,
    OrbEvaluationRunCreateResponse,
    OrbEvaluationRunRecord,
    OrbEvaluationRunRequest,
    OrbEvaluationRunResponse,
    OrbEvaluationScenarioPayload,
    OrbEvaluationScenarioResult,
)
from services.orb_evaluation_runner_service import orb_evaluation_runner_service
from services.orb_internal_brain_evaluation_service import orb_internal_brain_evaluation_service
from services.orb_quality_lab_live_runner_service import live_llm_available

_T = TypeVar("_T")

_in_memory_scenarios: list[dict[str, Any]] = []

INTERNAL_BRAIN_BATCH_SIZE = 5
STALE_RUN_THRESHOLD_MINUTES = 10
PROCESS_BUSY_RETRY_AFTER_MS = 1000


@dataclass
class _AsyncEvaluationRun:
    run_id: str
    title: str
    mode: str
    pack_type: str
    status: str
    scenarios: list[dict[str, Any]]
    scenario_results: list[OrbEvaluationScenarioResult] = field(default_factory=list)
    process_index: int = 0
    critical_failures: int = 0
    started_at: str = ""
    completed_at: str | None = None
    created_by: str | None = None
    error: str | None = None
    limitations: list[str] = field(default_factory=list)


_in_memory_runs: dict[str, _AsyncEvaluationRun] = {}
_processing_run_ids: set[str] = set()


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
          internal_brain_available=True,
          scenario_template_count=39,
          supported_pack_types=["standard", "high-risk", "adversarial", "custom", "retest"],
          supported_modes=["template", "internal-brain", "live-llm"],
          limitations=[
              "Synthetic scenarios only — never real child, staff, or provider records.",
              "Internal-brain mode tests ORB routing, safeguards and fallback logic without OpenAI.",
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

  def recover_stale_internal_brain_runs(
      self,
      *,
      threshold_minutes: int = STALE_RUN_THRESHOLD_MINUTES,
  ) -> list[OrbEvaluationRunRecord]:
      cutoff = datetime.now(timezone.utc) - timedelta(minutes=threshold_minutes)
      recovered: list[OrbEvaluationRunRecord] = []
      for stored in list(_in_memory_runs.values()):
          if stored.mode != "internal-brain":
              continue
          if stored.status not in ("queued", "running"):
              continue
          started = datetime.fromisoformat(stored.started_at.replace("Z", "+00:00"))
          if started >= cutoff:
              continue
          stored.status = "interrupted"
          stored.error = "Run interrupted — exceeded safe processing window"
          stored.completed_at = datetime.now(timezone.utc).isoformat()
          recovered.append(
              OrbEvaluationRunRecord(
                  id=stored.run_id,
                  status="interrupted",
                  mode="internal-brain",
                  pack=stored.pack_type,
                  title=stored.title,
                  scenario_count=len(stored.scenarios),
                  completed_count=stored.process_index,
                  critical_failures=stored.critical_failures,
                  started_at=stored.started_at,
                  completed_at=stored.completed_at,
                  created_by=stored.created_by,
                  error=stored.error,
              )
          )
      return recovered

  def create_internal_brain_run(self, request: OrbEvaluationRunRequest) -> OrbEvaluationRunCreateResponse:
      self.recover_stale_internal_brain_runs()
      active = self.find_active_internal_brain_run()
      if active:
          if active.pack == request.pack_type:
              return OrbEvaluationRunCreateResponse(run=active)
          raise ValueError(
              "Another internal-brain evaluation is still finishing. Please wait for it to complete."
          )

      scenarios = self._resolve_scenarios(request)
      if not scenarios:
          raise ValueError("No scenarios to evaluate")

      run_id = f"eval-{uuid.uuid4().hex[:12]}"
      title = self._build_run_title(request, len(scenarios))
      started_at = datetime.now(timezone.utc).isoformat()
      stored = _AsyncEvaluationRun(
          run_id=run_id,
          title=title,
          mode="internal-brain",
          pack_type=request.pack_type,
          status="queued",
          scenarios=scenarios,
          started_at=started_at,
          created_by=request.created_by,
          limitations=self._build_limitations(mode="internal-brain", llm_available=live_llm_available()),
      )
      _in_memory_runs[run_id] = stored
      return OrbEvaluationRunCreateResponse(
          run=OrbEvaluationRunRecord(
              id=run_id,
              status="queued",
              mode="internal-brain",
              pack=request.pack_type,
              title=title,
              scenario_count=len(scenarios),
              completed_count=0,
              critical_failures=0,
              started_at=started_at,
              created_by=request.created_by,
          )
      )

  def get_async_run(self, run_id: str) -> _AsyncEvaluationRun | None:
      return _in_memory_runs.get(run_id)

  def process_internal_brain_run(
      self,
      run_id: str,
      *,
      batch_size: int = INTERNAL_BRAIN_BATCH_SIZE,
  ) -> OrbEvaluationProcessResponse:
      self.recover_stale_internal_brain_runs()
      stored = _in_memory_runs.get(run_id)
      if not stored:
          raise KeyError(f"Evaluation run not found: {run_id}")
      if stored.mode != "internal-brain":
          raise ValueError("Only internal-brain runs support batched processing")
      if stored.status in ("completed", "failed", "interrupted"):
          return OrbEvaluationProcessResponse(
              run_id=stored.run_id,
              status=stored.status,
              completed_count=stored.process_index,
              scenario_count=len(stored.scenarios),
              critical_failures=stored.critical_failures,
              next_batch_available=False,
              batch_results=[],
              error=stored.error,
          )

      if run_id in _processing_run_ids:
          return OrbEvaluationProcessResponse(
              run_id=stored.run_id,
              status=stored.status,
              completed_count=stored.process_index,
              scenario_count=len(stored.scenarios),
              critical_failures=stored.critical_failures,
              next_batch_available=stored.process_index < len(stored.scenarios),
              batch_results=[],
              success=False,
              code="busy",
              retryable=True,
              retry_after_ms=PROCESS_BUSY_RETRY_AFTER_MS,
          )

      _processing_run_ids.add(run_id)
      try:
          if stored.status == "queued":
              stored.status = "running"

          llm_available = live_llm_available()
          batch_results: list[OrbEvaluationScenarioResult] = []
          end_index = min(stored.process_index + batch_size, len(stored.scenarios))

          try:
              for scenario in stored.scenarios[stored.process_index : end_index]:
                  try:
                      item = self._run_single_scenario(
                          scenario,
                          mode="internal-brain",
                          llm_available=llm_available,
                      )
                  except Exception as exc:  # noqa: BLE001 — record per-scenario failure and continue
                      scenario_id = str(scenario.get("id") or "")
                      item = OrbEvaluationScenarioResult(
                          scenario_id=scenario_id,
                          question=str(scenario.get("question") or ""),
                          answer="",
                          ok=False,
                          error=str(exc)[:240],
                      )
                  batch_results.append(item)
                  stored.scenario_results.append(item)
                  if item.internal_brain and item.internal_brain.get("critical_failure"):
                      stored.critical_failures += 1
          except Exception as exc:  # noqa: BLE001
              stored.status = "failed"
              stored.error = str(exc)[:240]
              stored.completed_at = datetime.now(timezone.utc).isoformat()
              return OrbEvaluationProcessResponse(
                  run_id=stored.run_id,
                  status="failed",
                  completed_count=stored.process_index,
                  scenario_count=len(stored.scenarios),
                  critical_failures=stored.critical_failures,
                  next_batch_available=False,
                  batch_results=batch_results,
                  error=stored.error,
              )

          stored.process_index = end_index
          next_batch_available = stored.process_index < len(stored.scenarios)

          if not next_batch_available:
              stored.status = "completed"
              stored.completed_at = datetime.now(timezone.utc).isoformat()
          else:
              stored.status = "running"

          return OrbEvaluationProcessResponse(
              run_id=stored.run_id,
              status=stored.status,
              completed_count=stored.process_index,
              scenario_count=len(stored.scenarios),
              critical_failures=stored.critical_failures,
              next_batch_available=next_batch_available,
              batch_results=batch_results,
          )
      finally:
          _processing_run_ids.discard(run_id)

  def find_active_internal_brain_run(
      self,
      *,
      pack_type: str | None = None,
  ) -> OrbEvaluationRunRecord | None:
      self.recover_stale_internal_brain_runs()
      for stored in reversed(list(_in_memory_runs.values())):
          if stored.mode != "internal-brain":
              continue
          if stored.status not in ("queued", "running"):
              continue
          if pack_type and stored.pack_type != pack_type:
              continue
          return OrbEvaluationRunRecord(
              id=stored.run_id,
              status=stored.status,
              mode="internal-brain",
              pack=stored.pack_type,
              title=stored.title,
              scenario_count=len(stored.scenarios),
              completed_count=stored.process_index,
              critical_failures=stored.critical_failures,
              started_at=stored.started_at,
              created_by=stored.created_by,
          )
      return None

  def run_evaluation(self, request: OrbEvaluationRunRequest) -> OrbEvaluationRunResponse:
      if request.mode == "internal-brain":
          created = self.create_internal_brain_run(request)
          record = created.run
          return OrbEvaluationRunResponse(
              run_id=record.id,
              title=record.title,
              mode=record.mode,
              status=record.status,
              scenario_count=record.scenario_count,
              completed_count=record.completed_count,
              live_llm_available=live_llm_available(),
              scenario_results=[],
              limitations=self._build_limitations(mode="internal-brain", llm_available=live_llm_available()),
              run=record,
          )

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
      title = self._build_run_title(request, len(scenarios))

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

  def _build_run_title(self, request: OrbEvaluationRunRequest, scenario_count: int) -> str:
      title = request.title or f"ORB Evaluation ({scenario_count} scenarios)"
      if request.pack_type != "standard":
          title = f"{title} [{request.pack_type}]"
      if request.mode == "live-llm":
          title = f"{title} [live-llm]"
      elif request.mode == "internal-brain":
          title = f"{title} [internal-brain]"
      return title

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

      if mode == "internal-brain":
          internal = orb_internal_brain_evaluation_service.evaluate_scenario(scenario)
          internal_dict = internal.to_dict()
          return OrbEvaluationScenarioResult(
              scenario_id=scenario_id,
              question=question,
              answer=internal.fallback_answer,
              ok=bool(internal.fallback_answer) and not internal.critical_failure,
              model_route={
                  "brain_route": "internal-brain",
                  "mode": internal.detected_orb_mode,
                  "provider": "indicare-intelligence",
                  "model": "deterministic",
              },
              internal_brain=internal_dict,
          )

      if not llm_available:
          return OrbEvaluationScenarioResult(
              scenario_id=scenario_id,
              question=question,
              answer="",
              ok=False,
              error="Live LLM unavailable — OPENAI_API_KEY not configured.",
          )

      try:
          live_result = _run_coro_sync(orb_evaluation_runner_service.run_scenario(scenario))
      except Exception as exc:  # noqa: BLE001 — keep pack running with controlled infrastructure failure
          from services.openai_header_sanitisation import (
              infrastructure_error_message,
              is_openai_headers_too_large_error,
          )

          if is_openai_headers_too_large_error(exc):
              live_result = {
                  "ok": False,
                  "answer": "",
                  "error": infrastructure_error_message(),
                  "infrastructure_error": True,
                  "retried": False,
              }
          else:
              live_result = {
                  "ok": False,
                  "answer": "",
                  "error": f"{type(exc).__name__}: {str(exc)[:200]}",
                  "retried": False,
              }

      infrastructure_error = bool(live_result.get("infrastructure_error"))
      return OrbEvaluationScenarioResult(
          scenario_id=scenario_id,
          question=question,
          answer=str(live_result.get("answer") or ""),
          ok=bool(live_result.get("ok")),
          error=live_result.get("error"),
          model_route=live_result.get("model_route"),
          retried=bool(live_result.get("retried")),
          live_guardrail=live_result.get("live_guardrail"),
          safety_scaffold_category=live_result.get("safety_scaffold_category"),
          infrastructure_error=infrastructure_error,
          metadata=live_result.get("metadata") if isinstance(live_result.get("metadata"), dict) else None,
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
      elif mode == "internal-brain":
          limitations.append(
              "Internal-brain mode tests ORB routing, safeguards and fallback logic without calling OpenAI."
          )
          limitations.append(
              "Internal safety/routing evidence — not full answer generation evidence."
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
