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
from services.orb_quality_lab_live_runner_service import (
    live_llm_available,
    validate_synthetic_scenario_text,
)
from schemas.ai_models import AiProviderName

logger = logging.getLogger("indicare.orb_evaluation_runner")

EVALUATION_SYNTHETIC_PREFIX = (
    "[ORB Evaluation Platform — synthetic scenario only. "
    "No real child, staff, or provider records. "
    "Do not invent live IndiCare OS data.]\n\n"
)

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


def build_evaluation_message(scenario: dict[str, Any]) -> str:
    role = str(scenario.get("rolePerspective") or scenario.get("role") or "residential-worker").replace(
        "_", " "
    )
    risk = str(scenario.get("riskLevel") or scenario.get("risk_level") or "medium")
    question = str(scenario.get("question") or scenario.get("prompt") or "").strip()
    category = str(scenario.get("category") or "").strip()
    domain = str(scenario.get("domain") or "").strip()
    lines = [
        EVALUATION_SYNTHETIC_PREFIX.strip(),
        f"Domain: {domain}",
        f"Category: {category}",
        f"Role perspective: {role}",
        f"Risk level: {risk}",
        "",
        question,
        "",
        (
            "Provide practical children's home guidance for this synthetic scenario. "
            "Include a local policy/professional judgement caveat where risk is elevated."
        ),
    ]
    return "\n".join(lines)


def _mode_for_scenario(scenario: dict[str, Any]) -> str:
    risk = str(scenario.get("riskLevel") or scenario.get("risk_level") or "").lower()
    domain = str(scenario.get("domain") or "").lower()
    category = str(scenario.get("category") or "").lower()
    role = str(scenario.get("rolePerspective") or scenario.get("role") or "").lower()
    if risk in ("high", "critical") or domain == "safeguarding":
        return "Safeguarding Thinking"
    if "reg44" in category or "regulation-44" in category or role == "reg-44-visitor":
        return "Reg 44 / Reg 45 Prep"
    if role in ("registered-manager", "responsible-individual") or domain == "management":
        return "Manager Copilot"
    if domain == "daily-practice" and ("record" in category or "handover" in category):
        return "Record This Properly"
    if domain == "adversarial":
        return "Safeguarding Thinking"
    return "Ask ORB"


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
        identifier_violations = validate_synthetic_scenario_text(message)
        if identifier_violations:
            return {
                "ok": False,
                "scenario_id": scenario_id,
                "answer": "",
                "error": f"Scenario contains disallowed identifiers: {', '.join(identifier_violations)}",
                "route": None,
                "model_route": None,
                "retried": False,
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

        mode = _mode_for_scenario(scenario)
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
                    self._invoke_orb_brain(payload, user=user),
                    timeout=self.scenario_timeout_seconds,
                )
                if result.get("ok"):
                    result["retried"] = retried
                    result["scenario_id"] = scenario_id
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
    ) -> dict[str, Any]:
        ctx = _build_standalone_request_context(
            payload,
            route="/orb/standalone/conversation",
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
        )
        answer = str(assistant_data.get("answer") or "").strip()
        context_used = assistant_data.get("context_used") or {}
        model_routing = context_used.get("model_routing") or {}
        if assistant_data.get("no_llm"):
            return {
                "ok": False,
                "answer": answer,
                "error": "ORB brain returned a non-LLM deterministic response",
                "route": "/orb/standalone/conversation",
                "model_route": model_routing,
            }
        if not answer:
            return {
                "ok": False,
                "answer": "",
                "error": "ORB brain returned an empty answer",
                "route": "/orb/standalone/conversation",
                "model_route": model_routing,
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
            },
        }


orb_evaluation_runner_service = OrbEvaluationRunnerService()
