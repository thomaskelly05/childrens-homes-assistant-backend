from __future__ import annotations

"""ORB guidance source registry.

Single source-family registry for ORB Residential's built-in guidance spine.
This does not fetch live legal text and does not claim exact paragraph citations.
It gives the brain stable source anchors, practice boundaries and routing hints so
answers can stay source-aware without pretending to quote material it has not retrieved.
"""

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class OrbGuidanceSource:
    id: str
    title: str
    source_family: str
    status: str
    purpose: str
    anchors: tuple[str, ...]
    activates_for: tuple[str, ...]
    practice_boundaries: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["anchors"] = list(self.anchors)
        payload["activates_for"] = list(self.activates_for)
        payload["practice_boundaries"] = list(self.practice_boundaries)
        return payload


class OrbGuidanceSourceRegistryService:
    VERSION = "orb-guidance-source-registry-v1"

    def __init__(self) -> None:
        self.sources = {source.id: source for source in self._build_sources()}

    def list_sources(self) -> list[dict[str, Any]]:
        return [source.to_dict() for source in self.sources.values()]

    def match_sources(
        self,
        message: str,
        *,
        mode: str | None = None,
        scenario_types: list[str] | None = None,
        active_brains: list[str] | None = None,
        limit: int = 8,
    ) -> list[OrbGuidanceSource]:
        text = f"{message or ''} {mode or ''} {' '.join(scenario_types or [])} {' '.join(active_brains or [])}".lower()
        scored: list[tuple[int, OrbGuidanceSource]] = []
        for source in self.sources.values():
            score = 0
            for trigger in source.activates_for:
                if trigger in text:
                    score += 2
            for anchor in source.anchors:
                if anchor.strip("[]").lower() in text:
                    score += 1
            if score:
                scored.append((score, source))
        if not scored and any(term in text for term in ("young person", "child", "record", "home", "residential")):
            fallback_ids = ["childrens_homes_quality_standards", "ofsted_sccif_childrens_homes", "working_together_safeguarding"]
            return [self.sources[item] for item in fallback_ids if item in self.sources][:limit]
        scored.sort(key=lambda item: (-item[0], item[1].title))
        return [source for _, source in scored[:limit]]

    def context_payload(
        self,
        message: str,
        *,
        mode: str | None = None,
        scenario_types: list[str] | None = None,
        active_brains: list[str] | None = None,
    ) -> dict[str, Any]:
        matches = self.match_sources(
            message,
            mode=mode,
            scenario_types=scenario_types,
            active_brains=active_brains,
        )
        return {
            "registry_version": self.VERSION,
            "matched_sources": [source.to_dict() for source in matches],
            "source_anchors": [anchor for source in matches for anchor in source.anchors][:12],
            "boundary": "Source-family anchors only unless exact official text has been retrieved or supplied.",
        }

    def prompt_block(
        self,
        message: str,
        *,
        mode: str | None = None,
        scenario_types: list[str] | None = None,
        active_brains: list[str] | None = None,
    ) -> str:
        matches = self.match_sources(
            message,
            mode=mode,
            scenario_types=scenario_types,
            active_brains=active_brains,
        )
        if not matches:
            return ""
        lines = [
            "Guidance source spine:",
            "- Use these as source-family anchors, not fabricated quotations or paragraph references.",
            "- If exact wording is needed, say it should be checked against the official source.",
        ]
        for source in matches[:6]:
            lines.append(f"- {source.title} ({source.status}): {source.purpose}")
            if source.anchors:
                lines.append("  Anchors: " + ", ".join(source.anchors[:4]))
            if source.practice_boundaries:
                lines.append("  Boundaries: " + "; ".join(source.practice_boundaries[:3]))
        return "\n".join(lines)

    def _build_sources(self) -> tuple[OrbGuidanceSource, ...]:
        return (
            OrbGuidanceSource(
                id="childrens_homes_quality_standards",
                title="Children's Homes Regulations 2015 and Quality Standards Guide",
                source_family="regulation_and_statutory_guidance",
                status="statutory_guidance_family",
                purpose="Core legal and practice foundation for Ofsted-regulated children's homes.",
                anchors=("[Reg 12]", "[Reg 13]", "[Quality Standards]", "[Children's Homes Regulations]"),
                activates_for=("quality standard", "regulation", "reg 12", "reg 13", "care planning", "protection", "leadership"),
                practice_boundaries=("Do not guarantee compliance.", "Translate standards into practical recording and oversight.", "Keep the child's welfare and lived experience central."),
            ),
            OrbGuidanceSource(
                id="ofsted_sccif_childrens_homes",
                title="Ofsted SCCIF: children's homes",
                source_family="inspection_framework",
                status="inspection_framework_family",
                purpose="Inspection lens for children's experiences, progress, help and protection, and leadership impact.",
                anchors=("[SCCIF]", "[Inspection evidence]", "[Leadership impact]"),
                activates_for=("ofsted", "sccif", "inspection", "reg 44", "reg 45", "evidence", "impact"),
                practice_boundaries=("Do not predict grades.", "Focus on evidence, impact and lived experience.", "Show what leaders know, do and review."),
            ),
            OrbGuidanceSource(
                id="working_together_safeguarding",
                title="Working Together to Safeguard Children",
                source_family="multi_agency_safeguarding",
                status="statutory_guidance_family",
                purpose="Multi-agency safeguarding, information sharing and partner responsibilities.",
                anchors=("[Working Together]", "[Safeguarding partners]", "[Information sharing]"),
                activates_for=("safeguard", "social worker", "police", "health", "multi-agency", "disclosure", "abuse", "neglect"),
                practice_boundaries=("ORB does not decide thresholds.", "Prompt local safeguarding procedures and professional consultation.", "Avoid leading questions or informal investigation."),
            ),
            OrbGuidanceSource(
                id="keeping_children_safe_in_education",
                title="Keeping Children Safe in Education",
                source_family="education_safeguarding",
                status="statutory_guidance_family_for_education_settings",
                purpose="Education safeguarding, DSL liaison, peer harm, online safety, allegations and safer recruitment context.",
                anchors=("[KCSIE]", "[DSL]", "[Online safety]", "[Peer-on-peer harm]"),
                activates_for=("school", "education", "dsl", "attendance", "exclusion", "bullying", "peer harm", "virtual school", "online safety"),
                practice_boundaries=("Apply through partnership working; ORB is not the school's DSL.", "Consider virtual school and social worker liaison.", "Avoid treating education refusal as simple non-compliance."),
            ),
            OrbGuidanceSource(
                id="nice_looked_after_children",
                title="NICE guidance: looked-after children and young people",
                source_family="health_wellbeing_and_stability",
                status="clinical_and_social_care_guidance_family",
                purpose="Health, emotional wellbeing, relationships, stability, transitions, participation and voice.",
                anchors=("[NICE looked-after children]", "[Health and wellbeing]", "[Placement stability]"),
                activates_for=("health", "camhs", "wellbeing", "transition", "placement stability", "relationship", "voice", "participation"),
                practice_boundaries=("Do not diagnose or give clinical treatment instructions.", "Prompt observation, recording, manager discussion and appropriate health routes.", "Keep relationships and stability in view."),
            ),
            OrbGuidanceSource(
                id="missing_from_home_or_care",
                title="Statutory guidance: children who run away or go missing from home or care",
                source_family="missing_from_care",
                status="statutory_guidance_family",
                purpose="Missing episodes, return conversations, risk assessment, police/local authority partnership and exploitation disruption.",
                anchors=("[Missing from care]", "[Return home interview]", "[Contextual safeguarding]"),
                activates_for=("missing", "absent", "unauthorised", "return home", "rhi", "ran away", "location unknown"),
                practice_boundaries=("Warm welfare-first return response.", "Do not blame or interrogate the child.", "Look for patterns, push/pull factors and exploitation indicators."),
            ),
            OrbGuidanceSource(
                id="send_equality_reasonable_adjustments",
                title="SEND, Equality Act and reasonable adjustment guidance family",
                source_family="send_disability_and_accessibility",
                status="law_and_guidance_family",
                purpose="Autism, learning disability, communication needs, sensory needs and accessible support.",
                anchors=("[SEND]", "[Equality Act]", "[Reasonable adjustments]", "[Communication needs]"),
                activates_for=("autism", "autistic", "send", "ehcp", "learning disability", "sensory", "aac", "communication", "reasonable adjustment"),
                practice_boundaries=("Do not frame disability as risk in itself.", "Check accessibility of adult requests and recording.", "Distinguish communication from non-compliance."),
            ),
            OrbGuidanceSource(
                id="corporate_parenting_children_act",
                title="Children Act, care planning and corporate parenting principles",
                source_family="corporate_parenting_and_care_planning",
                status="law_and_statutory_guidance_family",
                purpose="Welfare, parental responsibility, care planning, reviews, aspiration, stability and lifelong responsibility.",
                anchors=("[Children Act]", "[Care planning]", "[Corporate parenting]"),
                activates_for=("care plan", "placement plan", "iro", "review", "corporate parent", "parental responsibility", "aspiration"),
                practice_boundaries=("ORB does not replace statutory decision-makers.", "Prompt review, voice, stability and plan impact.", "Think beyond process into the child's lived experience."),
            ),
            OrbGuidanceSource(
                id="prevent_radicalisation",
                title="Prevent and radicalisation safeguarding guidance family",
                source_family="prevent_and_extremism_safeguarding",
                status="safeguarding_guidance_family",
                purpose="Careful safeguarding thinking around radicalisation concerns without stereotyping or overreach.",
                anchors=("[Prevent]", "[Channel consideration]", "[Safeguarding]"),
                activates_for=("radicalisation", "radicalized", "extremism", "prevent", "channel", "terrorism"),
                practice_boundaries=("Avoid stereotyping or profiling.", "Record observable facts and worries.", "Prompt local safeguarding/Prevent lead routes where relevant."),
            ),
            OrbGuidanceSource(
                id="data_protection_records_information_sharing",
                title="Data protection, information sharing and lifelong record access",
                source_family="records_confidentiality_and_information_governance",
                status="law_and_guidance_family",
                purpose="Confidentiality, data minimisation, information sharing, future record access and dignity in recording.",
                anchors=("[Data protection]", "[Information sharing]", "[Recording quality]", "[Future record access]"),
                activates_for=("gdpr", "confidential", "share information", "record access", "subject access", "data protection", "privacy"),
                practice_boundaries=("Use minimum necessary detail.", "Do not include unnecessary third-party information.", "Write as though the child may read the record later."),
            ),
        )


orb_guidance_source_registry_service = OrbGuidanceSourceRegistryService()
