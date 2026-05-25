from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
ORB_PAGE = REPO_ROOT / "frontend-next" / "app" / "orb" / "page.tsx"
ORB_COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
ORB_SIDEBAR = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-sidebar.tsx"
ORB_COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"
ORB_LOCAL_STORE = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-local-store.ts"
ORB_GLOW = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-glow.tsx"
ORB_VOICE_HOOK = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "use-standalone-orb-voice.ts"
STANDALONE_CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
GLOBALS_CSS = REPO_ROOT / "frontend-next" / "app" / "globals.css"
ASSISTANT_ORB_PAGE = REPO_ROOT / "frontend-next" / "app" / "assistant" / "orb" / "page.tsx"
ASSISTANT_ORB_IMPL = REPO_ROOT / "frontend-next" / "app" / "assistant" / "orb" / "operational-orb-page.tsx"
ASSISTANT_PAGE = REPO_ROOT / "frontend-next" / "app" / "assistant" / "page.tsx"
STANDALONE_ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"
PRODUCT_MAP = REPO_ROOT / "routers" / "assistant_product_map_routes.py"

FORBIDDEN_ORB_PAGE_MARKERS = [
    "getServerOsYoungPeople",
    "OrbConversationExperience",
    "LiveDataStatus",
    "/api/orb/conversation",
    "/orb/conversation",
    "Canonical ORB Runtime",
    "One operational cognition system",
    "Operational cognition",
    "CareHub",
]

REQUIRED_STANDALONE_MARKERS = [
    "/orb/standalone/conversation",
    "/orb/standalone/config",
    "/orb/standalone/model-router/health",
    "/orb/standalone/documents/health",
    "/orb/standalone/evaluation/health",
    "/orb/standalone/agents/health",
    "/orb/standalone/agents",
    "/orb/standalone/outputs/health",
    "/orb/standalone/outputs",
    "/orb/standalone/capabilities",
    "/orb/standalone/capabilities/summary",
    "/orb/standalone/surface-route",
]

INTELLIGENCE_PRODUCT_LAYER_MARKERS = [
    "OrbToolsPanel",
    "IndiCare Tools",
    "OrbMemoryPanel",
    "Standalone ORB remembers only what you save locally",
    "OrbStandaloneAccessibilityPanel",
    "orb-dyslexia-mode",
    "standaloneOsBoundaryReply",
    "permissioned IndiCare OS context",
]

STANDALONE_UI_MARKERS = [
    "ORB Care Companion",
    "Standalone residential care assistant",
    "No OS records",
]

CHATGPT_STYLE_MARKERS = [
    "New chat",
    "Search chats",
    "Projects",
    "Recent chats",
    "How can I help today?",
    "More examples",
    "Standalone residential care assistant",
    "No OS records accessed",
    "orb-chat-layout",
    "orb-chat-sidebar",
    "orb-chat-main",
    "orb-companion-float",
    "orb-voice-dock",
]

ORB_COMPANION_VOICE_MARKERS = [
    "orb-companion-float",
    "orb-companion-fab",
    "Say Hey ORB",
    "Tap to speak",
    "Wake phrase",
    "Continuous conversation",
    "Voice replies",
    "Stop speaking",
    "British female",
    "Actual voice:",
    "Voice picker",
]

IMAGE_UPLOAD_MARKERS = [
    "Plus",
    "onPaste",
    "onDrop",
    "addImageFiles",
    "images:",
    "data_url",
    "imageDataUrls",
]

PROJECTS_MARKERS = [
    "createStandaloneProject",
    "standalone-local-store",
    "Create project",
    "activeProjectId",
]

PROFILES_MARKERS = [
    "createStandaloneProfile",
    "buildProfileContextBlock",
    "Attach profile",
    "user-provided context only",
    "does not access IndiCare OS records",
]

VOICE_PICKER_MARKERS = [
    "Voice picker",
    "selectedVoiceUri",
    "splitTextForSpeechChunks",
    "Actual voice:",
    "British female",
    "Test voice",
]

CINEMATIC_VOICE_MARKERS = [
    "orb-glow",
    "use-standalone-orb-voice",
    "speechSynthesis",
    "webkitSpeechRecognition",
    "Voice replies",
    "autoSend",
    "Stop speaking",
    "British female",
]

