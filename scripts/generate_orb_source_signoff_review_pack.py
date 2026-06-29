#!/usr/bin/env python3
"""Generate ORB Residential named source sign-off review packs — Phase 2k.

Produces human-readable review material for named reviewers. This script does
not create completed sign-off records, enable live source-grounded answers, or
change runtime answer behaviour.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any, Literal

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.verify_orb_guide_chunks import (  # noqa: E402
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_SHA256,
    EXPECTED_CHUNK_COUNT as EXPECTED_GUIDE_CHUNK_COUNT,
    EXPECTED_OFFICIAL_URL as EXPECTED_GUIDE_OFFICIAL_URL,
    EXPECTED_PUBLISHER as EXPECTED_GUIDE_PUBLISHER,
    EXPECTED_SOURCE_TITLE as EXPECTED_GUIDE_SOURCE_TITLE,
    EXPECTED_VERSION as EXPECTED_GUIDE_VERSION,
    GUIDE_CHUNKS_PATH,
)
from scripts.verify_orb_named_source_signoffs import (  # noqa: E402
    SIGNOFF_ARTEFACT_PATH,
    SIGNOFF_TEMPLATE_PATH,
    SOURCE_CHECKSUM_EXPECTATIONS,
    SOURCE_TYPE_TO_ID,
)
from scripts.verify_orb_regulations_2015_chunks import (  # noqa: E402
    EXPECTED_CHUNK_COUNT as EXPECTED_REGULATIONS_CHUNK_COUNT,
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_SHA256,
    EXPECTED_OFFICIAL_URL as EXPECTED_REGULATIONS_OFFICIAL_URL,
    EXPECTED_PUBLISHER as EXPECTED_REGULATIONS_PUBLISHER,
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_REGULATIONS_SOURCE_SHA256,
    EXPECTED_SOURCE_TITLE as EXPECTED_REGULATIONS_SOURCE_TITLE,
    EXPECTED_VERSION as EXPECTED_REGULATIONS_VERSION,
    REGULATIONS_CHUNKS_PATH,
    REGULATIONS_SOURCE_PATH,
)
from scripts.verify_orb_sccif_children_homes_chunks import (  # noqa: E402
    EXPECTED_CHUNK_COUNT as EXPECTED_SCCIF_CHUNK_COUNT,
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_SCCIF_CHUNK_SHA256,
    EXPECTED_OFFICIAL_URL as EXPECTED_SCCIF_OFFICIAL_URL,
    EXPECTED_PUBLISHER as EXPECTED_SCCIF_PUBLISHER,
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_SCCIF_SOURCE_SHA256,
    EXPECTED_SOURCE_TITLE as EXPECTED_SCCIF_SOURCE_TITLE,
    EXPECTED_VERSION as EXPECTED_SCCIF_VERSION,
    SCCIF_CHUNKS_PATH,
    SCCIF_SOURCE_PATH,
)
from services.orb_residential_source_answer_policy import (  # noqa: E402
    CITATION_RULES,
    SOURCE_BUNDLE_LIMITS,
    SOURCE_ROLES,
    WORKFLOW_ROUTING,
    orb_residential_source_answer_policy_service,
)

SourceTypeKey = Literal["guide", "regulations_2015", "sccif"]

REVIEW_PACK_DIR = ROOT / "docs" / "review-packs"
OVERVIEW_PATH = REVIEW_PACK_DIR / "orb-residential-source-signoff-review-pack.md"
SOURCE_REVIEW_PATHS: dict[SourceTypeKey, Path] = {
    "guide": REVIEW_PACK_DIR / "orb-residential-guide-source-signoff-review.md",
    "regulations_2015": REVIEW_PACK_DIR / "orb-residential-regulations-2015-source-signoff-review.md",
    "sccif": REVIEW_PACK_DIR / "orb-residential-sccif-source-signoff-review.md",
}

SOURCE_METADATA: dict[SourceTypeKey, dict[str, Any]] = {
    "guide": {
        "source_type": "guide",
        "source_id": SOURCE_TYPE_TO_ID["guide"],
        "source_title": EXPECTED_GUIDE_SOURCE_TITLE,
        "official_url": EXPECTED_GUIDE_OFFICIAL_URL,
        "publisher": EXPECTED_GUIDE_PUBLISHER,
        "jurisdiction": "England",
        "source_kind": "DfE practice guidance",
        "version": EXPECTED_GUIDE_VERSION,
        "chunk_path": str(GUIDE_CHUNKS_PATH.relative_to(ROOT)),
        "source_path": None,
        "chunk_count": EXPECTED_GUIDE_CHUNK_COUNT,
        "source_checksum": None,
        "chunk_checksum": EXPECTED_GUIDE_CHUNK_SHA256,
    },
    "regulations_2015": {
        "source_type": "regulations_2015",
        "source_id": SOURCE_TYPE_TO_ID["regulations_2015"],
        "source_title": EXPECTED_REGULATIONS_SOURCE_TITLE,
        "official_url": EXPECTED_REGULATIONS_OFFICIAL_URL,
        "publisher": EXPECTED_REGULATIONS_PUBLISHER,
        "jurisdiction": "England",
        "source_kind": "Statutory instrument (regulations)",
        "version": EXPECTED_REGULATIONS_VERSION,
        "chunk_path": str(REGULATIONS_CHUNKS_PATH.relative_to(ROOT)),
        "source_path": str(REGULATIONS_SOURCE_PATH.relative_to(ROOT)),
        "chunk_count": EXPECTED_REGULATIONS_CHUNK_COUNT,
        "source_checksum": EXPECTED_REGULATIONS_SOURCE_SHA256,
        "chunk_checksum": EXPECTED_REGULATIONS_CHUNK_SHA256,
    },
    "sccif": {
        "source_type": "sccif",
        "source_id": SOURCE_TYPE_TO_ID["sccif"],
        "source_title": EXPECTED_SCCIF_SOURCE_TITLE,
        "official_url": EXPECTED_SCCIF_OFFICIAL_URL,
        "publisher": EXPECTED_SCCIF_PUBLISHER,
        "jurisdiction": "England",
        "source_kind": "Ofsted inspection framework",
        "version": EXPECTED_SCCIF_VERSION,
        "chunk_path": str(SCCIF_CHUNKS_PATH.relative_to(ROOT)),
        "source_path": str(SCCIF_SOURCE_PATH.relative_to(ROOT)),
        "chunk_count": EXPECTED_SCCIF_CHUNK_COUNT,
        "source_checksum": EXPECTED_SCCIF_SOURCE_SHA256,
        "chunk_checksum": EXPECTED_SCCIF_CHUNK_SHA256,
    },
}

FORBIDDEN_POSITIVE_CLAIM_PATTERNS = (
    r"sign-off has been completed",
    r"named sign-off is complete",
    r"live source-grounded answers are enabled",
    r"live source-grounded answers is enabled",
    r"runtime_answer_wiring_enabled:\s*true",
    r"\borb guarantees compliance\b",
    r"\bguarantees compliance\b",
    r"\bofsted ready\b",
    r"\binspection readiness confirmed\b",
    r"this review pack enables live",
)

def _has_forbidden_positive_claim(content: str, pattern: str) -> bool:
    for match in re.finditer(pattern, content, re.I):
        start = match.start()
        prefix = content[max(0, start - 40):start].lower()
        if any(token in prefix for token in ("not ", "does not ", "do not ", "no ", "never ", "**no**")):
            continue
        return True
    return False


def _content_has_phrase(content: str, phrase: str) -> bool:
    return phrase.lower() in content.lower()


GUIDE_REQUIRED_PHRASES = (
    "care standards",
    "safer recording",
    "reflection",
    "quality of care",
    "not legal advice",
    "does not decide statutory compliance",
    "professional judgement",
    "Registered Manager",
    "provider judgement",
)

REGULATIONS_REQUIRED_PHRASES = (
    "statutory",
    "regulatory text",
    "does not provide legal advice",
    "does not decide statutory compliance",
    "Regulation 40",
    "notification thresholds",
    "local policy",
    "Registered Manager",
    "provider judgement",
)

SCCIF_REQUIRED_PHRASES = (
    "inspection/evaluation framework",
    "evidence review",
    "inspection preparation",
    "does not predict Ofsted judgements",
    "does not grade the home",
    "does not decide inspection readiness",
    "does not confirm evidence meets Good or Outstanding",
    "Ofsted makes inspection judgements",
)


def _policy() -> Any:
    return orb_residential_source_answer_policy_service


def _workflows_for_source(source_type: SourceTypeKey) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for workflow_type, routing in WORKFLOW_ROUTING.items():
        primary = list(routing["primary_source_types"])
        secondary = list(routing["secondary_source_types"])
        if source_type in primary:
            role = "primary"
        elif source_type in secondary:
            role = "secondary"
        else:
            continue
        rows.append(
            {
                "workflow_type": workflow_type,
                "display_name": routing["display_name"],
                "role": role,
                "secondary_conditions": routing.get("secondary_conditions", {}).get(source_type),
            }
        )
    return rows


def _boundary_rows_for_source(source_type: SourceTypeKey) -> list[dict[str, str]]:
    policy = _policy()
    rows: list[dict[str, str]] = []
    seen: set[str] = set()
    for workflow_type, routing in WORKFLOW_ROUTING.items():
        primary = list(routing["primary_source_types"])
        secondary = list(routing["secondary_source_types"])
        if source_type not in primary and source_type not in secondary:
            continue
        for boundary_id in policy.required_boundary_statement_ids(workflow_type):
            if boundary_id in seen:
                continue
            seen.add(boundary_id)
            rows.append(
                {
                    "boundary_id": boundary_id,
                    "canonical_text": policy.canonical_boundary_text(boundary_id),
                }
            )
    return rows


def _unsafe_blocker_codes() -> list[str]:
    return list(_policy().unsafe_output_blockers())


def build_source_review_pack(source_type: SourceTypeKey) -> dict[str, Any]:
    meta = dict(SOURCE_METADATA[source_type])
    role = dict(SOURCE_ROLES[source_type])
    eligibility = _policy().source_eligibility(source_type)
    signoff_status = {
        "signed_off": False,
        "artefact_present": SIGNOFF_ARTEFACT_PATH.is_file(),
        "template_only": True,
        "synthetic_review_sufficient": False,
    }
    return {
        **meta,
        "source_role": role,
        "citation_policy": dict(CITATION_RULES),
        "retrieval_policy": dict(SOURCE_BUNDLE_LIMITS),
        "workflow_routing": _workflows_for_source(source_type),
        "boundary_statements": _boundary_rows_for_source(source_type),
        "unsafe_output_blockers": _unsafe_blocker_codes(),
        "live_answer_wiring_enabled": eligibility["live_answer_wiring_enabled"],
        "citable_in_live_answers": eligibility["citable_in_live_answers"],
        "offline_verified": eligibility["offline_verified"],
        "signoff_status": signoff_status,
        "checksum_expectations": dict(SOURCE_CHECKSUM_EXPECTATIONS[source_type]),
    }


def _render_workflow_table(rows: list[dict[str, Any]]) -> str:
    lines = [
        "| Workflow | Role | Notes |",
        "|---|---|---|",
    ]
    for row in rows:
        condition = row.get("secondary_conditions") or "—"
        lines.append(
            f"| {row['display_name']} (`{row['workflow_type']}`) | {row['role']} | {condition} |"
        )
    return "\n".join(lines)


def _render_boundary_table(rows: list[dict[str, str]]) -> str:
    lines = [
        "| Boundary ID | Canonical text |",
        "|---|---|",
    ]
    for row in rows:
        lines.append(f"| `{row['boundary_id']}` | {row['canonical_text']} |")
    return "\n".join(lines)


def _render_citation_policy(citation_policy: dict[str, Any]) -> str:
    lines = []
    for key, value in citation_policy.items():
        if isinstance(value, bool):
            display = "Yes" if value else "No"
        else:
            display = str(value)
        lines.append(f"- **{key.replace('_', ' ')}:** {display}")
    return "\n".join(lines)


def _render_retrieval_policy(retrieval_policy: dict[str, Any]) -> str:
    return "\n".join(f"- **{key.replace('_', ' ')}:** {value}" for key, value in retrieval_policy.items())


def _attestation_section(source_type: SourceTypeKey) -> str:
    common = """A future named reviewer completing `named_source_signoffs.json` would attest that they have:

