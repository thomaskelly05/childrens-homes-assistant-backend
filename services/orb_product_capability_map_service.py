from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class OrbCapabilityGroup:
    id: str
    title: str
    purpose: str
    capabilities: tuple[str, ...]
    orb_advantage: tuple[str, ...]
    status: str = "planned"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbProductCapabilityMapService:
    """Product capability map for Standalone ORB.

    This captures the ChatGPT-grade features ORB should mould, plus the
    residential children's homes intelligence that makes ORB different.
    """

    VERSION = "orb-product-capability-map-v1"

    def __init__(self) -> None:
        self.groups = self._groups()

    def all(self) -> dict[str, Any]:
        return {
            "version": self.VERSION,
            "product_statement": (
                "ORB is a calm, premium, ChatGPT-style residential children's homes copilot "
                "for guidance, reflection, safeguarding thinking, therapeutic practice, Ofsted preparation, "
                "recording quality and general knowledge."
            ),
            "dual_brain": {
                "general_knowledge": "Answer everyday ChatGPT-style questions clearly and helpfully.",
                "residential_specialist": "Activate safeguarding, therapeutic, Ofsted, recording and governance cognition when care context is present.",
            },
            "groups": [group.to_dict() for group in self.groups],
            "ui_principles": [
                "Keep the reliable text-send path simple and stable.",
                "Hide complexity in folders, modes and collapsible intelligence surfaces.",
                "Do not auto-start microphone, voice, wake word or realtime connections.",
                "Make ORB feel calm, emotionally regulating, premium and non-cluttered.",
                "Surface safeguarding/evidence prompts only when useful.",
            ],
        }

    def prompt_addendum(self) -> str:
        data = self.all()
        lines = ["ORB product capability map:", f"- Version: {data['version']}", f"- Statement: {data['product_statement']}"]
        for group in self.groups:
            lines.append(f"- {group.title}: {group.purpose}")
            lines.append("  Capabilities: " + "; ".join(group.capabilities[:8]))
            lines.append("  ORB advantage: " + "; ".join(group.orb_advantage[:5]))
        return "\n".join(lines)

    def _groups(self) -> list[OrbCapabilityGroup]:
        return [
            OrbCapabilityGroup(
                id="conversational_intelligence",
                title="Conversational Intelligence",
                purpose="ChatGPT-grade natural language conversation with memory, follow-up and tone adaptation.",
                capabilities=(
                    "natural language chat",
                    "multi-turn context",
                    "conversation history",
                    "persistent thread continuity",
                    "suggested prompts",
                    "smart conversation titles",
                    "tone adaptation",
                    "role-aware responses",
                ),
                orb_advantage=("therapeutic tone", "safeguarding boundaries", "Ofsted-aware reflection"),
                status="partially_built",
            ),
            OrbCapabilityGroup(
                id="copilot_behaviour",
                title="AI Copilot Behaviour",
                purpose="Quiet unless needed; expands for guidance, nudges and decision support.",
                capabilities=(
                    "floating assistant presence",
                    "contextual recommendations",
                    "proactive prompts",
                    "inline suggestions",
                    "smart nudges",
                    "decision support",
                    "safeguarding escalation prompts",
                ),
                orb_advantage=("adult-on-shift support", "safe escalation thinking", "calm intervention moments"),
            ),
            OrbCapabilityGroup(
                id="voice_communication",
                title="Voice & Communication",
                purpose="Future click-to-talk voice only, never passive listening by default.",
                capabilities=("push-to-talk", "voice notes transcription", "speech support", "interruptible voice", "accessibility speech"),
                orb_advantage=("hands-free shift support", "voice notes into professional wording", "emotional containment"),
                status="future_flagged",
            ),
            OrbCapabilityGroup(
                id="documents_recording",
                title="Document & Recording Intelligence",
                purpose="Read, analyse, summarise and transform documents and rough notes into useful records.",
                capabilities=("file upload", "PDF analysis", "report summaries", "action extraction", "auto-tagging", "chronology generation", "document comparison"),
                orb_advantage=("child-centred recording", "evidence gaps", "Reg 44/45 usefulness", "safeguarding prompts"),
            ),
            OrbCapabilityGroup(
                id="memory_personalisation",
                title="Memory & Personalisation",
                purpose="Role-aware workspace, preferences, reflective themes and learning continuity.",
                capabilities=("remember preferences", "role-based intelligence", "personal workspace", "saved information", "tailored recommendations", "smart shortcuts"),
                orb_advantage=("staff development themes", "manager coaching", "reflective continuity"),
            ),
            OrbCapabilityGroup(
                id="real_time_assistance",
                title="Real-Time Assistance",
                purpose="Typing help, wording support, safeguarding prompts and missing-information warnings.",
                capabilities=("live typing assistance", "grammar improvement", "therapeutic wording", "risk language detection", "missing information warnings", "Inspection evidence preparation prompts"),
                orb_advantage=("trauma-informed language", "Regulation-aware wording", "safe escalation nudges"),
            ),
            OrbCapabilityGroup(
                id="search_knowledge",
                title="Search & Knowledge Systems",
                purpose="Universal search and semantic retrieval across conversations, knowledge and future records.",
                capabilities=("universal search", "conversation search", "semantic search", "saved searches", "linked knowledge graph", "AI answers from evidence"),
                orb_advantage=("evidence lineage", "child journey meaning", "Inspection evidence preparation"),
            ),
            OrbCapabilityGroup(
                id="multi_modal",
                title="Multi-Modal Features",
                purpose="Future image, camera, screenshot, OCR and visual timeline support.",
                capabilities=("image upload", "camera support", "screenshot analysis", "OCR", "annotation", "visual timeline"),
                orb_advantage=("photo evidence context", "document interpretation", "accessibility support"),
                status="future_flagged",
            ),
            OrbCapabilityGroup(
                id="workspace_ui",
                title="Workspace & UI",
                purpose="Premium ChatGPT-style UI that stays calm and hides complexity.",
                capabilities=("sidebar", "dark/light mode", "accessibility controls", "keyboard shortcuts", "mobile responsive", "focus mode", "modular panels"),
                orb_advantage=("calm intelligence surfaces", "non-overwhelming safeguarding prompts", "therapeutic visual tone"),
                status="next_build",
            ),
            OrbCapabilityGroup(
                id="productivity",
                title="Productivity & Workflow",
                purpose="Reports, action plans, templates, sign-off and automation support.",
                capabilities=("instant reports", "action plans", "meeting summaries", "task extraction", "templates", "approval workflows", "reminders"),
                orb_advantage=("evidence-based actions", "manager oversight", "regulatory usefulness"),
            ),
        ]


orb_product_capability_map_service = OrbProductCapabilityMapService()
