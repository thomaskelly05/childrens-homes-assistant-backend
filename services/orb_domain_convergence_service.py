from __future__ import annotations

"""ORB domain convergence service.

Collects the final ORB Residential domain services into one compact packet so the
canonical brain orchestrator can consume the newer intelligence layers without
creating parallel routes or feature-specific brains.
"""

from dataclasses import asdict, dataclass, field
from typing import Any

from services.orb_child_story_intelligence_service import orb_child_story_intelligence_service
from services.orb_guidance_source_registry_service import orb_guidance_source_registry_service
from services.orb_health_wellbeing_intelligence_service import orb_health_wellbeing_intelligence_service
from services.orb_multi_agency_intelligence_service import orb_multi_agency_intelligence_service
from services.orb_rights_corporate_parenting_intelligence_service import (
    orb_rights_corporate_parenting_intelligence_service,
)
from services.orb_send_communication_intelligence_service import orb_send_communication_intelligence_service


@dataclass(frozen=True)
class OrbDomainConvergencePacket:
    active_domains: list[str] = field(default_factory=list)
    source_anchors: list[str] = field(default_factory=list)
    public_source_chips: list[dict[str, Any]] = field(default_factory=list)
    prompt_blocks: list[str] = field(default_factory=list)
    domain_payloads: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbDomainConvergenceService:
    VERSION = "orb-domain-convergence-v1"

    DOMAIN_LABELS = {
        "guidance_source_spine": "Guidance source spine",
        "child_story": "Child Story Intelligence",
        "send_communication": "SEND and communication",
        "multi_agency": "Multi-agency working",
        "rights_corporate_parenting": "Rights and corporate parenting",
        "health_wellbeing": "Health and wellbeing",
    }

    SOURCE_CHIP_LABELS = {
        "[Quality Standards]": "Quality Standards",
        "[Children's Homes Regulations]": "Children's Homes Regulations",
        "[SCCIF]": "SCCIF",
        "[Working Together]": "Working Together",
        "[Information sharing]": "Information sharing",
        "[KCSIE]": "KCSIE",
        "[SEND Code]": "SEND Code",
        "[Equality Act]": "Equality Act",
        "[Reasonable adjustments]": "Reasonable adjustments",
        "[NICE looked-after children]": "NICE",
        "[Health and wellbeing]": "Health and wellbeing",
        "[Placement stability]": "Placement stability",
        "[Children Act]": "Children Act",
        "[Corporate parenting]": "Corporate parenting",
        "[Advocacy]": "Advocacy",
        "[Child voice]": "Child voice",
        "[Recording quality]": "Recording quality",
        "[Future record access]": "Future record access",
        "[LADO]": "LADO",
        "[Prevent]": "Prevent",
        "[Missing from care]": "Missing from care",
        "[Return home interview]": "Return home interview",
    }

    def build_packet(
        self,
        message: str,
        *,
        mode: str | None = None,
        feature: str | None = None,
        note_type: str | None = None,
        scenario_types: list[str] | None = None,
        risk_level: str | None = None,
        active_brains: list[str] | None = None,
    ) -> OrbDomainConvergencePacket:
        active_domains: list[str] = []
        anchors: list[str] = []
        prompt_blocks: list[str] = []
        payloads: dict[str, Any] = {}

        guidance = orb_guidance_source_registry_service.context_payload(
            message,
            mode=mode,
            scenario_types=scenario_types,
            active_brains=active_brains,
        )
        if guidance.get("matched_sources"):
            active_domains.append("guidance_source_spine")
            anchors.extend(guidance.get("source_anchors") or [])
            block = orb_guidance_source_registry_service.prompt_block(
                message,
                mode=mode,
                scenario_types=scenario_types,
                active_brains=active_brains,
            )
            if block:
                prompt_blocks.append(block)
        payloads["guidance_source_spine"] = guidance

        child_story = orb_child_story_intelligence_service.context_payload(
            message,
            mode=mode,
            feature=feature,
            note_type=note_type,
        )
        if child_story.get("active"):
            active_domains.append("child_story")
            anchors.extend(child_story.get("source_anchors") or [])
            block = orb_child_story_intelligence_service.prompt_block(
                message,
                mode=mode,
                feature=feature,
                note_type=note_type,
            )
            if block:
                prompt_blocks.append(block)
        payloads["child_story"] = child_story

        send = orb_send_communication_intelligence_service.evaluate(message).to_dict()
        if send.get("active"):
            active_domains.append("send_communication")
            anchors.extend(send.get("source_anchors") or [])
            prompts = send.get("prompts") or []
            prompt_blocks.append("SEND and Communication Intelligence:\n" + "\n".join(f"- {p}" for p in prompts[:6]))
        payloads["send_communication"] = send

        multi_agency = orb_multi_agency_intelligence_service.context_payload(
            message,
            mode=mode,
            scenario_types=scenario_types,
            risk_level=risk_level,
        )
        if multi_agency.get("active"):
            active_domains.append("multi_agency")
            anchors.extend(multi_agency.get("source_anchors") or [])
            block = orb_multi_agency_intelligence_service.prompt_block(
                message,
                mode=mode,
                scenario_types=scenario_types,
                risk_level=risk_level,
            )
            if block:
                prompt_blocks.append(block)
        payloads["multi_agency"] = multi_agency

        rights = orb_rights_corporate_parenting_intelligence_service.context_payload(
            message,
            mode=mode,
            note_type=note_type,
        )
        if rights.get("active"):
            active_domains.append("rights_corporate_parenting")
            anchors.extend(rights.get("source_anchors") or [])
            block = orb_rights_corporate_parenting_intelligence_service.prompt_block(
                message,
                mode=mode,
                note_type=note_type,
            )
            if block:
                prompt_blocks.append(block)
        payloads["rights_corporate_parenting"] = rights

        health = orb_health_wellbeing_intelligence_service.context_payload(
            message,
            mode=mode,
            note_type=note_type,
        )
        if health.get("active"):
            active_domains.append("health_wellbeing")
            anchors.extend(health.get("source_anchors") or [])
            block = orb_health_wellbeing_intelligence_service.prompt_block(
                message,
                mode=mode,
                note_type=note_type,
            )
            if block:
                prompt_blocks.append(block)
        payloads["health_wellbeing"] = health

        deduped_anchors = self._dedupe(anchors)
        return OrbDomainConvergencePacket(
            active_domains=self._dedupe(active_domains),
            source_anchors=deduped_anchors,
            public_source_chips=self.source_chips_for(deduped_anchors, active_domains=active_domains),
            prompt_blocks=self._dedupe(prompt_blocks),
            domain_payloads=payloads,
        )

    def source_chips_for(self, anchors: list[str], *, active_domains: list[str] | None = None) -> list[dict[str, Any]]:
        chips: list[dict[str, Any]] = []
        for anchor in self._dedupe(anchors):
            label = self.SOURCE_CHIP_LABELS.get(anchor, anchor.strip("[]") or anchor)
            chips.append(
                {
                    "id": label.lower().replace(" ", "_").replace("/", "_"),
                    "label": label,
                    "anchor": anchor,
                    "type": "source_family",
                    "precision": "source_family_anchor",
                    "domains": [self.DOMAIN_LABELS.get(domain, domain) for domain in (active_domains or [])[:6]],
                }
            )
        return chips[:10]

    def prompt_block(self, packet: OrbDomainConvergencePacket) -> str:
        if not packet.prompt_blocks:
            return ""
        lines = [
            "ORB final domain convergence:",
            "- These layers are part of the same ORB Residential brain, not separate feature brains.",
            "- Use source-family anchors and source chips; do not fabricate exact wording or paragraph references.",
        ]
        if packet.active_domains:
            lines.append("- Active final domains: " + ", ".join(self.DOMAIN_LABELS.get(d, d) for d in packet.active_domains))
        lines.extend(packet.prompt_blocks[:8])
        return "\n".join(lines)

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            if not item or item in seen:
                continue
            seen.add(item)
            out.append(item)
        return out


orb_domain_convergence_service = OrbDomainConvergenceService()