VOICE_HOOK_MARKERS = [
    "speechSynthesis",
    "webkitSpeechRecognition",
    "SpeechRecognition",
    "en-GB",
    "pickBritishFemaleVoice",
    "autoSend",
    "britishFemalePreference",
]

RELIABILITY_MARKERS = [
    "STANDALONE_REQUEST_TIMEOUT_MS",
    "setPending(false)",
    "sendInFlightRef",
    "submitGuardRef",
    "Retry",
    "retryPayload",
    "standaloneOrbErrorMessage",
    "ORB could not finish that response",
]

MEDIA_STREAM_CLEANUP_MARKERS = [
    "mediaStreamRef",
    "getTracks",
    "track.stop",
    "stopMediaStream",
    "endVoiceSession",
]

BROWSER_VOICE_STATUS_MARKERS = [
    "speechOutputAvailable",
    "speechInputAvailable",
    "wakePhraseAvailable",
    "continuousConversationAvailable",
    "Voice replies may work. Microphone dictation may require Chrome or Edge.",
    "Browser voice support",
]

SPEECH_RELIABILITY_MARKERS = [
    "splitTextForSpeechChunks",
    "speakGenerationRef",
    "speakChunksRef",
    "Test voice",
    "testSelectedVoice",
]

WAKE_WORD_MARKERS = [
    "Hey ORB",
    "wakePhrase",
    "wake_listening",
    "wake_detected",
    "transcriptContainsWakePhrase",
    "WAKE_PHRASE_TEXT",
]

CONTINUOUS_CONVERSATION_MARKERS = [
    "continuousConversation",
    "continuous_listening",
    "startContinuousListening",
    "registerAfterSpeakListener",
    "Pause conversation",
    "End voice session",
]

INTERRUPT_MARKERS = [
    "interruptForListen",
    "cancelSpeaking",
    "interrupted",
    "barge-in",
    "Stop speaking",
]

ANSWER_STYLE_MARKERS = [
    "voice_concise",
    "Voice concise",
    "answerStyle",
    "Balanced",
    "Detailed",
]

MEMORY_MARKERS = [
    "trimConversationHistory",
    "MAX_HISTORY_TURNS",
    "New chat",
    "standalone-local-store",
]

SPECIALIST_PROMPT_MARKERS = [
    "residential children",
    "Ofsted",
    "SCCIF",
    "Quality Standards",
    "safeguarding",
    "IndiCare OS records",
    "ChatGPT-class",
    "general knowledge",
]

DEDUPE_AND_SOURCES_MARKERS = [
    "dedupeOrbMessages",
    "repairOrbWorkspace",
    "visibleMessages",
    "Sources / basis",
    "SourcesBasis",
    "lastSubmitRef",
    "SUBMIT_GUARD_MS",
    "product_context",
    "STANDALONE_ORB_PRODUCT_KNOWLEDGE",
    "build_standalone_sources",
    "orb_knowledge_retrieval_service",
    "orb_citation_service",
    "live_retrieved",
    "Retrieved from ORB Knowledge Library",
    "document_chunk",
]

AGENT_FRAMEWORK_MARKERS = [
    "Agents",
    "orb-agent-panel",
    "Deep Research",
    "Run agent",
    "fetchStandaloneOrbAgents",
    "runStandaloneOrbAgent",
    "runStandaloneOrbDeepResearch",
    "/orb/standalone/agents/run",
    "/orb/standalone/agents/deep-research",
]

AGENT_BACKEND_MARKERS = [
    "orb_agent_registry_service",
    "orb_agent_orchestrator_service",
    "orb_deep_research_service",
    "routers.orb_agent_routes",
]

KNOWLEDGE_LIBRARY_MARKERS = [
    "Knowledge Library",
    "Add source",
    "orb-knowledge-library",
    "fetchOrbKnowledgeSources",
    "ingestOrbKnowledgeText",
    "/orb/standalone/knowledge/sources",
    "/orb/standalone/knowledge/ingest",
    "/orb/standalone/knowledge/search",
]

ORB_DOCUMENT_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-document-panel.tsx"

DOCUMENT_UNDERSTANDING_MARKERS = [
    "Documents",
    "orb-document-panel",
    "Analyse document",
    "Add to Knowledge Library",
    "orb-action-plan",
    "Create action plan",
    "/orb/standalone/documents/analyse",
    "/orb/standalone/documents/upload",
    "analyseOrbStandaloneDocument",
    "uploadOrbStandaloneDocument",
]

