#!/usr/bin/env python3
"""Build deterministic 10,000 ORB Residential scenario variants from core100.

100 variants per core scenario — no LLM calls, synthetic anonymised only.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from assistant.evals.orb_residential_core_scenarios_data import CORE_100_DEFINITIONS  # noqa: E402
from assistant.evals.orb_residential_scenario_safety import validate_scenarios_batch  # noqa: E402
from assistant.evals.orb_residential_scenario_schema import (  # noqa: E402
    SCHEMA_VERSION,
    validate_scenario_fields,
    VARIANT_TYPES,
)
from assistant.evals.orb_residential_variant_profiles import (  # noqa: E402
    VARIANTS_PER_CORE,
    build_all_variants_for_core,
)
from scripts.build_orb_residential_benchmark import _variant_input  # noqa: E402

QUALITY_DIR = ROOT / "quality"
OUTPUT_PATH = QUALITY_DIR / "orb_residential_10000_scenario_variants.jsonl"


def build_variants_10000(core: list[dict[str, Any]]) -> list[dict[str, Any]]:
    variants: list[dict[str, Any]] = []
    for core_scenario in core:
        variants.extend(build_all_variants_for_core(core_scenario, _variant_input))
    return variants


def main() -> int:
    QUALITY_DIR.mkdir(parents=True, exist_ok=True)
    core = [dict(s) for s in CORE_100_DEFINITIONS]
    core_export = []
    for s in core:
        row = {k: v for k, v in s.items() if k != "baseline_id"}
        if s.get("baseline_id"):
            row["source_baseline_id"] = s["baseline_id"]
        core_export.append(row)

    variants = build_variants_10000(core_export)
    expected = len(core_export) * VARIANTS_PER_CORE
    if len(variants) != expected:
        print(f"Expected {expected} variants, got {len(variants)}", file=sys.stderr)
        return 1

    field_errors: list[str] = []
    for v in variants[:200]:  # spot-check fields on sample
        field_errors.extend(validate_scenario_fields(v))
    safety_errors = validate_scenarios_batch(variants)
    if field_errors or safety_errors:
        print("Validation errors:", file=sys.stderr)
        for e in (field_errors + safety_errors)[:20]:
            print(f"  - {e}", file=sys.stderr)
        if len(field_errors) + len(safety_errors) > 20:
            print(f"  … and {len(field_errors) + len(safety_errors) - 20} more", file=sys.stderr)
        return 1

    # Unique IDs
    ids = {v["scenario_id"] for v in variants}
    if len(ids) != len(variants):
        print("Duplicate scenario IDs detected", file=sys.stderr)
        return 1

    parents = {v["parent_scenario_id"] for v in variants}
    core_ids = {s["scenario_id"] for s in core_export}
    if parents != core_ids:
        print("Variant parent linkage mismatch", file=sys.stderr)
        return 1

    with OUTPUT_PATH.open("w", encoding="utf-8") as fh:
        for v in variants:
            fh.write(json.dumps(v, ensure_ascii=False) + "\n")

    meta = {
        "version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "core_scenarios": len(core_export),
        "variants_per_core": VARIANTS_PER_CORE,
        "total_variants": len(variants),
        "base_variant_types": list(VARIANT_TYPES),
        "synthetic_only": True,
        "llm_calls": False,
    }
    meta_path = QUALITY_DIR / "orb_residential_10000_variants_meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Wrote {OUTPUT_PATH} ({len(variants)} variants)")
    print(f"Wrote {meta_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
