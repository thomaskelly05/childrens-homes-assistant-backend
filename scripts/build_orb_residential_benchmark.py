#!/usr/bin/env python3
"""Build ORB Residential benchmark artefacts: index, core100, variants1000, convergence report."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from assistant.evals.orb_residential_core_scenarios_data import CORE_100_DEFINITIONS  # noqa: E402
from assistant.evals.orb_residential_scenario_safety import validate_scenarios_batch  # noqa: E402
from assistant.evals.orb_residential_scenario_schema import (  # noqa: E402
    FEATURE_TARGETS,
    RECORD_TYPES,
    REQUIRED_SCENARIO_FIELDS,
    SCHEMA_VERSION,
    VARIANT_TYPES,
    validate_scenario_fields,
)
from assistant.knowledge.orb_expert_scenarios import GOLD_ORB_EXPERT_SCENARIOS  # noqa: E402

QUALITY_DIR = ROOT / "quality"
REPORTS_DIR = ROOT / "reports"

AUDIT_SOURCES: list[dict[str, Any]] = [
    {
        "path": "quality/orb_residential_baseline_scenarios.json",
        "type": "recording_baseline",
        "scored": True,
        "fixture_outputs": True,
    },
    {
        "path": "assistant/knowledge/orb_expert_scenarios.py",
        "type": "expert_chat_stress",
        "scored": True,
        "fixture_outputs": False,
    },
    {
        "path": "assistant/knowledge/orb_scenario_sequences.json",
        "type": "sequence_framework",
        "scored": False,
        "fixture_outputs": False,
    },
    {
        "path": "assistant/evals/fixtures/orb_baseline_outputs/",
        "type": "baseline_fixture_outputs",
        "scored": True,
        "fixture_outputs": True,
    },
    {
        "path": "quality/orb_residential_core_100_scenarios.json",
        "type": "recording_core100",
        "scored": True,
        "fixture_outputs": False,
    },
    {
        "path": "quality/orb_residential_1000_scenario_variants.jsonl",
        "type": "recording_variants",
        "scored": True,
        "fixture_outputs": False,
    },
]


def _normalise_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalise_text(a), _normalise_text(b)).ratio()


def _load_baseline_scenarios() -> list[dict[str, Any]]:
    path = ROOT / "quality" / "orb_residential_baseline_scenarios.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    return list(payload.get("scenarios") or [])


def audit_sources() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    baseline = _load_baseline_scenarios()
    fixtures_dir = ROOT / "assistant" / "evals" / "fixtures" / "orb_baseline_outputs"
    fixture_count = len(list(fixtures_dir.glob("*.md"))) if fixtures_dir.is_dir() else 0
    seq_path = ROOT / "assistant" / "knowledge" / "orb_scenario_sequences.json"
    seq_count = 0
    if seq_path.is_file():
        seq_payload = json.loads(seq_path.read_text(encoding="utf-8"))
        seq_count = len(seq_payload.get("sequences") or {})

    for src in AUDIT_SOURCES:
        path = ROOT / src["path"]
        count = 0
        synthetic = True
        overlaps: list[str] = []
        safe = True
        converge = False

        if src["path"].endswith("orb_residential_baseline_scenarios.json"):
            count = len(baseline)
        elif src["path"].endswith("orb_expert_scenarios.py"):
            count = len(GOLD_ORB_EXPERT_SCENARIOS)
        elif src["path"].endswith("orb_scenario_sequences.json"):
            count = seq_count
        elif src["path"].endswith("orb_baseline_outputs/"):
            count = fixture_count
        elif path.is_file():
            if path.suffix == ".jsonl":
                count = sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
            elif path.suffix == ".json":
                payload = json.loads(path.read_text(encoding="utf-8"))
                count = len(payload.get("scenarios") or [])

        if src["type"] == "recording_baseline":
            converge = True
            overlaps = ["maps to core100 via baseline_id"]
        elif src["type"] == "expert_chat_stress":
            overlaps = ["distinct from recording core100 — advisor prompts"]
            converge = True

        rows.append(
            {
                "source_file": src["path"],
                "scenario_count": count,
                "scenario_type": src["type"],
                "synthetic_anonymised": synthetic,
                "scored": src["scored"],
                "fixture_output_exists": src["fixture_outputs"],
                "duplicate_overlapping": overlaps,
                "safe_to_reuse": safe,
                "should_converge": converge,
            }
        )
    return rows


def find_duplicates(
    core: list[dict[str, Any]],
    baseline: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    duplicates: list[dict[str, Any]] = []
    seen_titles: dict[str, str] = {}
    seen_inputs: dict[str, str] = {}

    for scenario in core + [{"scenario_id": b["id"], **b} for b in baseline]:
        sid = str(scenario.get("scenario_id") or scenario.get("id"))
        title = _normalise_text(scenario.get("title") or "")
        inp = _normalise_text(scenario.get("input") or "")

        if title in seen_titles:
            duplicates.append(
                {
                    "type": "exact_title",
                    "scenario_a": seen_titles[title],
                    "scenario_b": sid,
                    "detail": title[:80],
                }
            )
        else:
            seen_titles[title] = sid

        if inp in seen_inputs and inp:
            duplicates.append(
                {
                    "type": "exact_input",
                    "scenario_a": seen_inputs[inp],
                    "scenario_b": sid,
                    "detail": inp[:80],
                }
            )
        else:
            seen_inputs[inp] = sid

    # Near-duplicate input within same record_type
    by_rt: dict[str, list[dict[str, Any]]] = {}
    for scenario in core:
        rt = str(scenario.get("record_type"))
        by_rt.setdefault(rt, []).append(scenario)
    for rt, group in by_rt.items():
        for i, a in enumerate(group):
            for b in group[i + 1 :]:
                sim = _similarity(a.get("input", ""), b.get("input", ""))
                if sim >= 0.92:
                    duplicates.append(
                        {
                            "type": "similar_input_same_record_type",
                            "scenario_a": a["scenario_id"],
                            "scenario_b": b["scenario_id"],
                            "record_type": rt,
                            "similarity": round(sim, 3),
                        }
                    )
    return duplicates


def build_index(core: list[dict[str, Any]], baseline: list[dict[str, Any]]) -> dict[str, Any]:
    entries: list[dict[str, Any]] = []

    for scenario in core:
        entry: dict[str, Any] = {
            "canonical_id": scenario["scenario_id"],
            "title": scenario["title"],
            "scenario_family": scenario["scenario_family"],
            "record_type": scenario["record_type"],
            "feature_target": scenario["feature_target"],
            "source": scenario["source"],
            "original_sources": [],
        }
        if scenario.get("baseline_id"):
            entry["original_sources"].append(
                {
                    "source_file": "quality/orb_residential_baseline_scenarios.json",
                    "original_id": scenario["baseline_id"],
                    "relationship": "baseline_converged",
                }
            )
        entries.append(entry)

    baseline_ids_in_core = {s.get("baseline_id") for s in core if s.get("baseline_id")}
    for b in baseline:
        if b["id"] not in baseline_ids_in_core:
            entries.append(
                {
                    "canonical_id": b["id"],
                    "title": b["title"],
                    "scenario_family": "baseline_legacy",
                    "record_type": b["record_type"],
                    "feature_target": "ORB Write",
                    "source": "quality/orb_residential_baseline_scenarios.json",
                    "original_sources": [{"source_file": "quality/orb_residential_baseline_scenarios.json", "original_id": b["id"], "relationship": "baseline_only"}],
                }
            )

    for expert in GOLD_ORB_EXPERT_SCENARIOS:
        entries.append(
            {
                "canonical_id": expert["scenario_id"],
                "title": expert["title"],
                "scenario_family": expert.get("family"),
                "record_type": "advisor_prompt",
                "feature_target": "Chat",
                "source": "assistant/knowledge/orb_expert_scenarios.py",
                "original_sources": [
                    {
                        "source_file": "assistant/knowledge/orb_expert_scenarios.py",
                        "original_id": expert["scenario_id"],
                        "relationship": "expert_gold",
                    }
                ],
            }
        )

    return {
        "version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_entries": len(entries),
        "core100_count": len(core),
        "baseline15_count": len(baseline),
        "expert_gold_count": len(GOLD_ORB_EXPERT_SCENARIOS),
        "entries": entries,
    }


def _variant_input(core: dict[str, Any], variant_type: str, variant_num: int) -> str:
    base = str(core.get("input") or "")
    title = core.get("title") or ""
    if variant_type == "rough_note":
        return f"rough: {base[:120].lower().replace('.', '')}"
    if variant_type == "manager_oversight":
        return f"Manager review of: {title}. Facts from shift: {base[:200]}"
    if variant_type == "handover":
        return f"Handover summary — {title}: {base[:180]}"
    if variant_type == "mobile_friendly":
        return f"{base[:150]} [recorded on mobile, brief]"
    if variant_type == "child_centred_rewrite":
        return f"Rewrite child-centred: {base}"
    if variant_type == "safeguarding_escalation":
        flags = core.get("safeguarding_flags") or []
        if flags:
            return f"{base} DSL pathway required."
        return f"{base} Check if safeguarding escalation needed — not stated."
    if variant_type == "reg44_evidence":
        return f"Reg 44 evidence note for: {title}. {base[:160]}"
    if variant_type == "poor_wording_correction":
        return f"yp kicked off again. staff firm. {base[:80]}"
    if variant_type == "voice_dictate_transcript":
        return f"um {base[:100]} uh staff um helped um"
    if variant_type == "reflective_supervision":
        return f"Supervision reflection on {title}: {base[:160]}"
    return base


def build_variants(core: list[dict[str, Any]]) -> list[dict[str, Any]]:
    variants: list[dict[str, Any]] = []
    for core_scenario in core:
        for vnum, variant_type in enumerate(VARIANT_TYPES, start=1):
            core_id = core_scenario["scenario_id"]
            variant_id = f"{core_id}_v{vnum:02d}_{variant_type}"
            inp = _variant_input(core_scenario, variant_type, vnum)
            variant = {
                **{k: v for k, v in core_scenario.items() if k != "baseline_id"},
                "scenario_id": variant_id,
                "title": f"{core_scenario['title']} — {variant_type.replace('_', ' ')}",
                "source": "variants1000_generator",
                "parent_scenario_id": core_id,
                "variant_type": variant_type,
                "variant_index": vnum,
                "input": inp,
                "synthetic_data_confirmation": True,
            }
            # Adjust feature target for some variant types
            ft_map = {
                "rough_note": "Magic Notes",
                "voice_dictate_transcript": "Voice",
                "manager_oversight": "Management oversight",
                "reg44_evidence": "Regulation evidence",
                "reflective_supervision": "Management oversight",
            }
            if variant_type in ft_map:
                variant["feature_target"] = ft_map[variant_type]
            variants.append(variant)
    return variants


def write_schema_json() -> None:
    schema = {
    "version": SCHEMA_VERSION,
    "description": "Canonical ORB Residential Quality Lab scenario schema — synthetic anonymised only.",
    "required_fields": list(REQUIRED_SCENARIO_FIELDS),
    "feature_targets": list(FEATURE_TARGETS),
    "difficulty_levels": list(("basic", "moderate", "complex", "high-risk")),
    "regulatory_contexts": list(
        (
            "daily living", "safeguarding", "behaviour", "health", "education",
            "family contact", "missing from care", "restraint / physical intervention",
            "medication", "allegation", "complaints", "equality / identity",
            "transitions", "placement planning", "leadership / management", "Reg 44", "Reg 45",
        )
    ),
    "record_types": list(RECORD_TYPES),
    "variant_types": list(VARIANT_TYPES),
    "safety_constraints": [
      "no real names",
      "no exact dates of birth",
      "no real addresses",
      "no real provider names",
      "no real local authority names",
      "no live safeguarding narratives",
      "no unique identifiers",
      "synthetic_data_confirmation must be true",
    ],
  }
    path = QUALITY_DIR / "orb_residential_scenario_schema.json"
    path.write_text(json.dumps(schema, indent=2), encoding="utf-8")


def write_convergence_report(
    audit: list[dict[str, Any]],
    duplicates: list[dict[str, Any]],
    core: list[dict[str, Any]],
    variants: list[dict[str, Any]],
) -> None:
    baseline = _load_baseline_scenarios()
    total_before = len(baseline) + len(GOLD_ORB_EXPERT_SCENARIOS)
    lines = [
        "# ORB Residential Scenario Convergence Report",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Summary",
        "",
        f"- Scenarios found before convergence: **{total_before}** (15 baseline + 100 expert gold)",
        f"- Core 100 recording scenarios: **{len(core)}**",
        f"- Variants generated: **{len(variants)}**",
        f"- Duplicates/overlaps detected: **{len(duplicates)}**",
        "",
        "## Audit of existing sources",
        "",
        "| Source | Count | Type | Synthetic | Scored | Fixtures | Overlaps | Converge |",
        "| --- | ---: | --- | --- | --- | --- | --- | --- |",
    ]
    for row in audit:
        overlaps = "; ".join(row.get("duplicate_overlapping") or []) or "—"
        lines.append(
            f"| `{row['source_file']}` | {row['scenario_count']} | {row['scenario_type']} | "
            f"{'yes' if row['synthetic_anonymised'] else 'no'} | "
            f"{'yes' if row['scored'] else 'no'} | "
            f"{'yes' if row['fixture_output_exists'] else 'no'} | {overlaps} | "
            f"{'yes' if row['should_converge'] else 'no'} |"
        )

    lines.extend(["", "## Duplicates and overlaps", ""])
    if duplicates:
        for dup in duplicates[:30]:
            lines.append(f"- **{dup['type']}**: `{dup.get('scenario_a')}` ↔ `{dup.get('scenario_b')}`")
        if len(duplicates) > 30:
            lines.append(f"- … and {len(duplicates) - 30} more")
    else:
        lines.append("No exact duplicates detected.")

    lines.extend(
        [
            "",
            "## Convergence actions",
            "",
            "- Baseline 15 scenarios mapped to core100 via `baseline_id` where content matches.",
            "- Expert gold 100 retained as separate advisor bank in canonical index.",
            "- Core 100 is the recording quality lab benchmark.",
            "- 1000 variants generated deterministically (10 per core scenario).",
            "",
            "## Coverage",
            "",
        ]
    )
    rt_counts: dict[str, int] = {}
    ft_counts: dict[str, int] = {}
    for s in core:
        rt_counts[s["record_type"]] = rt_counts.get(s["record_type"], 0) + 1
        ft_counts[s["feature_target"]] = ft_counts.get(s["feature_target"], 0) + 1
    lines.append("### Record types (core100)")
    lines.append("")
    for rt, count in sorted(rt_counts.items()):
        lines.append(f"- `{rt}`: {count}")
    lines.append("")
    lines.append("### Feature targets (core100)")
    lines.append("")
    for ft, count in sorted(ft_counts.items()):
        lines.append(f"- {ft}: {count}")
    lines.append("")

    path = REPORTS_DIR / "orb_residential_scenario_convergence_report.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    QUALITY_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    core = [dict(s) for s in CORE_100_DEFINITIONS]
    # Strip internal baseline_id from exported core (keep in index)
    core_export = []
    for s in core:
        row = {k: v for k, v in s.items() if k != "baseline_id"}
        if s.get("baseline_id"):
            row["source_baseline_id"] = s["baseline_id"]
        core_export.append(row)

    # Validate
    field_errors: list[str] = []
    for s in core_export:
        field_errors.extend(validate_scenario_fields(s))
    safety_errors = validate_scenarios_batch(core_export)
    if field_errors or safety_errors:
        print("Validation errors:", file=sys.stderr)
        for e in field_errors + safety_errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    baseline = _load_baseline_scenarios()
    audit = audit_sources()
    duplicates = find_duplicates(core, baseline)
    index = build_index(core, baseline)
    variants = build_variants(core)

    write_schema_json()

    core_path = QUALITY_DIR / "orb_residential_core_100_scenarios.json"
    core_path.write_text(
        json.dumps({"version": SCHEMA_VERSION, "description": "ORB Residential core 100 benchmark — synthetic only.", "scenarios": core_export}, indent=2),
        encoding="utf-8",
    )

    variants_path = QUALITY_DIR / "orb_residential_1000_scenario_variants.jsonl"
    with variants_path.open("w", encoding="utf-8") as fh:
        for v in variants:
            fh.write(json.dumps(v, ensure_ascii=False) + "\n")

    index_path = QUALITY_DIR / "orb_residential_scenario_index.json"
    index_path.write_text(json.dumps(index, indent=2), encoding="utf-8")

    write_convergence_report(audit, duplicates, core, variants)

    print(f"Wrote {core_path} ({len(core_export)} scenarios)")
    print(f"Wrote {variants_path} ({len(variants)} variants)")
    print(f"Wrote {index_path} ({index['total_entries']} entries)")
    print(f"Duplicates found: {len(duplicates)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