ORB_SAVED_OUTPUTS_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-saved-outputs-panel.tsx"

SAVED_OUTPUTS_MARKERS = [
    "Saved outputs",
    "Save to project",
    "Reuse in chat",
    "Export markdown",
    "standalone ORB artefacts",
    "orb-saved-outputs-panel",
    "listOrbSavedOutputs",
    "createOrbSavedOutput",
    "/orb/standalone/outputs",
]

OS_ORB_LINK_FILES = [
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "app-shell.tsx",
    REPO_ROOT / "frontend-next" / "lib" / "navigation" / "operational-navigation.ts",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "operational" / "contextual-orb-panel.tsx",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "operational" / "orb-companion-panel.tsx",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "operational" / "operational-quick-actions.tsx",
    REPO_ROOT / "frontend-next" / "components" / "command-centre" / "care-hub-routes.ts",
    REPO_ROOT / "frontend-next" / "components" / "command-centre" / "care-hub-attention-strip.tsx",
    REPO_ROOT / "frontend-next" / "components" / "command-centre" / "care-hub-recording-section.tsx",
    REPO_ROOT / "frontend-next" / "components" / "command-centre" / "care-hub-start-hero.tsx",
    REPO_ROOT / "frontend-next" / "components" / "command-centre" / "intelligence-actions-card.tsx",
]

RECORD_HUB = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-hub.ts"
RECORD_HUB_COMPONENT = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "record-hub.tsx"
RECORD_WORKSPACE_ORB_FILES = [
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-orb-rail.tsx",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-workspace.tsx",
    REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-quality-coach.ts",
]

FORBIDDEN_RECORD_ORB_QUERY_KEYS = [
    "young_person_id=",
    "child_id=",
    "home_id=",
    "staff_id=",
    "record_id=",
    "chronology_id=",
]

FORBIDDEN_STANDALONE_GOVERNANCE_MARKERS = [
    "/intelligence/governance/ai",
    "/intelligence/governance",
    "fetchAiGovernanceDashboard",
    "ai-governance.ts",
]

OPERATIONAL_ORB_MARKERS = [
    "OrbConversationExperience",
    "Operational cognition",
]

