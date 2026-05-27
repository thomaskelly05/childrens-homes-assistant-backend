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


# Hypothetical / practice questions — always answer in standalone with general guidance.
_GENERAL_PRACTICE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bwhat would (ofsted|an inspector|a reviewer)\b", re.I),
    re.compile(r"\bif ofsted looked at\b", re.I),
    re.compile(r"\bhow should (staff|we|i|a manager)\b.+\b(record|respond|respond to)\b", re.I),
    re.compile(r"\bhelp me understand\b", re.I),
    re.compile(r"\bwhat should a (manager|registered manager|ri|responsible individual)\b", re.I),
    re.compile(r"\bwhat would (a|an) (strong )?(registered manager|rm|dsl|ri)\b", re.I),
    re.compile(r"\bwhat does ofsted expect\b", re.I),
    re.compile(r"\bone child'?s chronology\b", re.I),
    re.compile(r"\ba young person\b", re.I),
    re.compile(r"\bscenario\b", re.I),
    re.compile(r"\bfor example\b", re.I),
    re.compile(r"\bin general\b", re.I),
    re.compile(r"\bgenerally\b", re.I),
)

# Only block when the user asks to inspect, summarise, retrieve, analyse or use live OS records.
_LIVE_RECORD_ACCESS_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\b(inspect|summarise|summarize|retrieve|pull up|fetch|analyse|analyze|review)\b.+\b(our|the|this)\b.+\b(care record|chronology|file|placement|records)\b",
        re.I,
    ),
    re.compile(
        r"\b(use|access|look at|read|open|show me)\b.+\b(this|our)\b.+\b(child|young person)'?s?\b.+\b(chronology|care record|file)\b",
        re.I,
    ),
    re.compile(r"\btell me about\b.+\b(child|young person)\b.+\b(in our home|on placement|in placement)\b", re.I),
    re.compile(
        r"\bwhat happened with\b.+\b(child|young person)\b.+\b(last week|yesterday|recently|today)\b",
        re.I,
    ),
    re.compile(r"\b(live|current)\b.+\b(record|evidence|placement|chronology)\b", re.I),
    re.compile(r"\bthis child'?s\b.+\b(chronology|care record|file|placement|records)\b", re.I),
    re.compile(r"\bopen\b.+\b(child|young person)\b.+\b(profile|file)\b", re.I),
    re.compile(r"\bour\b.+\b(live |current )?(records?|chronology|evidence|children'?s? data)\b", re.I),
    re.compile(r"\bfrom (the )?(system|indicare os|indicare)\b", re.I),
    re.compile(r"\bin (the )?os\b.+\b(record|chronology|file)\b", re.I),
)

_MANAGER_LIVE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bour\b.+\b(record quality|recording quality)\b", re.I),
    re.compile(r"\b(record quality|recording quality)\b.+\b(picture|dashboard|across the home)\b", re.I),
    re.compile(r"\bintelligence spine\b", re.I),
    re.compile(r"\bincident trend\b.+\b(across|in) (the |our )?home\b", re.I),
    re.compile(r"\bburnout pattern\b", re.I),
    re.compile(r"\bworkforce intelligence\b", re.I),
    re.compile(r"\bevidence graph\b", re.I),
    re.compile(r"\blive evidence\b.+\b(ofsted|inspection)\b", re.I),
    re.compile(r"\baction board\b", re.I),
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


def _is_general_practice_question(text: str) -> bool:
    return _matches_any(text, _GENERAL_PRACTICE_PATTERNS)


def requires_live_os_records(intent: str) -> bool:
    """True only when the user asks to use actual live IndiCare OS care records."""
    text = (intent or "").strip()
    if not text:
        return False
    if _is_general_practice_question(text):
        return False
    return _matches_any(text, _LIVE_RECORD_ACCESS_PATTERNS)


