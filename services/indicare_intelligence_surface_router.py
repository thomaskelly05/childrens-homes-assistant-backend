from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

IntelligenceSurface = Literal[
    "standalone_orb",
    "operational_orb",
    "care_hub",
    "record_hub",
    "intelligence_spine",
    "saved_outputs",
    "knowledge_library",
    "document_understanding",
    "agents",
    "staff_profile",
    "child_profile",
    "governance_dashboard",
]


class SurfaceRoutingDecision(BaseModel):
    model_config = ConfigDict(extra="ignore")

    recommended_surface: IntelligenceSurface
    reason: str
    allowed_in_standalone: bool
    requires_os_context: bool
    safety_notice: str | None = None
    suggested_route: str | None = None
    intent_category: str | None = None


_CHILD_LIVE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\btell me about\b.+\b(child|young person|yp)\b", re.I),
    re.compile(r"\b(child|young person|yp)\b.+\b(chronology|timeline|records?)\b", re.I),
    re.compile(r"\buse\b.+\b(chronology|care record|file)\b", re.I),
    re.compile(r"\bwhat happened with\b.+\b(last week|yesterday|recently)\b", re.I),
    re.compile(r"\b(live|current)\b.+\b(record|evidence|placement)\b", re.I),
    re.compile(r"\bthis child'?s\b", re.I),
    re.compile(r"\bopen\b.+\b(child|young person)\b.+\b(profile|file)\b", re.I),
)

_MANAGER_OS_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bmanager review\b.+\btoday\b", re.I),
    re.compile(r"\bwhat needs\b.+\b(manager|oversight)\b.+\btoday\b", re.I),
    re.compile(r"\baction board\b", re.I),
    re.compile(r"\bintelligence spine\b", re.I),
    re.compile(r"\bincident trend\b", re.I),
    re.compile(r"\bburnout pattern\b", re.I),
    re.compile(r"\bworkforce intelligence\b", re.I),
    re.compile(r"\blive evidence\b.+\b(ofsted|inspection)\b", re.I),
    re.compile(r"\bevidence graph\b", re.I),
)

_DOCUMENT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bupload\b.+\b(policy|document|pdf)\b", re.I),
    re.compile(r"\banalyse\b.+\b(document|policy|upload)\b", re.I),
    re.compile(r"\b(policy comparison|compare policies)\b", re.I),
)

_RECORDING_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(daily note|shift note|record this|wording for)\b", re.I),
    re.compile(r"\bhelp me write\b.+\b(note|record|log)\b", re.I),
)

_OFSTED_SOURCE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bwhat does (ofsted|sccif|regulation)\b", re.I),
    re.compile(r"\b(ofsted|sccif)\b.+\b(expect|guidance|source)\b", re.I),
    re.compile(r"\bquality standard\b", re.I),
)

_KNOWLEDGE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bknowledge library\b", re.I),
    re.compile(r"\bingest\b.+\b(source|guidance)\b", re.I),
)

_AGENT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bdeep research\b", re.I),
    re.compile(r"\brun agent\b", re.I),
    re.compile(r"\baction plan\b.+\b(from|generator)\b", re.I),
)

_STAFF_PROFILE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bstaff profile\b", re.I),
    re.compile(r"\bthis staff member\b", re.I),
    re.compile(r"\bworkforce record\b", re.I),
)


def _matches_any(text: str, patterns: tuple[re.Pattern[str], ...]) -> bool:
    return any(pattern.search(text) for pattern in patterns)


