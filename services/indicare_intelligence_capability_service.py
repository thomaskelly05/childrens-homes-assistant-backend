from __future__ import annotations

from schemas.indicare_intelligence_capabilities import (
    IndicareIntelligenceCapability,
    IndicareIntelligenceCapabilityListResponse,
    IndicareIntelligenceCapabilitySummary,
)

_STANDALONE_BOUNDARY = (
    "Standalone ORB must not call /api/os/*, /os/*, Care Hub, or live record services."
)


def _cap(
    *,
    id: str,
    title: str,
    description: str,
    category: str,
    status: str,
    surface: str,
    routes: list[str] | None = None,
    files: list[str] | None = None,
    risks: list[str] | None = None,
    next_steps: list[str] | None = None,
    safety_notes: list[str] | None = None,
) -> IndicareIntelligenceCapability:
    return IndicareIntelligenceCapability(
        id=id,
        title=title,
        description=description,
        category=category,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        surface=surface,  # type: ignore[arg-type]
        routes=routes or [],
        files=files or [],
        risks=risks or [],
        next_steps=next_steps or [],
        safety_notes=safety_notes or [],
    )


def build_indicare_intelligence_capabilities() -> list[IndicareIntelligenceCapability]:
    return [
        _cap(
            id="core_chat",
            title="Core chat",
            description="ChatGPT-style multi-turn chat with modes, history and citations.",
            category="core_chat",
            status="built",
            surface="standalone_orb",
            routes=["/orb", "/orb/standalone/conversation", "/orb/standalone/config"],
            files=[
                "frontend-next/components/orb-standalone/orb-care-companion.tsx",
                "routers/orb_standalone_routes.py",
                "services/orb_general_assistant_service.py",
            ],
            safety_notes=[_STANDALONE_BOUNDARY],
        ),
        _cap(
            id="voice_companion",
            title="Voice / Hey ORB",
            description="Speech input, wake phrase, continuous conversation and voice replies.",
            category="voice",
            status="built",
            surface="standalone_orb",
            routes=["/orb"],
            files=[
                "frontend-next/components/orb-standalone/use-standalone-orb-voice.ts",
                "frontend-next/components/orb-standalone/orb-glow.tsx",
            ],
            next_steps=["Expand offline voice caching for poor connectivity homes."],
        ),
        _cap(
            id="vision_images",
            title="Vision / image upload",
            description="Paste, drop and attach images for multimodal answers.",
            category="vision",
            status="partial",
            surface="standalone_orb",
            routes=["/orb/standalone/conversation"],
            files=["frontend-next/components/orb-standalone/orb-standalone-composer.tsx"],
            next_steps=["Camera capture button on mobile", "Permissions readiness panel"],
            risks=["Image content must not be written to OS records from standalone."],
        ),
        _cap(
            id="file_upload_documents",
            title="Document upload & understanding",
            description="Upload, analyse and compare policies in standalone workspace.",
            category="file_upload",
            status="built",
            surface="standalone_orb",
            routes=[
                "/orb/standalone/documents/upload",
                "/orb/standalone/documents/analyse",
            ],
            files=[
                "routers/orb_document_routes.py",
                "services/orb_document_understanding_service.py",
                "frontend-next/components/orb-standalone/orb-document-panel.tsx",
            ],
        ),
        _cap(
            id="local_memory",
            title="Local workspace memory",
            description="Browser-local chats, projects and profiles — not OS memory.",
            category="memory",
            status="built",
            surface="standalone_orb",
            routes=["/orb"],
            files=["frontend-next/lib/orb/standalone-local-store.ts"],
            safety_notes=[
                "Standalone ORB remembers only what you save locally or add to this standalone workspace.",
                "It does not access IndiCare OS records.",
            ],
        ),
        _cap(
            id="projects",
            title="Projects",
            description="Organise chats into standalone projects.",
            category="projects",
            status="built",
            surface="standalone_orb",
            files=["frontend-next/lib/orb/standalone-local-store.ts"],
        ),
        _cap(
            id="profiles_context",
            title="Profiles (user-provided context)",
            description="Attach user-provided profile context — not live child OS profiles.",
            category="profiles",
            status="built",
            surface="standalone_orb",
            safety_notes=["Profiles are user-provided context only; not OS young person records."],
        ),
        _cap(
            id="tools_menu",
            title="IndiCare Tools menu",
            description="Grouped launcher for standalone tools and locked OS tool cards.",
            category="tools",
            status="built",
            surface="standalone_orb",
            files=["frontend-next/components/orb-standalone/orb-tools-panel.tsx"],
        ),
        _cap(
            id="agents",
            title="Agents",
            description="Standalone agent orchestration for research and analysis tasks.",
            category="agents",
            status="built",
            surface="standalone_orb",
            routes=["/orb/standalone/agents", "/orb/standalone/agents/run"],
            files=[
                "routers/orb_agent_routes.py",
                "services/orb_agent_orchestrator_service.py",
            ],
        ),
        _cap(
            id="deep_research",
            title="Deep Research",
            description="Multi-step research agent with citations.",
            category="deep_research",
            status="built",
            surface="standalone_orb",
            routes=["/orb/standalone/agents/deep-research"],
            files=["services/orb_deep_research_service.py"],
        ),
        _cap(
            id="citations",
            title="Citations & source basis",
            description="Structured sources and citation blocks on answers.",
            category="citations",
            status="built",
            surface="standalone_orb",
            files=["services/orb_citation_service.py", "services/orb_standalone_sources.py"],
        ),
        _cap(
            id="knowledge_library",
            title="Knowledge Library",
            description="Ingest, search and govern standalone knowledge sources with RAG.",
            category="knowledge_library",
            status="built",
            surface="standalone_orb",
            routes=[
                "/orb/standalone/knowledge/sources",
                "/orb/standalone/knowledge/search",
                "/orb/standalone/knowledge/ingest",
            ],
            files=[
                "routers/orb_knowledge_routes.py",
                "services/orb_knowledge_retrieval_service.py",
            ],
        ),
        _cap(
            id="saved_outputs",
            title="Saved Outputs",
            description="Persist standalone intelligence artefacts server-side.",
            category="saved_outputs",
            status="built",
            surface="standalone_orb",
            routes=["/orb/standalone/outputs"],
            files=[
                "routers/orb_saved_output_routes.py",
                "services/orb_saved_output_service.py",
            ],
        ),
        _cap(
            id="model_router",
            title="Provider-agnostic model router",
            description="Routes requests across configured AI providers.",
            category="tools",
            status="built",
            surface="shared",
            routes=["/orb/standalone/model-router/health"],
            files=["services/ai_model_router_service.py"],
            safety_notes=["Router health exposes provider availability only — no secrets."],
        ),
        _cap(
            id="evaluation",
            title="Evaluation",
            description="Standalone evaluation health and quality checks.",
            category="tools",
            status="partial",
            surface="standalone_orb",
            routes=["/orb/standalone/evaluation/health"],
            files=["routers/orb_evaluation_routes.py"],
        ),
        _cap(
            id="staff_profiles_os",
            title="Staff profiles (live)",
            description="Workforce profiles and live staff intelligence in IndiCare OS.",
            category="staff_profiles",
            status="planned",
            surface="indicare_os",
            routes=["/staff", "/assistant/orb"],
            files=["routers/os_workforce_routes.py"],
            safety_notes=["Route staff live questions to /assistant/orb — not standalone /orb."],
        ),
        _cap(
            id="child_profiles_os",
            title="Child / young person profiles (live)",
            description="Live chronology and placement context in OS.",
            category="child_profiles",
            status="planned",
            surface="indicare_os",
            routes=["/young-people", "/assistant/orb"],
            files=["routers/os_young_person_routes.py"],
            safety_notes=["Child chronology requires permissioned OS context — standalone must refuse."],
        ),
        _cap(
            id="safeguarding_reflection",
            title="Safeguarding reflection",
            description="Standalone safeguarding modes and escalation reminders.",
            category="safeguarding",
            status="built",
            surface="standalone_orb",
            risks=["Must not make threshold decisions or replace emergency procedures."],
        ),
        _cap(
            id="ofsted_lens",
            title="Ofsted / SCCIF lens",
            description="Regulatory framing without predicting grades.",
            category="ofsted",
            status="built",
            surface="shared",
            routes=["/orb/standalone/conversation"],
            files=["data/orb_knowledge_seed/ofsted_sccif_overview.md"],
        ),
        _cap(
            id="therapeutic_practice",
            title="Therapeutic practice",
            description="Trauma-informed and behaviour-as-communication guidance.",
            category="therapeutic_practice",
            status="built",
            surface="standalone_orb",
            files=["data/orb_knowledge_seed/therapeutic_practice.md"],
        ),
        _cap(
            id="governance_os",
            title="Governance & oversight",
            description="Oversight reviews, action board and governance dashboards.",
            category="governance",
            status="partial",
            surface="indicare_os",
            routes=["/governance", "/actions"],
            next_steps=["Surface router links from standalone without API calls."],
        ),
        _cap(
            id="wellbeing",
            title="Staff wellbeing",
            description="Reflective wellbeing support; workforce intelligence in OS.",
            category="wellbeing",
            status="partial",
            surface="shared",
            next_steps=["Connect operational workforce intelligence when permissioned."],
        ),
        _cap(
            id="notifications",
            title="Notifications & alerts",
            description="Platform notification centre for OS events.",
            category="notifications",
            status="planned",
            surface="indicare_os",
        ),
        _cap(
            id="collaboration",
            title="Live collaboration",
            description="Screen share and multi-user sessions.",
            category="collaboration",
            status="planned",
            surface="shared",
        ),
        _cap(
            id="accessibility",
            title="Accessibility preferences",
            description="Dyslexia, sensory, contrast and motion controls (local first).",
            category="accessibility",
            status="partial",
            surface="standalone_orb",
            files=[
                "frontend-next/components/orb-standalone/orb-accessibility-panel.tsx",
                "frontend-next/lib/orb/accessibility/preferences.ts",
            ],
        ),
        _cap(
            id="mobile_offline",
            title="Mobile / offline",
            description="Responsive ORB with planned offline cache.",
            category="mobile",
            status="planned",
            surface="shared",
        ),
        _cap(
            id="security_rbac",
            title="Security / RBAC",
            description="Auth, MFA, permissions and audit trail across OS.",
            category="security",
            status="built",
            surface="indicare_os",
            files=["auth/current_user.py", "auth/permissions.py"],
            safety_notes=["Capability endpoints never expose secrets or tokens."],
        ),
        _cap(
            id="operational_os_context",
            title="Operational OS context",
            description="Intelligence Spine, Care Hub, Record and live evidence.",
            category="operational_os_context",
            status="built",
            surface="operational_orb",
            routes=["/assistant/orb", "/care-hub", "/record"],
            files=[
                "frontend-next/app/assistant/orb/operational-orb-page.tsx",
                "services/indicare_intelligence_spine_service.py",
            ],
            risks=["Standalone /orb must never call these services."],
            safety_notes=[_STANDALONE_BOUNDARY],
        ),
        _cap(
            id="intelligence_map",
            title="IndiCare Intelligence Map",
            description="Parity view of built vs planned capabilities.",
            category="tools",
            status="built",
            surface="standalone_orb",
            routes=["/orb/standalone/capabilities", "/orb/standalone/capabilities/summary"],
        ),
        _cap(
            id="surface_router",
            title="Intelligence surface router",
            description="Routes intents to correct product surface without fetching OS data.",
            category="tools",
            status="built",
            surface="shared",
            routes=["/orb/standalone/surface-route"],
            files=["services/indicare_intelligence_surface_router.py"],
        ),
    ]


