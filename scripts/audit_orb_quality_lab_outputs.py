#!/usr/bin/env python3
"""Audit ORB Quality Lab scaffold outputs for naturalness and length profile.

Generates:
  reports/orb_quality_lab_output_naturalness_audit.md
  reports/orb_quality_lab_scaffold_length_profile.json
  reports/orb_quality_lab_scaffold_length_profile.md
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from assistant.evals.orb_high_risk_scaffold import build_quality_lab_scaffold  # noqa: E402

VARIANTS1000_PATH = ROOT / "quality" / "orb_residential_1000_scenario_variants.jsonl"
REPORTS_DIR = ROOT / "reports"

HEADING_PATTERN = re.compile(r"^##\s+(.+)$", re.M)
PHRASE_CHECKS = {
    "not yet known": re.compile(r"not yet known", re.I),
    "responsible adult to decide": re.compile(r"responsible adult to decide", re.I),
    "local safeguarding procedure": re.compile(r"local safeguarding procedure", re.I),
    "management oversight": re.compile(r"management oversight", re.I),
    "pathway to consider": re.compile(r"pathway to consider", re.I),
}

FORMULAIC_MARKERS = (
    "Draft only — adult review required",
    "Professional judgement and local policy apply",
    "as observed, not assumed",
    "only as actually provided",
    "not yet known — to be completed",
    "Pathway to consider (responsible adult to decide",
)

FAMILIES_TO_SAMPLE = (
    "daily_care",
    "incident_reflection",
    "safeguarding",
    "behaviour_communication",
    "handover",
    "key_work",
    "magic_notes",
    "meetings",
    "management_oversight",
    "regulation_evidence",
)


def _load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def _sample_scenarios(scenarios: list[dict[str, Any]], min_count: int = 50) -> list[dict[str, Any]]:
    by_family: dict[str, list[dict[str, Any]]] = {}
    for s in scenarios:
        fam = str(s.get("scenario_family") or "unknown")
        by_family.setdefault(fam, []).append(s)

    picked: list[dict[str, Any]] = []
    for fam in FAMILIES_TO_SAMPLE:
        group = by_family.get(fam, [])
        if group:
            step = max(1, len(group) // 5)
            picked.extend(group[::step][:5])
    if len(picked) < min_count:
        step = max(1, len(scenarios) // min_count)
        picked = scenarios[::step][:min_count]
    return picked[: max(min_count, len(picked))]


def _repeated_phrases(outputs: list[str], min_len: int = 20) -> list[tuple[str, int]]:
    counter: Counter[str] = Counter()
    for output in outputs:
        for line in output.splitlines():
            stripped = line.strip()
            if len(stripped) >= min_len and not stripped.startswith("#"):
                counter[stripped] += 1
    return [(phrase, count) for phrase, count in counter.most_common(15) if count >= 3]


def build_length_profile(outputs: list[tuple[dict[str, Any], str]]) -> dict[str, Any]:
    lengths = [len(text) for _, text in outputs]
    heading_counts: list[int] = []
    heading_counter: Counter[str] = Counter()
    phrase_counts: dict[str, int] = {k: 0 for k in PHRASE_CHECKS}

    for _, text in outputs:
        headings = HEADING_PATTERN.findall(text)
        heading_counts.append(len(headings))
        heading_counter.update(headings)
        for key, pattern in PHRASE_CHECKS.items():
            phrase_counts[key] += len(pattern.findall(text))

    all_texts = [t for _, t in outputs]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scenario_count": len(outputs),
        "average_output_length": round(sum(lengths) / (len(lengths) or 1)),
        "shortest_output_length": min(lengths) if lengths else 0,
        "longest_output_length": max(lengths) if lengths else 0,
        "average_heading_count": round(sum(heading_counts) / (len(heading_counts) or 1), 2),
        "most_common_headings": [{"heading": h, "count": c} for h, c in heading_counter.most_common(12)],
        "phrase_frequency": phrase_counts,
        "repeated_phrases": [{"phrase": p, "count": c} for p, c in _repeated_phrases(all_texts)],
        "formulaic_marker_hits": {
            marker: sum(1 for t in all_texts if marker in t) for marker in FORMULAIC_MARKERS
        },
    }


def _is_formulaic(output: str) -> bool:
    hits = sum(1 for m in FORMULAIC_MARKERS if m in output)
    headings = len(HEADING_PATTERN.findall(output))
    return hits >= 4 or headings >= 10


def _is_natural(output: str) -> bool:
    headings = len(HEADING_PATTERN.findall(output))
    return 5 <= headings <= 9 and "child voice" in output.lower()


def build_naturalness_audit(sampled: list[tuple[dict[str, Any], str]]) -> str:
    good: list[str] = []
    formulaic: list[str] = []
    for scenario, output in sampled:
        sid = scenario.get("scenario_id", "?")
        family = scenario.get("scenario_family", "?")
        excerpt = output[:400].replace("\n", " | ")
        entry = f"- `{sid}` ({family}): {excerpt}…"
        if _is_formulaic(output):
            formulaic.append(entry)
        elif _is_natural(output):
            good.append(entry)

    profile = build_length_profile(sampled)
    repeated = profile.get("repeated_phrases") or []
    overused_headings = profile.get("most_common_headings") or []

    lines = [
        "# ORB Quality Lab Output Naturalness Audit",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        f"Sampled **{len(sampled)}** scenarios from variants1000 static scaffold outputs.",
        "",
        "> Internal quality indicator — not a regulatory judgement. Static scaffold mode; no live LLM calls.",
        "",
        "## Summary",
        "",
        f"- Average output length: **{profile['average_output_length']}** characters",
        f"- Average headings per output: **{profile['average_heading_count']}**",
        f"- Natural outputs in sample: **{len(good)}**",
        f"- Formulaic outputs in sample: **{len(formulaic)}**",
        "",
        "## Examples of good outputs",
        "",
    ]
    lines.extend(good[:8] or ["- No standout natural examples in sample threshold."])
    lines.extend(["", "## Examples of formulaic outputs", ""])
    lines.extend(formulaic[:8] or ["- No outputs exceeded formulaic threshold in sample."])
    lines.extend(["", "## Repeated phrases found", ""])
    for row in repeated[:10]:
        lines.append(f"- ({row['count']}×) {row['phrase'][:120]}")
    if not repeated:
        lines.append("- No phrase repeated 3+ times across sample lines.")
    lines.extend(["", "## Sections overused", ""])
    for row in overused_headings[:8]:
        lines.append(f"- `{row['heading']}` — appears in {row['count']} sampled outputs")
    lines.extend(
        [
            "",
            "## Wording that feels artificial",
            "",
            "- Boundary footer and pathway boilerplate repeat across families (expected in static scaffold).",
            "- 'not yet known' prompts are intentional gaps — not invented facts.",
            "- Merged dignity/experience section reduces duplicate headings while keeping child-centred markers.",
            "",
            "## Recommended consolidation changes",
            "",
            "- Keep single shared boundary footer across scaffold types.",
            "- Derive therapeutic principles from `orb_residential_principles.py` + framework JSON SSOT.",
            "- Align `calmed down` replacement to `appeared calmer` across contract service and scaffold.",
            "- Use JSONL streaming for 10,000 scoring; summary-only reports by default.",
            "- Progress logging every 500 scenarios for scale runs.",
            "",
        ]
    )
    return "\n".join(lines)


def render_length_profile_md(profile: dict[str, Any]) -> str:
    lines = [
        "# ORB Quality Lab Scaffold Length Profile",
        "",
        f"Generated: {profile.get('generated_at')}",
        f"Scenarios measured: **{profile.get('scenario_count')}** (variants1000 static scaffold)",
        "",
        "## Length",
        "",
        f"- Average: {profile.get('average_output_length')} chars",
        f"- Shortest: {profile.get('shortest_output_length')} chars",
        f"- Longest: {profile.get('longest_output_length')} chars",
        f"- Average headings: {profile.get('average_heading_count')}",
        "",
        "## Phrase frequency (full variants1000)",
        "",
    ]
    for key, count in (profile.get("phrase_frequency") or {}).items():
        lines.append(f"- `{key}`: {count}")
    lines.extend(["", "## Most common headings", ""])
    for row in profile.get("most_common_headings") or []:
        lines.append(f"- `{row['heading']}`: {row['count']}")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    if not VARIANTS1000_PATH.is_file():
        print(f"Missing {VARIANTS1000_PATH}", file=sys.stderr)
        return 1

    scenarios = _load_jsonl(VARIANTS1000_PATH)
    full_outputs = [(s, build_quality_lab_scaffold(s)) for s in scenarios]
    full_profile = build_length_profile(full_outputs)

    sampled_scenarios = _sample_scenarios(scenarios, min_count=50)
    sampled_outputs = [(s, build_quality_lab_scaffold(s)) for s in sampled_scenarios]

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    json_path = REPORTS_DIR / "orb_quality_lab_scaffold_length_profile.json"
    md_path = REPORTS_DIR / "orb_quality_lab_scaffold_length_profile.md"
    audit_path = REPORTS_DIR / "orb_quality_lab_output_naturalness_audit.md"

    json_path.write_text(json.dumps(full_profile, indent=2), encoding="utf-8")
    md_path.write_text(render_length_profile_md(full_profile), encoding="utf-8")
    audit_path.write_text(build_naturalness_audit(sampled_outputs), encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print(f"Wrote {audit_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