- verified source and chunk checksums against current offline artefacts;
- approved source role, citation policy, routing policy, unsafe-output blockers and boundary statements;
- acknowledged local policy limitations and professional judgement boundaries;
- confirmed ORB does not provide legal advice or compliance guarantees;
- rejected synthetic review as sufficient;
- confirmed NR-1 controls remain in place;
- confirmed public promise remains blocked unless separately approved;
- signed as a named human with organisational accountability.

A future named reviewer would **not** be attesting that:

- live wiring for source-grounded answers has been enabled;
- per-source runtime answer wiring has been turned on;
- NR-1 is closed;
- a public promise has been approved;
- ORB has guaranteed compliance, inspection outcomes or safeguarding decisions;
- sign-off alone enables live wiring."""
    if source_type == "guide":
        extra = """
Guide-specific attestation would additionally confirm the Guide supports care standards, safer recording, reflection and quality of care — and that the Guide is not legal advice, does not decide statutory compliance, and does not replace Registered Manager, provider or professional judgement."""
    elif source_type == "regulations_2015":
        extra = """
Regulations-specific attestation would additionally confirm the Regulations are statutory/regulatory text supporting understanding of duties — and that ORB does not provide legal advice, does not decide statutory compliance, does not decide whether Regulation 40 applies, and does not decide notification thresholds. Local policy and Registered Manager/provider judgement remain required."""
    else:
        extra = """