class IndicareIntelligenceCapabilityService:
    def list_capabilities(self) -> IndicareIntelligenceCapabilityListResponse:
        capabilities = build_indicare_intelligence_capabilities()
        return IndicareIntelligenceCapabilityListResponse(capabilities=capabilities)

    def summarize(self) -> IndicareIntelligenceCapabilitySummary:
        capabilities = build_indicare_intelligence_capabilities()
        by_category: dict[str, int] = {}
        by_surface: dict[str, int] = {}
        built = partial = planned = blocked = 0
        standalone_safe = 0
        requires_os = 0
        for item in capabilities:
            by_category[item.category] = by_category.get(item.category, 0) + 1
            by_surface[item.surface] = by_surface.get(item.surface, 0) + 1
            if item.status == "built":
                built += 1
            elif item.status == "partial":
                partial += 1
            elif item.status == "planned":
                planned += 1
            elif item.status == "blocked":
                blocked += 1
            if item.surface in {"standalone_orb", "shared"} and item.category not in {
                "operational_os_context",
                "child_profiles",
                "staff_profiles",
            }:
                standalone_safe += 1
            if item.surface in {"indicare_os", "operational_orb"} or item.category in {
                "operational_os_context",
                "child_profiles",
                "staff_profiles",
            }:
                requires_os += 1
        return IndicareIntelligenceCapabilitySummary(
            total=len(capabilities),
            built=built,
            partial=partial,
            planned=planned,
            blocked=blocked,
            by_category=by_category,
            by_surface=by_surface,
            standalone_safe_count=standalone_safe,
            requires_os_context_count=requires_os,
        )


indicare_intelligence_capability_service = IndicareIntelligenceCapabilityService()
