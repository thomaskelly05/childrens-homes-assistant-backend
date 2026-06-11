"""ORB Quality Lab — live LLM runner via the standalone ORB Residential brain path."""

from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import Any

from routers.orb_standalone_routes import (
    OrbStandaloneConversationRequest,
    _build_standalone_request_context,
    _select_assistant_runtime,
)
from services.ai_provider_registry import ai_provider_registry
from schemas.ai_models import AiProviderName

logger = logging.getLogger("indicare.orb_quality_lab_live")

QUALITY_LAB_SYNTHETIC_PREFIX = (
    "[ORB Quality Lab — synthetic scenario only. "
    "No real child, staff, or provider records. "
    "Do not invent live IndiCare OS data.]\n\n"
)

_REAL_IDENTIFIER_PATTERNS: list[tuple[str, str]] = [
    (r"\bchild\s+id\s*[:=]\s*\d+", "child_id"),
    (r"\bstaff\s+id\s*[:=]\s*\d+", "staff_id"),
    (r"\bprovider\s+id\s*[:=]\s*\d+", "provider_id"),
    (r"\b\d{3}-\d{3}-\d{4}\b", "phone_number"),
    (r"\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b", "uk_postcode"),
]

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


def live_llm_available() -> bool:
    """True when a non-mock LLM provider is configured for quality lab live runs."""
    if os.getenv("ORB_QUALITY_LAB_FORCE_LIVE", "").strip().lower() in {"1", "true", "yes"}:
        return ai_provider_registry.provider_available(AiProviderName.OPENAI)
    return ai_provider_registry.provider_available(AiProviderName.OPENAI)


def validate_synthetic_scenario_text(text: str) -> list[str]:
    """Reject prompts that appear to contain real identifiers."""
    violations: list[str] = []
    lower = str(text or "").lower()
    for pattern, label in _REAL_IDENTIFIER_PATTERNS:
        if re.search(pattern, lower, re.I):
            violations.append(label)
    return violations


def build_quality_lab_message(scenario: dict[str, Any]) -> str:
    role = str(scenario.get("role") or "support_worker").replace("_", " ")
    risk = str(scenario.get("risk_level") or "medium")
    prompt = str(scenario.get("prompt") or "").strip()
    title = str(scenario.get("title") or "").strip()
    lines = [
        QUALITY_LAB_SYNTHETIC_PREFIX.strip(),
        f"Scenario: {title}",
        f"Role: {role}",
        f"Risk level: {risk}",
        "",
        prompt,
        "",
        (
            "Provide practical children's home guidance for this synthetic scenario. "
            "Include a local policy/professional judgement caveat where risk is elevated."
        ),
    ]
    return "\n".join(lines)


def _mode_for_scenario(scenario: dict[str, Any]) -> str:
    risk = str(scenario.get("risk_level") or "").lower()
    family = str(scenario.get("family") or "").lower()
    role = str(scenario.get("role") or "").lower()
    if risk in ("high", "critical"):
        return "Safeguarding Thinking"
    if "reg44" in family or role == "reg44_visitor":
        return "Reg 44 / Reg 45 Prep"
    if role == "registered_manager" or "oversight" in family:
        return "Manager Copilot"
    if "record" in family or "log" in family:
        return "Record This Properly"
    return "Ask ORB"


def _is_transient_error(exc: BaseException) -> bool:
    message = f"{type(exc).__name__}: {exc}".lower()
    return any(marker in message for marker in _TRANSIENT_ERROR_MARKERS)


class OrbQualityLabLiveRunnerService:
    """Non-streaming Quality Lab runner using the ORB standalone conversation brain."""

    def __init__(self, *, scenario_timeout_seconds: float = 90.0) -> None:
        self.scenario_timeout_seconds = scenario_timeout_seconds

    async def run_scenario(
        self,
        scenario: dict[str, Any],
        *,
        quality_lab_user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        scenario_id = str(scenario.get("scenario_id") or "")
        message = build_quality_lab_message(scenario)
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
            source_surface="quality_lab",
            client_route_hint="orb_residential",
        )
        user = quality_lab_user or {
            "id": 0,
            "role": "admin",
            "email": "quality-lab@indicare.internal",
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
                    return result
                last_error = str(result.get("error") or "Unknown ORB brain failure")
                if attempt == 0 and _is_transient_error(Exception(last_error)):
                    await asyncio.sleep(1.5)
                    continue
                result["retried"] = retried
                return result
            except asyncio.TimeoutError:
                last_error = f"Scenario timed out after {self.scenario_timeout_seconds:.0f}s"
                if attempt == 0:
                    continue
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                logger.warning(
                    "quality_lab_live_runner failed scenario=%s attempt=%s error=%s",
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


orb_quality_lab_live_runner_service = OrbQualityLabLiveRunnerService()