SCCIF-specific attestation would additionally confirm SCCIF is an inspection/evaluation framework supporting evidence review and inspection preparation — and that ORB does not predict Ofsted judgements, grade the home, decide inspection readiness, or confirm evidence meets Good or Outstanding. Ofsted makes inspection judgements."""
    return common + extra


def render_source_review_markdown(pack: dict[str, Any]) -> str:
    source_type: SourceTypeKey = pack["source_type"]
    role = pack["source_role"]
    checksum_lines = []
    if pack.get("source_checksum"):
        checksum_lines.append(f"- **Source checksum (SHA-256):** `{pack['source_checksum']}`")
    checksum_lines.append(f"- **Chunk checksum (SHA-256):** `{pack['chunk_checksum']}`")
    checksum_block = "\n".join(checksum_lines)
    source_path_line = (
        f"- **Source artefact path:** `{pack['source_path']}`\n" if pack.get("source_path") else ""
    )

    return f"""# ORB Residential — {pack['source_title']} — Named Source Sign-Off Review Pack

**Phase:** 2k — review pack prep (not completed sign-off)  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Source type:** `{source_type}`  
**Source ID:** `{pack['source_id']}`

> **This document is a review pack only.** Reading or completing this pack does **not** constitute named sign-off, does **not** create `named_source_signoffs.json`, and does **not** enable live source-grounded ORB answers.

