#!/usr/bin/env python3
"""Generate ORB expert scenario variants from gold scenarios and modifiers."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service  # noqa: E402

DEFAULT_OUTPUT = ROOT / "assistant" / "knowledge" / "generated_orb_scenario_variants.json"


def _maybe_openai_enrich(scenario: dict, *, dry_run: bool) -> dict:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key or dry_run:
        scenario["generated_by"] = scenario.get("generated_by") or "local_generator"
        return scenario
    try:
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=api_key)
        prompt = (
            "Suggest 3 additional expected_markers and 2 must_not_say traps for this "
            "children's home scenario. Return JSON keys: expected_markers, must_not_say. "
            "Do not cite law. Scenario: "
            + json.dumps(
                {
                    "title": scenario.get("title"),
                    "family": scenario.get("family"),
                    "prompt": scenario.get("prompt"),
                }
            )[:1500]
        )
        resp = client.chat.completions.create(
            model=os.environ.get("ORB_SCENARIO_GEN_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        text = (resp.choices[0].message.content or "").strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        extra = json.loads(text)
        scenario["expected_markers"] = list(scenario.get("expected_markers", [])) + list(
            extra.get("expected_markers") or []
        )
        scenario["must_not_say"] = list(scenario.get("must_not_say", [])) + list(
            extra.get("must_not_say") or []
        )
        scenario["generated_by"] = "openai"
    except Exception as exc:  # noqa: BLE001
        scenario["generation_note"] = f"openai_skipped: {exc}"
        scenario["generated_by"] = "local_generator"
    return scenario


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate ORB scenario variants")
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--family", type=str, default="missing_from_care")
    parser.add_argument("--role", type=str, default=None)
    parser.add_argument("--risk", type=str, default=None)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    variants = orb_expert_scenario_bank_service.generate_matrix_variants(
        family_id=args.family,
        count=args.count,
        role=args.role,
        risk_level=args.risk,
    )
    for i, variant in enumerate(variants):
        variants[i] = _maybe_openai_enrich(variant, dry_run=args.dry_run)

    if args.dry_run:
        print(json.dumps({"count": len(variants), "sample": variants[:2]}, indent=2))
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    existing: list[dict] = []
    if args.output.exists():
        existing = json.loads(args.output.read_text(encoding="utf-8"))
    merged = {v["scenario_id"]: v for v in existing if not v.get("generated")}
    for v in variants:
        merged[v["scenario_id"]] = v
    args.output.write_text(json.dumps(list(merged.values()), indent=2), encoding="utf-8")
    print(f"Wrote {len(variants)} variants to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