def _manager_operational_route(lower: str) -> str:
    """Suggest operational ORB mode for manager oversight intents."""
    if "care hub" in lower:
        return "/care-hub"
    if any(t in lower for t in ("record quality", "recording quality", "weak record")):
        return "/assistant/orb?mode=record_quality_review"
    if "ofsted" in lower or "inspection readiness" in lower or "inspection evidence" in lower:
        return "/assistant/orb?mode=ofsted_evidence_review"
    if any(t in lower for t in ("prioritise", "prioritize", "action board", "what actions")):
        return "/assistant/orb?mode=action_priority"
    if "safeguarding" in lower:
        return "/assistant/orb?mode=safeguarding_themes"
    if any(t in lower for t in ("staff support", "supervision", "workforce")):
        return "/assistant/orb?mode=staff_support"
    if any(t in lower for t in ("child journey", "handover")) and requires_live_os_records(lower):
        return "/assistant/orb?mode=child_journey_summary"
    if any(t in lower for t in ("attention today", "needs my attention")) and "our" in lower:
        return "/assistant/orb?mode=manager_daily_brief"
    return "/assistant/orb?mode=manager_daily_brief"


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

    if "live evidence" in lower and any(term in lower for term in ("ofsted", "inspection", "sccif")):
        return SurfaceRoutingDecision(
            recommended_surface="operational_orb",
            reason="Ofsted questions about your home's live evidence need OS inspection readiness.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route="/assistant/orb?mode=ofsted_evidence_review",
            intent_category="ofsted_live_evidence",
        )

    if requires_live_os_records(text):
        return SurfaceRoutingDecision(
            recommended_surface="operational_orb",
            reason="Inspecting or using live child records, chronology or placement data requires permissioned IndiCare OS.",
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
        "live" in lower or "our record" in lower or "workforce record" in lower
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

    if _matches_any(text, _MANAGER_LIVE_PATTERNS):
        surface: IntelligenceSurface = (
            "intelligence_spine"
            if "intelligence spine" in lower or "incident trend" in lower or "evidence graph" in lower
            else "operational_orb"
        )
        return SurfaceRoutingDecision(
            recommended_surface=surface,
            reason="Live manager dashboards, patterns and home evidence need Intelligence Spine or operational ORB.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route=_manager_operational_route(lower),
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
        if _is_general_practice_question(text):
            return SurfaceRoutingDecision(
                recommended_surface="standalone_orb",
                reason="General Ofsted expectation questions can be answered without live OS evidence.",
                allowed_in_standalone=True,
                requires_os_context=False,
                suggested_route="/orb",
                intent_category="ofsted_sources",
            )
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
        return SurfaceRoutingDecision(
            recommended_surface="agents",
            reason="Agents and deep research run in standalone orchestration.",
            allowed_in_standalone=True,
            requires_os_context=False,
            suggested_route="/orb",
            intent_category="agents",
        )

    if "care hub" in lower or ("dashboard" in lower and "our" in lower):
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

    if any(
        phrase in lower
        for phrase in (
            "saved briefing",
            "previous operational output",
            "manager review artefact",
            "saved action plan",
            "operational output",
            "operational briefing",
        )
    ):
        return SurfaceRoutingDecision(
            recommended_surface="operational_orb",
            reason="Saved operational briefings and OS-linked outputs live in operational ORB.",
            allowed_in_standalone=False,
            requires_os_context=True,
            suggested_route="/assistant/orb?panel=outputs",
            intent_category="operational_outputs",
            safety_notice="Standalone saved outputs are not used for OS operational data.",
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


def standalone_guidance_boundary_prefix(intent: str) -> str | None:
    """Short prefix when standalone answers generally without live records."""
    if requires_live_os_records(intent):
        return None
    text = (intent or "").lower()
    if any(
        term in text
        for term in (
            "chronology",
            "young person",
            "child",
            "ofsted",
            "record",
            "therapeutic",
            "allegation",
            "missing",
            "restraint",
        )
    ):
        return (
            "I cannot see the actual live child record in IndiCare OS, but generally — "
        )
    return None


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
        route = decision.suggested_route or ""
        if "mode=" in route:
            return route.split("mode=", 1)[-1].split("&", 1)[0]
        return "manager_daily_brief"
    if decision.intent_category == "staff_live_context":
        return "staff_support"
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