## Source metadata

| Field | Value |
|---|---|
| Source title | {pack['source_title']} |
| Source ID | `{pack['source_id']}` |
| Official URL | {pack['official_url']} |
| Publisher | {pack['publisher']} |
| Jurisdiction | {pack['jurisdiction']} |
| Source kind | {pack['source_kind']} |
| Version | {pack['version']} |
| Chunk count | {pack['chunk_count']} |
| Offline verified | {pack['offline_verified']} |
| Live wiring status | **blocked** (`runtime_answer_wiring_enabled: false`) |
| Citable in live answers | **false** |
| Sign-off status | **unsigned** — no committed `named_source_signoffs.json` record |
| Synthetic review sufficient | **No** |

## Committed artefact inventory

- **Chunk artefact path:** `{pack['chunk_path']}`
{source_path_line}{checksum_block}

## Source role in ORB

- **Role:** {role['role']}
- **Supports:** {role['supports']}

### What this source may support

- {role['supports']}
- Workflow routing where this source is primary or secondary (see table below)
- Offline verified chunk retrieval in governed preview/evaluation paths only

### What this source must not be used for

{_source_limitations(source_type, role)}

## Citation policy

{_render_citation_policy(pack['citation_policy'])}

## Retrieval policy

{_render_retrieval_policy(pack['retrieval_policy'])}

## Workflow routing role

{_render_workflow_table(pack['workflow_routing'])}

## Required boundary statements

{_render_boundary_table(pack['boundary_statements'])}

## Unsafe-output blockers

The runtime enforcement gate blocks answers matching these blocker codes:

{chr(10).join(f"- `{code}`" for code in pack['unsafe_output_blockers'])}

## Professional, legal and local policy limitations

