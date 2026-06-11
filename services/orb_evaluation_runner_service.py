"""ORB Evaluation Platform — live LLM runner via the standalone ORB Residential brain path."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

from routers.orb_standalone_routes import (
    OrbStandaloneConversationRequest,
    _build_standalone_request_context,
    _select_assistant_runtime,
)
from services.ai_provider_registry import ai_provider_registry
from services.orb_live_guardrail_service import (
    apply_live_guardrails,
    identifiable_data_response,
    should_skip_identifier_validation,
)
from services.orb_evaluation_message_service import build_evaluation_message, mode_for_scenario
from services.orb_quality_lab_live_runner_service import (
    live_llm_available,
    validate_synthetic_scenario_text,
)
from services.orb_safety_scaffold_service import orb_safety_scaffold_service
from schemas.ai_models import AiProviderName

logger = logging.getLogger("indicare.orb_evaluation_runner")

_TRANSIENT_ERROR_MARKERS = (
    "timeout",
    "rate limit",
    "rate_limit",
    "temporarily unavailable",
    "connection reset",
    "server error",
    "503",
    "502",
    "429",
)


def _is_transient_error(exc: BaseException) -> bool:
    message = f"{type(exc).__name__}: {exc}".lower()
    return any(marker in message for marker in _TRANSIENT_ERROR_MARKERS)


class OrbEvaluationRunnerService:
    """Non-streaming evaluation runner using the ORB standalone conversation brain."""

    def __init__(self, *, scenario_timeout_seconds: float = 90.0) -> None:
        self.scenario_timeout_seconds = scenario_timeout_seconds

    async def run_scenario(
        self,
        scenario: dict[str, Any],
        *,
        evaluation_user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        scenario_id = str(scenario.get("id") or scenario.get("scenario_id") or "")
        message = build_evaluation_message(scenario)
        safety_scaffold = orb_safety_scaffold_service.build_from_scenario(scenario)
        identifier_violations = validate_synthetic_scenario_text(message)
        if identifier_violations and not should_skip_identifier_validation(scenario):
            return {
                "ok": False,
                "scenario_id": scenario_id,
                "answer": "",
                "error": f"Scenario contains disallowed identifiers: {', '.join(identifier_violations)}",
                "route": None,
                "model_route": None,
                "retried": False,
                "live_guardrail": {
                    "passed": False,
                    "missing_safeguards": ["raw-privacy-blocker"],
                    "fallback_used": True,
                },
            }
        if identifier_violations and should_skip_identifier_validation(scenario):
            guarded = apply_live_guardrails("", safety_scaffold)
            return {
                "ok": True,
                "scenario_id": scenario_id,
                "answer": guarded.answer or identifiable_data_response(),
                "error": None,
                "route": "/orb/standalone/conversation",
                "model_route": {
                    "provider": "indicare-intelligence",
                    "model": "live-guardrail-fallback",
                    "brain_route": "identifiable-data-guardrail",
                    "mode": mode_for_scenario(scenario),
                },
                "retried": False,
                "live_guardrail": guarded.check.to_dict(),
                "safety_scaffold_category": safety_scaffold.detected_category,
            }

        if not live_llm_available():
            return {
                "ok": False,
                "scenario_id": scenario_id,
                "answer": "",
                "error": "Live LLM unavailable — OPENAI_API_KEY not configured in this environment.",
                "route": "/orb/standalone/conversation",
                "model_route": None,
                "retried": False,
            }

        mode = mode_for_scenario(scenario)
        payload = OrbStandaloneConversationRequest(
            message=message,
            mode=mode,
            detail="detailed",
            source_surface="orb_evaluation",
            client_route_hint="orb_residential",
        )
        user = evaluation_user or {
            "id": 0,
            "role": "admin",
            "email": "orb-evaluation@indicare.internal",
            "home_id": None,
        }

        last_error: str | None = None
        retried = False
        for attempt in range(2):
            if attempt == 1:
                retried = True
            try:
                result = await asyncio.wait_for(
                    self._invoke_orb_brain(
                        payload,
                        user=user,
                        scenario=scenario,
                        safety_scaffold=safety_scaffold,
                    ),
                    timeout=self.scenario_timeout_seconds,
                )
                if result.get("ok"):
                    result["retried"] = retried
                    result["scenario_id"] = scenario_id
                    result["safety_scaffold_category"] = safety_scaffold.detected_category
                    return result
                last_error = str(result.get("error") or "Unknown ORB brain failure")
                if attempt == 0 and _is_transient_error(Exception(last_error)):
                    await asyncio.sleep(1.5)
                    continue
                result["retried"] = retried
                result["scenario_id"] = scenario_id
                return result
            except asyncio.TimeoutError:
                last_error = f"Scenario timed out after {self.scenario_timeout_seconds:.0f}s"
                if attempt == 0:
                    continue
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                logger.warning(
                    "orb_evaluation_runner failed scenario=%s attempt=%s error=%s",
                    scenario_id,
                    attempt,
                    last_error,
                )
                if attempt == 0 and _is_transient_error(exc):
                    await asyncio.sleep(1.5)
                    continue

        return {
            "ok": False,
            "scenario_id": scenario_id,
            "answer": "",
            "error": last_error or "Live ORB brain call failed",
            "route": "/orb/standalone/conversation",
            "model_route": None,
            "retried": retried,
        }

    async def _invoke_orb_brain(
        self,
        payload: OrbStandaloneConversationRequest,
        *,
        user: dict[str, Any],
        scenario: dict[str, Any] | None = None,
        safety_scaffold: Any | None = None,
    ) -> dict[str, Any]:
        ctx = _build_standalone_request_context(
            payload,
            route="/orb/standalone/conversation",
            safety_scaffold=safety_scaffold.to_dict() if safety_scaffold else None,
        )
        assistant_runtime = _select_assistant_runtime()
        assistant_data = await assistant_runtime.answer(
            ctx["framed_message"],
            history=ctx["history"],
            detail=ctx["detail"],
            image_data_urls=ctx["image_urls"][:4],
            mode=ctx["mode"],
            profile_context=ctx["profile_context"],
            raw_user_message=payload.message,
            user=user,
            brain_convergence=ctx.get("brain_convergence"),
            execution_policy=ctx.get("execution_policy"),
            safety_scaffold=safety_scaffold.to_dict() if safety_scaffold else ctx.get("safety_scaffold"),
        )
        answer = str(assistant_data.get("answer") or "").strip()
        context_used = assistant_data.get("context_used") or {}
        model_routing = context_used.get("model_routing") or {}
        live_guardrail = context_used.get("live_guardrail_check") or assistant_data.get("live_guardrail_check")
        prompt_tier = ctx.get("prompt_tier")
        expert_depth = ctx.get("expert_depth")

        if safety_scaffold and answer and not assistant_data.get("no_llm"):
            guarded = apply_live_guardrails(
                answer,
                safety_scaffold,
                prompt_tier=prompt_tier,
                expert_depth=expert_depth,
            )
            answer = guarded.answer
            live_guardrail = guarded.check.to_dict()

        if assistant_data.get("no_llm"):
            if safety_scaffold and safety_scaffold.guardrail_active and safety_scaffold.safe_fallback_answer:
                guarded = apply_live_guardrails(
                    answer or "",
                    safety_scaffold,
                    prompt_tier=prompt_tier,
                    expert_depth=expert_depth,
                )
                return {
                    "ok": True,
                    "answer": guarded.answer,
                    "error": None,
                    "route": "/orb/standalone/conversation",
                    "model_route": {
                        **model_routing,
                        "brain_route": "live-guardrail-fallback",
                        "mode": ctx.get("mode"),
                    },
                    "live_guardrail": guarded.check.to_dict(),
                }
            return {
                "ok": False,
                "answer": answer,
                "error": "ORB brain returned a non-LLM deterministic response",
                "route": "/orb/standalone/conversation",
                "model_route": model_routing,
                "live_guardrail": live_guardrail,
            }
        if not answer:
            return {
                "ok": False,
                "answer": "",
                "error": "ORB brain returned an empty answer",
                "route": "/orb/standalone/conversation",
                "model_route": model_routing,
                "live_guardrail": live_guardrail,
            }
        brain_route = ctx.get("brain_route") or (ctx.get("brain_convergence") or {}).get("brain_route")
        return {
            "ok": True,
            "answer": answer,
            "error": None,
            "route": "/orb/standalone/conversation",
            "model_route": {
                "provider": model_routing.get("provider"),
                "model": model_routing.get("model"),
                "brain_route": brain_route,
                "mode": ctx.get("mode"),
                "prompt_tier": prompt_tier,
                "expert_depth": expert_depth,
            },
            "live_guardrail": live_guardrail,
        }


orb_evaluation_runner_service = OrbEvaluationRunnerService()
