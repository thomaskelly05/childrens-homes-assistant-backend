from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class KnowledgeVault:
    id: str
    title: str
    purpose: str
    governance_rules: tuple[str, ...]
    examples: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbKnowledgeVaultService:
    """Governed knowledge-domain architecture for ORB and IndiCare.

    These vaults are intended to become:
    - governed cognition domains
    - explainable knowledge boundaries
    - memory and evidence safety layers
    - future ingestion/update containers
    """

    def __init__(self) -> None:
        self.vaults = self._build()

    def context_payload(self) -> dict[str, Any]:
        return {
            "vaults": [vault.to_dict() for vault in self.vaults.values()],
            "purpose": "Governed knowledge separation for residential-care cognition.",
        }

    def prompt_addendum(self) -> str:
        lines = ["Governed knowledge vault architecture:"]
        for vault in self.vaults.values():
            lines.append(f"- {vault.title}: {vault.purpose}")
            lines.append("  Governance: " + "; ".join(vault.governance_rules[:4]))
        return "\n".join(lines)

    def _build(self) -> dict[str, KnowledgeVault]:
        vaults = [
            KnowledgeVault(
                id="regulatory_vault",
                title="Regulatory Vault",
                purpose="Structured regulations, Quality Standards, SCCIF and governance cognition.",
                governance_rules=(
                    "Must remain updateable against official guidance.",
                    "Must distinguish regulation from interpretation.",
                    "Must not hallucinate legal duties.",
                ),
                examples=("Children's Homes Regulations", "Quality Standards", "SCCIF", "Reg 44", "Reg 45"),
            ),
            KnowledgeVault(
                id="safeguarding_vault",
                title="Safeguarding Vault",
                purpose="Safeguarding reasoning, escalation frameworks and boundary-safe guidance.",
                governance_rules=(
                    "No automated threshold decisions.",
                    "Human review and local procedures remain primary.",
                    "Escalation reasoning must remain explainable.",
                ),
                examples=("missing episodes", "allegations", "contextual safeguarding", "online harm"),
            ),
            KnowledgeVault(
                id="therapeutic_vault",
                title="Therapeutic Vault",
                purpose="Trauma-informed, relational and emotionally attuned practice cognition.",
                governance_rules=(
                    "Avoid diagnostic certainty.",
                    "Avoid punitive/shaming framing.",
                    "Prioritise regulation, repair and emotional safety.",
                ),
                examples=("PACE", "co-regulation", "repair", "attachment-aware practice"),
            ),
            KnowledgeVault(
                id="provider_learning_vault",
                title="Provider Learning Vault",
                purpose="Provider-wide organisational learning, drift detection and governance insight.",
                governance_rules=(
                    "Patterns should be explainable.",
                    "Repeated concerns should increase visibility.",
                    "Improvement should be measurable.",
                ),
                examples=("Reg 44 themes", "audit learning", "repeated incidents", "inspection readiness"),
            ),
            KnowledgeVault(
                id="child_narrative_vault",
                title="Child Narrative Vault",
                purpose="Chronology and child-lived-experience narrative continuity.",
                governance_rules=(
                    "Protect identity and privacy.",
                    "Preserve child voice.",
                    "Avoid reducing children to incidents or risk labels.",
                ),
                examples=("chronology", "life story", "child voice", "placement journey"),
            ),
            KnowledgeVault(
                id="workforce_reflection_vault",
                title="Workforce Reflection Vault",
                purpose="Reflective workforce development, emotional climate and supervision cognition.",
                governance_rules=(
                    "Support psychologically safe reflection.",
                    "Avoid blame-led reasoning.",
                    "Track wellbeing and learning themes ethically.",
                ),
                examples=("supervision", "burnout", "debrief", "practice learning"),
            ),
        ]
        return {vault.id: vault for vault in vaults}


orb_knowledge_vault_service = OrbKnowledgeVaultService()