def route_intelligence_surface(
    intent: str,
    *,
    has_document_upload: bool = False,
    mode: str | None = None,
) -> SurfaceRoutingDecision:
    """Classify user intent to a product surface without fetching OS data."""
    text = (intent or "").strip()
    lower = text.lower()

    if has_document_upload or _matches_any(text, _DOCUMENT_PATTERNS):
        return SurfaceRoutingDecision(
            recommended_surface="document_understanding",
            reason="Document upload or policy analysis belongs in standalone document understanding.",
            allowed_in_standalone=True,
            requires_os_context=False,
            suggested_route="/orb",
            intent_category="document",
            safety_notice="Uploaded content stays in standalone workspace unless you explicitly save outputs.",
        )

    if _matches_any(text, _CHILD_LIVE_PATTERNS):
        return SurfaceRoutingDecision(
            recommended_surface="operational_orb",
            reason="Child-specific live records, chronology or placement context require permissioned IndiCare OS.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route="/assistant/orb?mode=child_journey_summary",
            intent_category="child_live_context",
            safety_notice=(
                "Standalone ORB cannot access live child records. Use IndiCare OS ORB at /assistant/orb "
                "or Young People in the OS."
            ),
        )

    if _matches_any(text, _STAFF_PROFILE_PATTERNS) and (
        "live" in lower or "record" in lower or "today" in lower
    ):
        return SurfaceRoutingDecision(
            recommended_surface="staff_profile",
            reason="Live staff records and workforce intelligence require OS context.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route="/assistant/orb?mode=staff_support",
            intent_category="staff_live_context",
            safety_notice="Use operational ORB or workforce areas for live staff context.",
        )

    if _matches_any(text, _MANAGER_OS_PATTERNS):
        surface: IntelligenceSurface = (
            "intelligence_spine"
            if "intelligence spine" in lower or "incident trend" in lower or "evidence graph" in lower
            else "operational_orb"
        )
        return SurfaceRoutingDecision(
            recommended_surface=surface,
            reason="Manager oversight, patterns and live evidence need Intelligence Spine or operational ORB.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route=(
                "/care-hub"
                if "care hub" in lower
                else "/assistant/orb?mode=manager_daily_brief"
                if any(t in lower for t in ("attention today", "manager review", "daily brief"))
                else "/assistant/orb?mode=safeguarding_themes"
                if "safeguarding" in lower
                else "/assistant/orb?mode=action_priority"
            ),
            intent_category="manager_oversight",
            safety_notice="Do not infer live actions from standalone chat; review in OS dashboards.",
        )

    if _matches_any(text, _RECORDING_PATTERNS) or (mode or "").strip() == "Record This Properly":
        return SurfaceRoutingDecision(
            recommended_surface="record_hub",
            reason="Daily notes can use standalone wording help or OS Record for filing.",
            allowed_in_standalone=True,
            requires_os_context=False,
            suggested_route="/record",
            intent_category="recording",
            safety_notice="Standalone ORB helps with wording only; filing to care records happens in Record.",
        )

    if _matches_any(text, _OFSTED_SOURCE_PATTERNS):
        live_evidence = "live evidence" in lower or "our evidence" in lower or "our records" in lower
        if live_evidence:
            return SurfaceRoutingDecision(
                recommended_surface="operational_orb",
                reason="Ofsted questions about your home's live evidence need OS inspection readiness.",
                allowed_in_standalone=False,
                requires_os_context=True,
                suggested_route="/assistant/orb?mode=ofsted_evidence_review",
                intent_category="ofsted_live_evidence",
            )
        return SurfaceRoutingDecision(
            recommended_surface="standalone_orb",
            reason="Regulatory source questions can be answered from knowledge library and built-in guidance.",
            allowed_in_standalone=True,
            requires_os_context=False,
            suggested_route="/orb",
            intent_category="ofsted_sources",
        )

    if _matches_any(text, _KNOWLEDGE_PATTERNS):
        return SurfaceRoutingDecision(
            recommended_surface="knowledge_library",
            reason="Knowledge library ingestion and search is a standalone ORB capability.",
            allowed_in_standalone=True,
            requires_os_context=False,
            suggested_route="/orb",
            intent_category="knowledge",
        )

    if _matches_any(text, _AGENT_PATTERNS):
        surface: IntelligenceSurface = "agents"
        if "deep research" in lower:
            surface = "agents"
        return SurfaceRoutingDecision(
            recommended_surface=surface,
            reason="Agents and deep research run in standalone orchestration.",
            allowed_in_standalone=True,
            requires_os_context=False,
            suggested_route="/orb",
            intent_category="agents",
        )

    if "care hub" in lower or "dashboard" in lower:
        return SurfaceRoutingDecision(
            recommended_surface="care_hub",
            reason="Care Hub is the OS command centre.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route="/care-hub",
            intent_category="care_hub",
        )

    if "governance" in lower and ("dashboard" in lower or "oversight review" in lower):
        return SurfaceRoutingDecision(
            recommended_surface="governance_dashboard",
            reason="Governance dashboards are OS surfaces.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route="/governance",
            intent_category="governance",
        )

    if "saved output" in lower:
        return SurfaceRoutingDecision(
            recommended_surface="saved_outputs",
            reason="Saved outputs are standalone artefacts.",
            allowed_in_standalone=True,
            requires_os_context=False,
            suggested_route="/orb",
            intent_category="saved_outputs",
        )

    return SurfaceRoutingDecision(
        recommended_surface="standalone_orb",
        reason="General questions and reflective practice are appropriate for standalone ORB.",
        allowed_in_standalone=True,
        requires_os_context=False,
        suggested_route="/orb",
        intent_category="general",
    )


def standalone_os_boundary_message(intent: str) -> str | None:
    """Return a user-facing boundary message when standalone must not proceed."""
    decision = route_intelligence_surface(intent)
    if decision.allowed_in_standalone:
        return None
    route_hint = decision.suggested_route or "/assistant/orb?mode=operational_summary"
    return (
        f"This needs permissioned IndiCare OS context. Use OS ORB ({route_hint}). "
        f"{decision.safety_notice or ''}"
    ).strip()


def operational_orb_mode_hint(intent: str) -> str | None:
    """Map intent text to operational ORB mode query parameter."""
    decision = route_intelligence_surface(intent)
    route = decision.suggested_route or ""
    if "mode=" in route:
        return route.split("mode=", 1)[-1].split("&", 1)[0]
    if decision.intent_category == "child_live_context":
        return "child_journey_summary"
    if decision.intent_category == "ofsted_live_evidence":
        return "ofsted_evidence_review"
    if decision.intent_category == "manager_oversight":
        return "manager_daily_brief"
    return None


class IndicareIntelligenceSurfaceRouterService:
    def route(
        self,
        intent: str,
        *,
        has_document_upload: bool = False,
        mode: str | None = None,
    ) -> SurfaceRoutingDecision:
        return route_intelligence_surface(
            intent,
            has_document_upload=has_document_upload,
            mode=mode,
        )

    def route_payload(
        self,
        intent: str,
        *,
        has_document_upload: bool = False,
        mode: str | None = None,
    ) -> dict[str, Any]:
        return self.route(
            intent,
            has_document_upload=has_document_upload,
            mode=mode,
        ).model_dump()


indicare_intelligence_surface_router = IndicareIntelligenceSurfaceRouterService()