- **Local policy limitations:** ORB does not replace provider policies, escalation routes, safeguarding procedures or organisational thresholds.
- **Professional judgement limitations:** Adults, Registered Managers, Responsible Individuals and providers remain accountable for decisions.
- **Legal advice limitation:** ORB does not provide legal advice.
- **Compliance limitation:** ORB does not guarantee compliance and does not decide statutory compliance.

## Live wiring and sign-off status

| Control | Current status |
|---|---|
| `runtime_answer_wiring_enabled` | **false** |
| `citable_in_live_answers` | **false** |
| `named_source_signoffs.json` present | **false** |
| Template treated as sign-off | **false** — template is scaffold only |
| Source signed off | **false** |
| Live source-grounded answers | **blocked** |
| NR-1 | **open** |
| Public promise | **blocked** |

## What a future named reviewer would be attesting to

{_attestation_section(source_type)}

## How this links to future `named_source_signoffs.json`

After review, a named reviewer may complete a governed record in `data/orb_residential_governance/named_source_signoffs.json` using `named_source_signoffs.template.json` as the field scaffold. That artefact must pass `scripts/verify_orb_named_source_signoffs.py --verify-committed`.

Sign-off alone still does **not** enable live source-grounded answers. Live enablement additionally requires runtime wiring enablement, NR-1 clearance for wiring, Phase 2f/2h gate passage, and public-promise review where applicable.

## Reviewer guidance

**Who should review:** Registered Manager, Responsible Individual, or delegated governance/quality lead with authority over this source layer.

**What the reviewer is asked to confirm:** offline artefact checksums, source role, routing, citation rules, boundaries, unsafe-output blockers, and limitation acknowledgements listed above.

**What the reviewer is not asked to confirm:** live enablement, compliance guarantees, inspection outcomes, or that sign-off has already happened.

---
*Generated by `scripts/generate_orb_source_signoff_review_pack.py`. This file is documentation only.*
"""


def _source_limitations(source_type: SourceTypeKey, role: dict[str, Any]) -> str:
    if source_type == "guide":
        return """- Legal advice or statutory compliance decisions
- Replacing Registered Manager judgement, provider judgement or professional judgement
- Offering compliance guarantees
- Live citation-backed answers (currently blocked)"""
    if source_type == "regulations_2015":
        return """- Legal advice
- Deciding statutory compliance
- Deciding whether Regulation 40 applies
- Deciding notification thresholds
- Replacing Registered Manager/provider judgement on notification decisions
- Live citation-backed answers (currently blocked)"""
    return """- Predicting Ofsted judgements
- ORB does not grade the home
- ORB does not decide inspection readiness
- ORB does not confirm evidence meets Good or Outstanding
- Replacing inspector judgement — Ofsted makes inspection judgements
- Live citation-backed answers (currently blocked)"""


def render_overview_markdown(packs: dict[SourceTypeKey, dict[str, Any]]) -> str:
    return f"""# ORB Residential — Named Source Sign-Off Review Pack (Overview)

**Phase:** 2k — review pack prep  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Date:** 2026-06-29

## Purpose

This review pack prepares the material a **named human reviewer** needs before they can safely complete a future `data/orb_residential_governance/named_source_signoffs.json`. It supports accountable review of Guide, Regulations 2015 and SCCIF children's homes source layers.

## This is a review pack — not completed sign-off

| Question | Answer |
|---|---|
| Is this completed named sign-off? | **No** |
| Does reading this pack enable live source-grounded answers? | **No** — this pack does not enable live source-grounded answering |
| Is `named_source_signoffs.json` created? | **No** |
| Is the template treated as sign-off? | **No** |
| Are all sources signed off? | **No** — all remain unsigned |
| Does sign-off alone enable live wiring? | **No** |
| Is NR-1 closed? | **No** — NR-1 remains open |
| Is public promise approved? | **No** — public promise remains blocked |

## Source-specific review packs

| Source | Review pack |
|---|---|
| Guide to the Children's Homes Regulations | `docs/review-packs/orb-residential-guide-source-signoff-review.md` |
| Children's Homes Regulations 2015 | `docs/review-packs/orb-residential-regulations-2015-source-signoff-review.md` |
| SCCIF children's homes | `docs/review-packs/orb-residential-sccif-source-signoff-review.md` |

## Verified source summary

