"""Shared ORB evaluation message builders — no router imports."""

from __future__ import annotations

from typing import Any

EVALUATION_SYNTHETIC_PREFIX = (
    "[ORB Evaluation Platform — synthetic scenario only. "
    "No real child, staff, or provider records. "
    "Do not invent live IndiCare OS data.]\n\n"
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


def mode_for_scenario(scenario: dict[str, Any]) -> str:
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
