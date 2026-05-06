from __future__ import annotations

"""Curated statutory and inspection reference registry for IndiCare Assistant.

The assistant should not rely on model memory for regulatory basis. This module
provides a small, controlled registry of high-value references used in children’s
homes practice answers. It is deliberately data-first so it can be expanded,
tested and surfaced in the UI.

Source policy:
- Use legislation.gov.uk for regulations.
- Use GOV.UK / Ofsted for statutory guidance and SCCIF inspection expectations.
- Keep excerpts short and labelled.
- Answers should still avoid legal certainty beyond the visible facts.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RegulationQuote:
    key: str
    label: str
    source_name: str
    source_url: str
    source_type: str
    quote: str
    plain_english: str
    adult_practice_prompt: str


LEGISLATION_BASE_URL = "https://www.legislation.gov.uk/uksi/2015/541"
GUIDE_URL = "https://www.gov.uk/government/publications/childrens-homes-regulations-including-quality-standards-guide"
SCCIF_URL = "https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes"


REGULATION_QUOTES: dict[str, RegulationQuote] = {
    "reg12": RegulationQuote(
        key="reg12",
        label="Regulation 12 - The protection of children standard",
        source_name="The Children’s Homes (England) Regulations 2015",
        source_url=f"{LEGISLATION_BASE_URL}/regulation/12",
        source_type="regulation",
        quote="The protection of children standard is that children are protected from harm and enabled to keep themselves safe.",
        plain_english="The home must actively protect children from harm, reduce known risks, and support children to understand and manage safety where this is realistic for them.",
        adult_practice_prompt="For safeguarding answers, lead with immediate safety, who must be informed, what must be recorded, and what evidence shows the current risk.",
    ),
    "reg13": RegulationQuote(
        key="reg13",
        label="Regulation 13 - The leadership and management standard",
        source_name="The Children’s Homes (England) Regulations 2015",
        source_url=f"{LEGISLATION_BASE_URL}/regulation/13",
        source_type="regulation",
        quote="The leadership and management standard is that the registered person enables, inspires and leads a culture in relation to the children’s home that helps children aspire to fulfil their potential.",
        plain_english="Leadership must create a child-centred, accountable and well-managed home where staff practice, oversight and improvement activity improve children’s experiences.",
        adult_practice_prompt="For manager, RI, quality or provider answers, include management grip, oversight, action ownership, timescales and evidence of impact on children.",
    ),
    "reg14": RegulationQuote(
        key="reg14",
        label="Regulation 14 - The care planning standard",
        source_name="The Children’s Homes (England) Regulations 2015",
        source_url=f"{LEGISLATION_BASE_URL}/regulation/14",
        source_type="regulation",
        quote="The care planning standard is that children receive effectively planned care in or through the children’s home.",
        plain_english="The child’s care should be planned, coordinated, reviewed and delivered in line with their needs, plans and placing authority arrangements.",
        adult_practice_prompt="For planning answers, connect actions to the child’s plan, risk assessment, placing authority expectations and review arrangements.",
    ),
    "reg40": RegulationQuote(
        key="reg40",
        label="Regulation 40 - Notification of a serious event",
        source_name="The Children’s Homes (England) Regulations 2015",
        source_url=f"{LEGISLATION_BASE_URL}/regulation/40",
        source_type="regulation",
        quote="If an event listed in paragraph (4) takes place, the registered person must notify HMCI and other relevant persons without delay.",
        plain_english="Certain serious events must be notified promptly to Ofsted and relevant agencies; the answer must not guess whether notification is required without enough facts.",
        adult_practice_prompt="For notification answers, separate known facts from missing facts, advise manager/on-call review, and identify who may need notifying.",
    ),
    "reg44": RegulationQuote(
        key="reg44",
        label="Regulation 44 - Independent person visits",
        source_name="The Children’s Homes (England) Regulations 2015 and Ofsted SCCIF",
        source_url=f"{LEGISLATION_BASE_URL}/regulation/44",
        source_type="regulation",
        quote="The registered provider must ensure that an independent person visits the children’s home at least once each month.",
        plain_english="The home needs regular independent scrutiny of children’s safety, welfare, progress and the conduct of the home.",
        adult_practice_prompt="For Reg 44 answers, include visit frequency, scrutiny, report quality, provider response and evidence of follow-through.",
    ),
    "reg45": RegulationQuote(
        key="reg45",
        label="Regulation 45 - Review of quality of care",
        source_name="The Children’s Homes (England) Regulations 2015",
        source_url=f"{LEGISLATION_BASE_URL}/regulation/45",
        source_type="regulation",
        quote="The registered person must complete a review of the quality of care provided for children.",
        plain_english="The home must evaluate the quality and impact of care, including children’s experiences, safeguarding, progress, leadership, shortfalls and improvement actions.",
        adult_practice_prompt="For Reg 45 answers, structure around evidence, children’s experiences, safeguarding, leadership, strengths, development areas, actions, owner and review point.",
    ),
    "guide": RegulationQuote(
        key="guide",
        label="Guide to the Children’s Homes Regulations, including the Quality Standards",
        source_name="Department for Education statutory guidance",
        source_url=GUIDE_URL,
        source_type="statutory_guidance",
        quote="This guide is for all those involved with the care of children, and in some cases those aged 18 or over, in children’s homes.",
        plain_english="The Guide explains how providers should interpret and meet the Children’s Homes Regulations and Quality Standards.",
        adult_practice_prompt="Use the Guide to explain practical expectations, but do not treat guidance as evidence that something happened in a child’s record.",
    ),
    "sccif": RegulationQuote(
        key="sccif",
        label="Ofsted SCCIF - Children’s homes",
        source_name="Ofsted social care common inspection framework",
        source_url=SCCIF_URL,
        source_type="inspection_framework",
        quote="Inspectors consider the impact on children and how it should influence the judgements and outcome of the inspection.",
        plain_english="Inspection answers should focus on evidence, impact on children, leadership response, safeguarding, progress and whether actions improve practice.",
        adult_practice_prompt="For Ofsted answers, avoid predicting grades. Focus on evidence quality, impact, risk, oversight, requirements, recommendations and improvement actions.",
    ),
}


def normalise_regulation_key(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = text.replace("regulation", "reg")
    text = text.replace(" ", "")
    aliases = {
        "reg12": "reg12",
        "12": "reg12",
        "protection": "reg12",
        "reg13": "reg13",
        "13": "reg13",
        "leadership": "reg13",
        "management": "reg13",
        "reg14": "reg14",
        "14": "reg14",
        "careplanning": "reg14",
        "reg40": "reg40",
        "40": "reg40",
        "notification": "reg40",
        "seriousnotification": "reg40",
        "reg44": "reg44",
        "44": "reg44",
        "independentperson": "reg44",
        "reg45": "reg45",
        "45": "reg45",
        "qualityofcarereview": "reg45",
        "guide": "guide",
        "statutoryguide": "guide",
        "sccif": "sccif",
        "ofsted": "sccif",
    }
    return aliases.get(text, text)


def get_regulation_quote(key: Any) -> RegulationQuote | None:
    return REGULATION_QUOTES.get(normalise_regulation_key(key))


def regulation_quote_to_source(quote: RegulationQuote) -> dict[str, Any]:
    return {
        "type": quote.source_type,
        "source_type": quote.source_type,
        "label": quote.label,
        "title": quote.label,
        "document_title": quote.source_name,
        "section": quote.label,
        "excerpt": quote.quote,
        "url": quote.source_url,
        "citation_ref": f"[{quote.key}]",
    }


def serialise_regulation_quote(quote: RegulationQuote) -> dict[str, str]:
    return {
        "key": quote.key,
        "label": quote.label,
        "source_name": quote.source_name,
        "source_url": quote.source_url,
        "source_type": quote.source_type,
        "quote": quote.quote,
        "plain_english": quote.plain_english,
        "adult_practice_prompt": quote.adult_practice_prompt,
    }


def build_regulatory_basis(keys: list[Any]) -> list[dict[str, str]]:
    seen: set[str] = set()
    items: list[dict[str, str]] = []

    for key in keys:
        quote = get_regulation_quote(key)
        if not quote or quote.key in seen:
            continue
        seen.add(quote.key)
        items.append(serialise_regulation_quote(quote))

    return items


def build_regulatory_prompt_block(keys: list[Any]) -> str:
    quotes = [get_regulation_quote(key) for key in keys]
    quotes = [quote for quote in quotes if quote is not None]

    if not quotes:
        return ""

    lines = [
        "REGULATORY BASIS TO USE WHERE RELEVANT",
        "Use these labelled references where they help answer the adult’s question.",
        "Do not overstate legal certainty. Do not treat regulation text as evidence from the OS record.",
        "",
    ]

    seen: set[str] = set()
    for quote in quotes:
        if quote.key in seen:
            continue
        seen.add(quote.key)
        lines.extend(
            [
                f"{quote.label}",
                f"Source: {quote.source_name}",
                f"Short quote: {quote.quote}",
                f"Plain meaning: {quote.plain_english}",
                f"Practice instruction: {quote.adult_practice_prompt}",
                "",
            ]
        )

    return "\n".join(lines).strip()
