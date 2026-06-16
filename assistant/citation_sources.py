from __future__ import annotations

from typing import Any


OFFICIAL_CHILDRENS_HOME_SOURCES: list[dict[str, str]] = [
    {
        "id": "children_homes_regs_2015",
        "title": "The Children’s Homes (England) Regulations 2015",
        "source_type": "legislation",
        "url": "https://www.legislation.gov.uk/uksi/2015/541/contents",
        "summary": "Primary legislation setting out requirements for children’s homes in England.",
        "keywords": "regulation regulations reg 12 reg 13 reg 14 reg 40 reg 44 reg 45 quality standards children homes legislation statutory",
    },
    {
        "id": "dfe_quality_standards_guide",
        "title": "Guide to the Children’s Homes Regulations, including the quality standards",
        "source_type": "statutory_guidance",
        "url": "https://www.gov.uk/government/publications/childrens-homes-regulations-including-quality-standards-guide",
        "summary": "Department for Education statutory guidance for providers and staff working with children’s homes regulations and quality standards.",
        "keywords": "quality standards guide dfe care planning protection leadership management views wishes feelings positive relationships health education enjoyment achievement",
    },
    {
        "id": "ofsted_sccif_childrens_homes",
        "title": "Social care common inspection framework: children’s homes",
        "source_type": "inspection_guidance",
        "url": "https://www.gov.uk/government/collections/ofsted-inspections-of-childrens-homes",
        "summary": "Ofsted guidance explaining how children’s homes are inspected under the SCCIF.",
        "keywords": "ofsted sccif inspection inspector judgement experiences progress helped protected leaders managers evidence inspection evidence preparation",
    },
    {
        "id": "care_standards_act_2000",
        "title": "Care Standards Act 2000",
        "source_type": "legislation",
        "url": "https://www.legislation.gov.uk/ukpga/2000/14/contents",
        "summary": "Primary legislation underpinning regulation and inspection of children’s social care services.",
        "keywords": "care standards act registration registered provider regulation inspection hmci enforcement",
    },
]


def _normalise(value: Any) -> str:
    return str(value or "").strip().lower()


def select_official_sources(message: str, *, max_sources: int = 4) -> list[dict[str, str]]:
    text = _normalise(message)
    if not text:
        return []

    scored: list[tuple[int, dict[str, str]]] = []

    for source in OFFICIAL_CHILDRENS_HOME_SOURCES:
        keywords = _normalise(source.get("keywords", "")).split()
        score = 0
        for keyword in keywords:
            if keyword and keyword in text:
                score += 1

        # Recording and safeguarding questions should still have core regulatory context available.
        if any(term in text for term in ["record", "recording", "daily note", "incident", "safeguard", "risk", "missing"]):
            if source["id"] in {"children_homes_regs_2015", "dfe_quality_standards_guide"}:
                score += 2

        if score > 0:
            scored.append((score, source))

    if not scored:
        return []

    scored.sort(key=lambda item: (-item[0], item[1]["title"]))

    return [
        {
            "title": source["title"],
            "source_type": source["source_type"],
            "source_id": source["id"],
            "url": source["url"],
            "excerpt": source["summary"],
        }
        for _, source in scored[:max_sources]
    ]


def build_official_sources_prompt_block(sources: list[dict[str, str]]) -> str:
    if not sources:
        return ""

    lines = [
        "Relevant official sources available for citation:",
    ]

    for index, source in enumerate(sources, start=1):
        lines.append(
            f"[{index}] {source['title']} ({source.get('url')}) - {source.get('excerpt', '')}"
        )

    lines.append(
        "When giving regulatory, inspection, safeguarding or recording guidance, include a short 'Sources' section with markdown links to the relevant sources above. Do not cite a source if it is not relevant."
    )

    return "\n".join(lines)