OPERATIONAL_OUTPUTS_MARKERS = [
    "OrbOperationalOutputsPanel",
    "/api/assistant/orb/outputs",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_orb_page_has_no_operational_coupling():
    sources = _read(ORB_PAGE) + _read(ORB_COMPANION)
    for marker in FORBIDDEN_ORB_PAGE_MARKERS:
        assert marker not in sources, f"/orb must not reference operational marker: {marker}"


def test_orb_page_uses_standalone_contract():
    sources = _read(ORB_PAGE) + _read(ORB_COMPANION) + _read(STANDALONE_CLIENT)
    for marker in REQUIRED_STANDALONE_MARKERS:
        assert marker in sources, f"/orb standalone surface must reference {marker}"
    for marker in STANDALONE_UI_MARKERS:
        assert marker in sources, f"/orb standalone UI must include {marker}"


def test_orb_intelligence_product_layer_markers():
    memory_panel = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-memory-panel.tsx"
    boundary_lib = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-os-boundary.ts"
    sources = _read(ORB_COMPANION) + _read(STANDALONE_CLIENT) + _read(GLOBALS_CSS) + _read(memory_panel) + _read(boundary_lib)
    for marker in INTELLIGENCE_PRODUCT_LAYER_MARKERS:
        assert marker in sources, f"intelligence product layer marker missing: {marker}"


def test_orb_page_chatgpt_style_layout():
    sources = (
        _read(ORB_PAGE)
        + _read(ORB_COMPANION)
        + _read(ORB_SIDEBAR)
        + _read(ORB_COMPOSER)
        + _read(GLOBALS_CSS)
    )
    for marker in CHATGPT_STYLE_MARKERS:
        assert marker in sources, f"/orb ChatGPT-style layout must include {marker}"
    assert "AppShell" not in sources
    assert "orb-voice-dock-column" not in sources, "/orb must not use a fixed full-height right strip"


def test_orb_compact_companion_voice_markers():
    sources = _read(ORB_COMPANION) + _read(GLOBALS_CSS) + _read(ORB_COMPOSER) + _read(ORB_VOICE_HOOK)
    for marker in ORB_COMPANION_VOICE_MARKERS:
        assert marker in sources, f"/orb compact companion must include {marker}"


def test_standalone_orb_image_upload_support():
    sources = _read(ORB_COMPANION) + _read(ORB_COMPOSER) + _read(STANDALONE_CLIENT)
    routes = _read(STANDALONE_ROUTES)
    for marker in IMAGE_UPLOAD_MARKERS:
        assert marker in sources or marker in routes, f"image upload marker missing: {marker}"


def test_standalone_orb_projects_local_storage():
    sources = _read(ORB_SIDEBAR) + _read(ORB_LOCAL_STORE) + _read(ORB_COMPANION)
    for marker in PROJECTS_MARKERS:
        assert marker in sources, f"projects marker missing: {marker}"


def test_standalone_orb_profiles_local_storage():
    sources = _read(ORB_SIDEBAR) + _read(ORB_LOCAL_STORE) + _read(ORB_COMPANION)
    for marker in PROFILES_MARKERS:
        assert marker in sources, f"profiles marker missing: {marker}"


def test_standalone_orb_voice_picker_and_chunked_speech():
    sources = _read(ORB_VOICE_HOOK) + _read(ORB_COMPANION)
    for marker in VOICE_PICKER_MARKERS:
        assert marker in sources, f"voice picker/chunk marker missing: {marker}"


def test_standalone_orb_cinematic_voice_components():
    companion = _read(ORB_COMPANION) + _read(ORB_COMPOSER)
    glow = _read(ORB_GLOW)
    hook = _read(ORB_VOICE_HOOK)
    for marker in CINEMATIC_VOICE_MARKERS:
        assert marker in companion or marker in glow or marker in hook, (
            f"standalone cinematic voice marker missing: {marker}"
        )


def test_standalone_orb_voice_hook_uses_browser_speech_apis():
    text = _read(ORB_VOICE_HOOK)
    for marker in VOICE_HOOK_MARKERS:
        assert marker in text, f"voice hook must include {marker}"


def test_standalone_orb_send_flow_has_timeout_and_retry():
    sources = _read(ORB_COMPANION) + _read(STANDALONE_CLIENT)
    for marker in RELIABILITY_MARKERS:
        assert marker in sources, f"standalone send reliability marker missing: {marker}"


def test_standalone_orb_media_stream_cleanup():
    text = _read(ORB_VOICE_HOOK)
    for marker in MEDIA_STREAM_CLEANUP_MARKERS:
        assert marker in text, f"media stream cleanup marker missing: {marker}"


def test_standalone_orb_browser_voice_status_messaging():
    sources = _read(ORB_VOICE_HOOK) + _read(ORB_COMPANION)
    for marker in BROWSER_VOICE_STATUS_MARKERS:
        assert marker in sources, f"browser voice status marker missing: {marker}"


def test_standalone_orb_speech_reliability_and_test_voice():
    sources = _read(ORB_VOICE_HOOK) + _read(ORB_COMPANION)
    for marker in SPEECH_RELIABILITY_MARKERS:
        assert marker in sources, f"speech reliability marker missing: {marker}"


def test_standalone_orb_wake_phrase_implementation():
    hook = _read(ORB_VOICE_HOOK)
    companion = _read(ORB_COMPANION)
    glow = _read(ORB_GLOW)
    for marker in WAKE_WORD_MARKERS:
        assert marker in hook or marker in companion, f"wake phrase marker missing: {marker}"
    for state in ("wake_listening", "wake_detected"):
        assert state in glow, f"orb-glow must support state {state}"


def test_standalone_orb_continuous_conversation_implementation():
    hook = _read(ORB_VOICE_HOOK)
    companion = _read(ORB_COMPANION)
    for marker in CONTINUOUS_CONVERSATION_MARKERS:
        assert marker in hook or marker in companion, f"continuous conversation marker missing: {marker}"
    assert "continuous_listening" in _read(ORB_GLOW)


def test_standalone_orb_interruptibility():
    sources = _read(ORB_COMPANION) + _read(ORB_COMPOSER) + _read(ORB_VOICE_HOOK) + _read(ORB_GLOW)
    for marker in INTERRUPT_MARKERS:
        assert marker in sources, f"interruptibility marker missing: {marker}"


def test_standalone_orb_does_not_import_workforce_context():
    sources = _read(ORB_PAGE) + _read(STANDALONE_CLIENT) + _read(ORB_COMPANION)
    for marker in ("workforce-context", "/api/workforce/context", "shift_id", "staff_id"):
        assert marker not in sources, f"standalone ORB must not reference workforce OS context: {marker}"


def test_standalone_orb_only_uses_standalone_api_paths():
    sources = _read(ORB_COMPANION) + _read(STANDALONE_CLIENT)
    forbidden = [
        "/api/orb/conversation",
        "/orb/conversation",
        "/api/os/",
        "/os/",
        "/api/assistant/orb/outputs",
        "/assistant/orb/outputs",
    ]
    for marker in forbidden:
        assert marker not in sources, f"standalone ORB must not use {marker}"
    assert "/orb/standalone/conversation" in sources
    assert "/orb/standalone/outputs" in sources


def test_standalone_orb_answer_style_controls():
    sources = _read(ORB_COMPANION) + _read(ORB_VOICE_HOOK) + _read(STANDALONE_CLIENT)
    for marker in ANSWER_STYLE_MARKERS:
        assert marker in sources, f"answer style marker missing: {marker}"


def test_standalone_orb_conversation_memory():
    companion = _read(ORB_COMPANION) + _read(ORB_COMPOSER) + _read(ORB_LOCAL_STORE)
    hook = _read(ORB_VOICE_HOOK)
    routes = _read(STANDALONE_ROUTES)
    for marker in MEMORY_MARKERS:
        assert marker in companion or marker in hook or marker in routes, (
            f"conversation memory marker missing: {marker}"
        )


def test_standalone_orb_specialist_prompt():
    routes = _read(STANDALONE_ROUTES)
    service = _read(REPO_ROOT / "services" / "orb_general_assistant_service.py")
    for marker in SPECIALIST_PROMPT_MARKERS:
        assert marker in routes or marker in service, f"specialist prompt marker missing: {marker}"


def test_standalone_orb_dedupe_and_sources_markers():
    sources = (
        _read(ORB_LOCAL_STORE)
        + _read(ORB_COMPANION)
        + _read(STANDALONE_ROUTES)
        + _read(REPO_ROOT / "services" / "orb_standalone_sources.py")
    )
    for marker in DEDUPE_AND_SOURCES_MARKERS:
        assert marker in sources, f"dedupe/sources marker missing: {marker}"


def test_standalone_orb_knowledge_library_ui():
    sources = (
        _read(ORB_COMPANION)
        + _read(ORB_SIDEBAR)
        + _read(STANDALONE_CLIENT)
        + _read(REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-knowledge-library.tsx")
    )
    forbidden = ["/api/os/", "/os/", "/api/orb/conversation", "getServerOsYoungPeople"]
    for marker in forbidden:
        assert marker not in sources, f"knowledge UI must not use {marker}"
    for marker in KNOWLEDGE_LIBRARY_MARKERS:
        assert marker in sources, f"knowledge library marker missing: {marker}"


def test_standalone_document_understanding_ui_markers():
    companion = _read(ORB_COMPANION)
    client = _read(STANDALONE_CLIENT)
    panel = _read(ORB_DOCUMENT_PANEL)
    composer = _read(ORB_COMPOSER)
    sources = companion + client + panel + composer
    for marker in DOCUMENT_UNDERSTANDING_MARKERS:
        assert marker in sources, f"document understanding marker missing: {marker}"
    assert "/api/os/" not in client
    assert "/os/" not in client.replace("/orb/standalone", "")


def test_standalone_saved_outputs_ui_markers():
    sources = (
        _read(ORB_COMPANION)
        + _read(ORB_SIDEBAR)
        + _read(STANDALONE_CLIENT)
        + _read(ORB_SAVED_OUTPUTS_PANEL)
        + _read(REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-output-save-actions.tsx")
    )
    forbidden = ["/api/os/", "/os/", "/api/orb/conversation", "child_id", "record_id"]
    for marker in forbidden:
        assert marker not in sources.replace("/orb/standalone", ""), f"saved outputs UI must not use {marker}"
    for marker in SAVED_OUTPUTS_MARKERS:
        assert marker in sources, f"saved outputs marker missing: {marker}"


def test_standalone_orb_glow_component_exists():
    text = _read(ORB_GLOW)
    assert "OrbGlow" in text
    for state in (
        "safeguarding",
        "listening",
        "transcript_ready",
        "thinking",
        "speaking",
        "wake_listening",
        "wake_detected",
        "continuous_listening",
        "interrupted",
    ):
        assert state in text, f"orb-glow must support state {state}"


def test_standalone_orb_cinematic_styles_in_globals():
    text = _read(GLOBALS_CSS)
    for marker in (
        "orb-cinematic-scene",
        "orb-chat-layout",
        "orb-standalone-listen-ring",
        "orb-standalone-halo",
        "orb-standalone-wake-pulse",
        "orb-standalone-interrupt-ring",
    ):
        assert marker in text, f"globals.css must define cinematic ORB style {marker}"


def test_standalone_orb_glow_supports_dock_sizes():
    text = _read(ORB_GLOW)
    for marker in ("hero", "dock", "compact", "OrbGlowSize"):
        assert marker in text, f"orb-glow must support size variant {marker}"


def test_assistant_orb_page_does_not_redirect_to_standalone_orb():
    text = _read(ASSISTANT_ORB_PAGE) + _read(ASSISTANT_ORB_IMPL)
    assert "redirect('/orb')" not in text
    assert 'redirect("/orb")' not in text


def test_assistant_orb_page_keeps_operational_markers():
    text = _read(ASSISTANT_ORB_PAGE) + _read(ASSISTANT_ORB_IMPL)
    for marker in OPERATIONAL_ORB_MARKERS:
        assert marker in text, f"/assistant/orb must keep operational marker: {marker}"
    assert "LiveDataStatus" in text or "getServerOsYoungPeople" in text


def test_assistant_orb_operational_outputs_wired():
    conversation = _read(
        REPO_ROOT / "frontend-next" / "components" / "orb-operational" / "orb-conversation-experience.tsx"
    )
    client = _read(REPO_ROOT / "frontend-next" / "lib" / "orb" / "operational-client.ts")
    for marker in OPERATIONAL_OUTPUTS_MARKERS:
        assert marker in conversation or marker in client, (
            f"operational outputs marker missing: {marker}"
        )


def test_assistant_page_does_not_redirect_to_orb():
    text = _read(ASSISTANT_PAGE)
    assert "redirect('/orb')" not in text
    assert 'redirect("/orb")' not in text


def test_os_navigation_orb_links_target_assistant_orb():
    for path in OS_ORB_LINK_FILES:
        text = _read(path)
        for href in re.findall(r'href=["\']([^"\']+)["\']', text):
            if "/orb" not in href:
                continue
            assert href.startswith("/assistant/orb"), (
                f"{path.name} must use /assistant/orb for OS ORB links, found {href}"
            )


def _orb_url_builder_sections(text: str) -> str:
    """Extract only standalone /orb URL builders, not workflow or OS links."""
    chunks: list[str] = []
    for marker in ("export function recordOrbPromptHref", "export function recordCardOrbHref"):
        if marker not in text:
            continue
        section = text.split(marker, 1)[1]
        end = section.find("\nexport function ")
        chunks.append(section if end == -1 else section[:end])
    return "\n".join(chunks)


def test_record_orb_prompts_use_standalone_orb_without_operational_ids():
    for path in (RECORD_HUB, RECORD_HUB_COMPONENT):
        text = _read(path)
        combined = _orb_url_builder_sections(text)
        assert "/orb?" in combined or "recordOrbPromptHref" in text, f"{path.name} should define standalone /orb links"
        for key in FORBIDDEN_RECORD_ORB_QUERY_KEYS:
            assert key not in combined, f"{path.name} must not pass {key} into standalone /orb URLs"

    workspace_sources = "\n".join(_read(path) for path in RECORD_WORKSPACE_ORB_FILES)
    assert "/orb?context=recording" in workspace_sources
    for key in FORBIDDEN_RECORD_ORB_QUERY_KEYS:
        assert key not in workspace_sources, f"recording workspace must not pass {key} into standalone /orb URLs"


def test_standalone_orb_does_not_call_ai_governance_routes():
    sources = _read(STANDALONE_CLIENT) + _read(ORB_COMPANION) + _read(ORB_PAGE)
    for marker in FORBIDDEN_STANDALONE_GOVERNANCE_MARKERS:
        assert marker not in sources, f"standalone /orb must not reference governance route: {marker}"


def test_ai_governance_dashboard_is_os_leadership_surface():
    page = REPO_ROOT / "frontend-next" / "app" / "intelligence" / "governance" / "ai" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "fetchAiGovernanceDashboard" in text
    assert "/intelligence/governance/ai" not in _read(STANDALONE_CLIENT)


def test_orb_standalone_backend_contract_flags():
    text = _read(STANDALONE_ROUTES)
    for flag in ("os_linked", "care_record_access", "chronology_access", "dashboard_access", "direct_writes"):
        assert f'"{flag}": False' in text or f'"{flag}": false' in text


def test_orb_standalone_backend_conversation_hardening():
    routes = _read(STANDALONE_ROUTES)
    service = _read(REPO_ROOT / "services" / "orb_general_assistant_service.py")
    assert "standalone_orb_conversation" in routes
    assert "_standalone_conversation_response" in routes
    assert "STANDALONE_LLM_TIMEOUT_SECONDS" in service
    assert "asyncio.wait_for" in service
    assert '"answer"' in routes
    assert '"citations"' in routes
    assert "orb_knowledge_retrieval_service" in routes


def test_orb_agents_ui_markers():
    companion = _read(ORB_COMPANION)
    sidebar = _read(ORB_SIDEBAR)
    client = _read(STANDALONE_CLIENT)
    panel = _read(REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-agent-panel.tsx")
    sources = companion + sidebar + client + panel
    for marker in AGENT_FRAMEWORK_MARKERS:
        assert marker in sources, f"agent UI must include {marker}"


def test_orb_agent_backend_isolated():
    routes = _read(REPO_ROOT / "routers" / "orb_agent_routes.py")
    for marker in AGENT_BACKEND_MARKERS:
        assert marker.replace("routers.", "") in routes or marker in _read(REPO_ROOT / "core" / "router_loader.py")
    forbidden = (
        "intelligence_spine",
        "indicare_intelligence_spine",
        "getServerOsYoungPeople",
        "child_id",
        "young_person_id",
    )
    for rel in (
        "services/orb_agent_orchestrator_service.py",
        "services/orb_deep_research_service.py",
        "routers/orb_agent_routes.py",
    ):
        text = _read(REPO_ROOT / rel)
        for marker in ("intelligence_spine", "indicare_intelligence_spine", "getServerOsYoungPeople"):
            assert marker not in text, f"{rel} must not reference {marker}"


def test_standalone_knowledge_services_do_not_import_os_intelligence():
    forbidden = (
        "intelligence_spine_service",
        "getServerOsYoungPeople",
        "CareHub",
        "chronology_repository",
    )
    for rel in (
        "services/orb_knowledge_retrieval_service.py",
        "services/orb_citation_service.py",
        "services/orb_knowledge_source_pack_service.py",
    ):
        text = _read(REPO_ROOT / rel)
        for marker in forbidden:
            assert marker not in text, f"{rel} must not reference {marker}"


def test_standalone_orb_no_isn_notification_client():
    orb_dir = REPO_ROOT / "frontend-next" / "app" / "orb"
    if not orb_dir.exists():
        return
    for path in list(orb_dir.rglob("*.tsx")) + list(orb_dir.rglob("*.ts")):
        text = _read(path)
        assert "isn-notifications" not in text, path
        assert "isn_id=" not in text.lower(), path


def test_standalone_orb_no_notification_analytics_client():
    orb_dir = REPO_ROOT / "frontend-next" / "components" / "orb-standalone"
    standalone_page = REPO_ROOT / "frontend-next" / "app" / "orb" / "page.tsx"
    forbidden = (
        "getNotificationGovernanceSummary",
        "getNotificationResponseMetrics",
        "listNotificationEscalationRuns",
        "/api/notifications/analytics",
    )
    if standalone_page.exists():
        text = _read(standalone_page)
        for marker in forbidden:
            assert marker not in text
    if orb_dir.exists():
        for path in list(orb_dir.rglob("*.tsx")) + list(orb_dir.rglob("*.ts")):
            text = _read(path)
            for marker in forbidden:
                assert marker not in text, path


def test_assistants_map_differentiates_products():
    text = _read(PRODUCT_MAP)
    assert '"/orb"' in text
    assert '"/assistant"' in text
    assert '"/assistant/orb"' in text
    assert "ORB Care Companion" in text
    assert "IndiCare OS ORB" in text
    assert "operational_os_orb" in text