| Source | Source ID | Chunks | Live wiring | Citable | Signed off |
|---|---|---:|---|---|---|
| Guide | `{packs['guide']['source_id']}` | {packs['guide']['chunk_count']} | blocked | false | false |
| Regulations 2015 | `{packs['regulations_2015']['source_id']}` | {packs['regulations_2015']['chunk_count']} | blocked | false | false |
| SCCIF | `{packs['sccif']['source_id']}` | {packs['sccif']['chunk_count']} | blocked | false | false |

## How to use this review pack

1. Read this overview and the three source-specific packs.
2. Run chunk verifiers (`verify_orb_guide_chunks.py`, `verify_orb_regulations_2015_chunks.py`, `verify_orb_sccif_children_homes_chunks.py`) and confirm checksums match this pack.
3. Review source role, workflow routing, citation policy, boundaries and unsafe-output blockers in each pack.
4. Confirm limitations (legal advice, compliance, professional judgement, local policy).
5. If satisfied, complete a **separate future PR** committing validated `named_source_signoffs.json` with real named reviewer records.

## Who should review

| Source | Suggested reviewer |
|---|---|
| Guide | Registered Manager, Responsible Individual, or governance/compliance lead |
| Regulations 2015 | Registered Manager, Responsible Individual, or legal/governance/regulatory lead |
| SCCIF | Registered Manager, Responsible Individual, or quality/inspection-readiness lead |

## What reviewers are asked to confirm

- Offline source/chunk artefacts and checksums
- Source role, citation policy and routing policy
- Boundary statements and unsafe-output blockers
- Local policy and professional judgement limitations
- ORB does not provide legal advice or compliance guarantees
- Synthetic review is not sufficient
- NR-1 controls remain in place
- Public promise remains blocked

## What reviewers are not asked to confirm

- That sign-off has already happened
- That live wiring for source-grounded answers has been enabled
- Compliance, inspection readiness, Ofsted grades, or safeguarding decisions
- That reviewing this pack enables live answering

## Why sign-off is separate from live enablement

Named sign-off is necessary but not sufficient. Live enablement also requires:

1. Committed valid `named_source_signoffs.json` per source used
2. Phase 2e policy pass
3. Phase 2f retrieval gate pass
4. Phase 2g/2h runtime enforcement pass
5. Phase 2j assembly integration clearance (hard block currently active)
6. Per-source runtime answer wiring explicitly enabled in a future governed phase (currently false for all sources)
7. NR-1 closed or explicitly cleared for this wiring
8. Public-promise separate approval if any public claim is made

## Why source-grounded live answers remain blocked

Phase 2j keeps `source_grounded_assembly_allowed: false`, `hard_live_enablement_block_active: true`, and `live_source_grounded_answers_enabled: false`. No source chunks are sent to the LLM and no source citations are returned to users.

## Why NR-1 remains open

NR-1 AI egress governance remains open. This review pack does not close NR-1 or clear wiring for live source-grounded answers.

## Why public promise remains blocked

No public promise text is drafted or published. Sign-off records must keep `public_promise_remains_blocked: true` until a separate governed approval process completes.

## Governance links

- Schema: `schemas/orb_residential_named_source_signoff.schema.json`
- Template (scaffold only): `data/orb_residential_governance/named_source_signoffs.template.json`
- Verifier: `scripts/verify_orb_named_source_signoffs.py`
- Generator: `scripts/generate_orb_source_signoff_review_pack.py`

