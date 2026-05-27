from __future__ import annotations

from typing import Any


class OrbOfficialSourceAnchorService:
    """Official source anchors for ORB.

    These anchors let ORB ground answers in named official sources and URLs.
    Exact quotation should only be used where the answer has retrieved or been
    supplied with the precise source text. Built-in summaries must be labelled
    as summaries, not verbatim quotations.
    """

    SOURCES: tuple[dict[str, Any], ...] = (
        {
            "id": "dfe_children_homes_guide",
            "label": "Guide to the Children's Homes Regulations including the quality standards",
            "publisher": "Department for Education",
            "source_url": "https://assets.publishing.service.gov.uk/media/5a7f1b54ed915d74e33f45f0/Guide_to_Children_s_Home_Standards_inc_quality_standards_Version__1.17_FINAL.pdf",
            "source_type": "official_guidance_pdf",
            "use_for": [
                "quality standards",
                "protection standard",
                "leadership and management standard",
                "care planning standard",
                "recording and policy expectations",
            ],
            "citation_style": "[Guide to the Children's Homes Regulations]",
            "quote_rule": "Quote only from retrieved PDF text or verified pasted text; otherwise summarise and label as built-in guidance summary.",
        },
        {
            "id": "ofsted_sccif_childrens_homes",
            "label": "Social care common inspection framework: children's homes",
            "publisher": "Ofsted",
            "source_url": "https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes",
            "source_type": "official_guidance_html",
            "use_for": [
                "inspection lens",
                "help and protection",
                "leadership and management",
                "overall experiences and progress",
                "inspection evidence expectations",
            ],
            "citation_style": "[SCCIF children's homes]",
            "quote_rule": "May quote retrieved GOV.UK text when available and should include the GOV.UK source label.",
        },
        {
            "id": "children_homes_regulations_2015",
            "label": "The Children's Homes (England) Regulations 2015",
            "publisher": "legislation.gov.uk",
            "source_url": "https://www.legislation.gov.uk/uksi/2015/541/contents",
            "source_type": "official_legislation",
            "use_for": [
                "statutory regulations",
                "Regulation 12",
                "Regulation 13",
                "Regulation 34",
                "Regulation 44",
                "Regulation 45",
            ],
            "citation_style": "[Children's Homes Regulations 2015]",
            "quote_rule": "Use as the primary legislation anchor. If direct legislation text is unavailable, rely on the DfE Guide's reproduced regulation text and say so.",
        },
    )

    def source_prompt(self) -> str:
        lines = [
            "Official source grounding requirements:",
            "- Prefer official sources over broad built-in summaries.",
            "- Use inline source anchors where claims rely on law, inspection guidance or statutory guidance.",
            "- Do not invent quotations, paragraph numbers or URLs.",
            "- If exact source text has not been retrieved, summarise honestly and say the response is based on an official-source anchor, not a verbatim quote.",
            "- For each legal or inspection point, explain the practical meaning and the evidence a professional would expect to see.",
            "",
            "Official anchors available:",
        ]
        for source in self.SOURCES:
            lines.append(f"- {source['citation_style']} {source['label']} — {source['source_url']}")
            lines.append(f"  Use for: {', '.join(source['use_for'])}")
            lines.append(f"  Quote rule: {source['quote_rule']}")
        return "\n".join(lines)

    def citation_payload(self) -> list[dict[str, Any]]:
        return [
            {
                "id": source["id"],
                "label": source["citation_style"],
                "type": source["source_type"],
                "basis": source["label"],
                "note": f"Official source anchor from {source['publisher']}.",
                "source_url": source["source_url"],
                "official_source": True,
                "live_retrieved": False,
                "source_integrity": "official_url_anchor_quote_only_when_retrieved",
                "quote_rule": source["quote_rule"],
            }
            for source in self.SOURCES
        ]


orb_official_source_anchor_service = OrbOfficialSourceAnchorService()