---
*Generated by `scripts/generate_orb_source_signoff_review_pack.py`. Documentation only — not completed sign-off.*
"""


def write_review_packs(output_dir: Path = REVIEW_PACK_DIR) -> dict[SourceTypeKey, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    packs = {source_type: build_source_review_pack(source_type) for source_type in SOURCE_REVIEW_PATHS}
    OVERVIEW_PATH.write_text(render_overview_markdown(packs), encoding="utf-8")
    written: dict[SourceTypeKey, Path] = {"overview": OVERVIEW_PATH}  # type: ignore[assignment]
    for source_type, path in SOURCE_REVIEW_PATHS.items():
        path.write_text(render_source_review_markdown(packs[source_type]), encoding="utf-8")
        written[source_type] = path
    return written


def verify_review_packs(output_dir: Path = REVIEW_PACK_DIR) -> list[str]:
    errors: list[str] = []
    expected_paths = [OVERVIEW_PATH, *SOURCE_REVIEW_PATHS.values()]
    for path in expected_paths:
        if not path.is_file():
            errors.append(f"missing review pack file: {path}")

    if SIGNOFF_ARTEFACT_PATH.is_file():
        errors.append("completed sign-off artefact must not exist in Phase 2k")

    if not SIGNOFF_TEMPLATE_PATH.is_file():
        errors.append("template sign-off file missing")

    packs = {source_type: build_source_review_pack(source_type) for source_type in SOURCE_REVIEW_PATHS}

    for source_type, pack in packs.items():
        content = SOURCE_REVIEW_PATHS[source_type].read_text(encoding="utf-8") if SOURCE_REVIEW_PATHS[source_type].is_file() else ""
        if pack["source_id"] not in content:
            errors.append(f"{source_type}: source_id missing from review pack")
        if str(pack["chunk_count"]) not in content:
            errors.append(f"{source_type}: chunk count missing from review pack")
        if pack["chunk_checksum"] not in content:
            errors.append(f"{source_type}: chunk checksum missing from review pack")
        if pack.get("source_checksum") and pack["source_checksum"] not in content:
            errors.append(f"{source_type}: source checksum missing from review pack")
        if "blocked" not in content.lower():
            errors.append(f"{source_type}: live wiring blocked wording missing")
        if "citable in live answers | **false**" not in content.lower().replace("**", ""):
            if "citable in live answers" not in content.lower() or "false" not in content.lower():
                errors.append(f"{source_type}: citable live answer blocked wording missing")
        if "unsigned" not in content.lower():
            errors.append(f"{source_type}: unsigned status missing")
        if "synthetic review sufficient | **no**" not in content.lower().replace("**", ""):
            if "synthetic review" not in content.lower():
                errors.append(f"{source_type}: synthetic review insufficiency missing")
        for pattern in FORBIDDEN_POSITIVE_CLAIM_PATTERNS:
            if _has_forbidden_positive_claim(content, pattern):
                errors.append(f"{source_type}: forbidden claim pattern matched: {pattern}")

        required = {
            "guide": GUIDE_REQUIRED_PHRASES,
            "regulations_2015": REGULATIONS_REQUIRED_PHRASES,
            "sccif": SCCIF_REQUIRED_PHRASES,
        }[source_type]
        for phrase in required:
            if not _content_has_phrase(content, phrase):
                errors.append(f"{source_type}: required phrase missing: {phrase}")

    overview = OVERVIEW_PATH.read_text(encoding="utf-8") if OVERVIEW_PATH.is_file() else ""
    overview_required = (
        "review pack",
        "not completed sign-off",
        "does not enable live source-grounded answering",
        "named_source_signoffs.json",
        "NR-1 remains open",
        "public promise remains blocked",
        "sign-off alone",
    )
    for phrase in overview_required:
        if not _content_has_phrase(overview, phrase):
            errors.append(f"overview: required phrase missing: {phrase}")
    for pattern in FORBIDDEN_POSITIVE_CLAIM_PATTERNS:
        if _has_forbidden_positive_claim(overview, pattern):
            errors.append(f"overview: forbidden claim pattern matched: {pattern}")

    for source_type, pack in packs.items():
        expectations = SOURCE_CHECKSUM_EXPECTATIONS[source_type]
        if expectations.get("chunk_checksum") != pack["chunk_checksum"]:
            errors.append(f"{source_type}: chunk checksum drift from verifier expectations")
        if expectations.get("source_checksum") and expectations["source_checksum"] != pack.get("source_checksum"):
            errors.append(f"{source_type}: source checksum drift from verifier expectations")
        if pack["source_id"] != SOURCE_TYPE_TO_ID[source_type]:
            errors.append(f"{source_type}: source_id mismatch")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write review pack markdown files")
    parser.add_argument("--verify", action="store_true", help="Verify committed review pack files")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REVIEW_PACK_DIR,
        help="Review pack output directory",
    )
    args = parser.parse_args()

    if args.write:
        paths = write_review_packs(args.output_dir)
        for label, path in paths.items():
            print(f"Wrote {label}: {path}")

    if args.verify or not args.write:
        errors = verify_review_packs(args.output_dir)
        if errors:
            for error in errors:
                print(f"ERROR: {error}", file=sys.stderr)
            return 1
        print("Review pack verification passed.")
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
