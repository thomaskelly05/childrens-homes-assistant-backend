#!/usr/bin/env python3
"""Run ORB Residential baseline quality lab — static (CI) or optional live model mode.

Static mode (default): scores fixture outputs representing current template/brain
behaviour. Does not call external LLMs.

Live mode: set ORB_BASELINE_LIVE=1 and configure a provider. Never runs in CI by default.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from assistant.evals.orb_residential_quality_rubric import (  # noqa: E402
    BASELINE_VERSION,
    RUBRIC_CATEGORIES,
    evaluate_output,
    serialise_evaluation,
)
from assistant.services.model_provider_registry import model_provider_registry  # noqa: E402

SCENARIOS_PATH = ROOT / "quality" / "orb_residential_baseline_scenarios.json"
FIXTURES_DIR = ROOT / "assistant" / "evals" / "fixtures" / "orb_baseline_outputs"
REPORTS_DIR = ROOT / "reports"
HISTORY_PATH = REPORTS_DIR / "orb_residential_baseline_history.jsonl"
PREVIOUS_SNAPSHOT_PATH = REPORTS_DIR / "orb_residential_baseline_previous.json"


def _load_previous_report() -> dict[str, Any] | None:
    path = REPORTS_DIR / "orb_residential_baseline_report.json"
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _append_history_snapshot(report: dict[str, Any]) -> None:
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    snapshot = {
        "run_timestamp": report.get("run_timestamp"),
        "commit_sha": report.get("commit_sha"),
        "baseline_version": report.get("baseline_version"),
        "mode": report.get("mode"),
        "average_overall_score": report.get("average_overall_score"),
        "category_averages": report.get("category_averages"),
        "unsafe_flags": report.get("unsafe_flags"),
        "rating_distribution": report.get("rating_distribution"),
    }
    with HISTORY_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(snapshot) + "\n")


def _build_baseline_comparison(
    previous: dict[str, Any] | None,
    current: dict[str, Any],
) -> dict[str, Any] | None:
    if not previous:
        return None
    prev_avg = float(previous.get("average_overall_score") or 0)
    curr_avg = float(current.get("average_overall_score") or 0)
    prev_cats = previous.get("category_averages") or {}
    curr_cats = current.get("category_averages") or {}
    category_delta: dict[str, float] = {}
    for cat in RUBRIC_CATEGORIES:
        if cat in prev_cats and cat in curr_cats:
            category_delta[cat] = round(float(curr_cats[cat]) - float(prev_cats[cat]), 2)

    improved: list[str] = []
    regressed: list[str] = []
    prev_scenarios = {
        str(row.get("scenario_id")): float(row.get("overall_score") or 0)
        for row in (previous.get("scenarios") or [])
    }
    for row in current.get("scenarios") or []:
        sid = str(row.get("scenario_id") or "")
        if sid not in prev_scenarios:
            continue
        delta = float(row.get("overall_score") or 0) - prev_scenarios[sid]
        if delta >= 0.1:
            improved.append(sid)
        elif delta <= -0.1:
            regressed.append(sid)

    weak_categories = sorted(
        category_delta.items(),
        key=lambda item: float(curr_cats.get(item[0], 0)),
    )[:4]
    remaining_weak = [
        cat for cat, _ in weak_categories if float(curr_cats.get(cat, 0)) < 4.0
    ]

    return {
        "previous_average_overall_score": prev_avg,
        "new_average_overall_score": curr_avg,
        "overall_delta": round(curr_avg - prev_avg, 2),
        "category_delta": category_delta,
        "scenarios_improved": improved,
        "scenarios_regressed": regressed,
        "remaining_weak_categories": remaining_weak,
        "previous_unsafe_flags": previous.get("unsafe_flags") or [],
        "new_unsafe_flags": current.get("unsafe_flags") or [],
    }


def _git_sha() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
        )
        sha = (result.stdout or "").strip()
        return sha or None
    except (OSError, subprocess.SubprocessError):
        return None


def load_scenarios() -> list[dict[str, Any]]:
    payload = json.loads(SCENARIOS_PATH.read_text(encoding="utf-8"))
    return list(payload.get("scenarios") or [])


def is_live_mode_requested() -> bool:
    return os.getenv("ORB_BASELINE_LIVE", "").strip().lower() in {"1", "true", "yes", "on"}


def load_fixture_output(scenario_id: str) -> str:
    path = FIXTURES_DIR / f"{scenario_id}.md"
    if not path.is_file():
        raise FileNotFoundError(f"Missing fixture output: {path}")
    return path.read_text(encoding="utf-8")


def _build_template_output(scenario: dict[str, Any]) -> str:
    """Deterministic scaffold when fixture file missing — clearly marked as template."""
    title = scenario.get("title") or scenario.get("id")
    input_text = str(scenario.get("input") or "").strip()
    lines = [
        f"## {title}",
        "",
        "## What happened",
        input_text,
        "",
        "## Adult response",
        "Not stated in output — to be completed by practitioner.",
        "",
        "## Outcome",
        "Not stated.",
        "",
        "---",
        "Template scaffold only — adult review required. Not live ORB output.",
    ]
    return "\n".join(lines)


def generate_static_output(scenario: dict[str, Any]) -> tuple[str, str]:
    scenario_id = str(scenario.get("id") or "")
    try:
        return load_fixture_output(scenario_id), "fixture"
    except FileNotFoundError:
        return _build_template_output(scenario), "template_scaffold"


def generate_live_output(scenario: dict[str, Any]) -> tuple[str, str, dict[str, Any] | None]:
    """Optional live path via residential quality + recording framework checks."""
    meta: dict[str, Any] = {}
    try:
        from services.orb_residential_quality_service import run_residential_quality_check
        from services.orb_recording_framework_service import get_record_type

        record_type = str(scenario.get("record_type") or "daily_record")
        rt = get_record_type(record_type) or {}
        note_type = str(rt.get("dictate_note_type") or record_type)
        input_text = str(scenario.get("input") or "")

        # Build a structured draft from framework headings — not a full LLM call.
        headings = rt.get("final_document_headings") or rt.get("required_sections") or ["Summary"]
        sections = []
        for heading in headings[:6]:
            if "voice" in str(heading).lower() or "presentation" in str(heading).lower():
                sections.append(f"## {heading}\nSee input — quotes: Not stated unless provided.")
            elif "adult" in str(heading).lower() or "response" in str(heading).lower():
                sections.append(f"## {heading}\nTo be completed from shift detail.")
            else:
                sections.append(f"## {heading}\n{input_text[:400]}")
        sections.append(
            "\n---\nDraft only — adult review required. "
            "Live baseline used framework scaffold; configure provider for full LLM route."
        )
        output = "\n\n".join(sections)
        quality = run_residential_quality_check(
            output,
            note_type=note_type,
            record_type_id=record_type,
            surface="template",
        )
        meta["quality_check"] = {
            "child_centred": quality.get("child_centred"),
            "recording_quality": quality.get("quality_checks", {}).get("recording_quality"),
        }
        default_entry = model_provider_registry.get_default_entry()
        if default_entry:
            meta["provider"] = default_entry.provider_id
            meta["model"] = default_entry.model_id
        return output, "live_framework_scaffold", meta
    except Exception as exc:  # noqa: BLE001 — baseline runner must not crash CI/live runs
        return generate_static_output(scenario)[0], f"live_fallback_error:{exc.__class__.__name__}", meta


def aggregate_category_averages(results: list[dict[str, Any]]) -> dict[str, float]:
    totals: dict[str, float] = {c: 0.0 for c in RUBRIC_CATEGORIES}
    count = len(results) or 1
    for row in results:
        for cat in RUBRIC_CATEGORIES:
            totals[cat] += float(row.get("category_scores", {}).get(cat, 0))
    return {cat: round(totals[cat] / count, 2) for cat in RUBRIC_CATEGORIES}


def build_report(
    *,
    mode: str,
    results: list[dict[str, Any]],
    model_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    category_averages = aggregate_category_averages(results)
    overall_scores = [float(r.get("overall_score", 0)) for r in results]
    avg_overall = round(sum(overall_scores) / (len(overall_scores) or 1), 2)

    all_strengths: list[str] = []
    all_weaknesses: list[str] = []
    all_unsafe: list[str] = []
    all_fixes: list[str] = []
    ratings: dict[str, int] = {}

    for row in results:
        all_strengths.extend(row.get("strengths") or [])
        all_weaknesses.extend(row.get("weaknesses") or [])
        all_unsafe.extend(row.get("unsafe_flags") or [])
        all_fixes.extend(row.get("recommended_fixes") or [])
        rating = str(row.get("rating") or "acceptable")
        ratings[rating] = ratings.get(rating, 0) + 1

    def _top(items: list[str], n: int = 5) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            key = item.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(item)
            if len(out) >= n:
                break
        return out

    return {
        "baseline_version": BASELINE_VERSION,
        "commit_sha": _git_sha(),
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "scenario_count": len(results),
        "average_overall_score": avg_overall,
        "category_averages": category_averages,
        "rating_distribution": ratings,
        "top_strengths": _top(all_strengths),
        "top_weaknesses": _top(all_weaknesses),
        "unsafe_flags": sorted(set(all_unsafe)),
        "recommended_fixes": _top(all_fixes, 8),
        "model_provider": model_meta,
        "disclaimer": (
            "Internal IndiCare Intelligence baseline — not clinically validated. "
            "Fixture mode scores template/fixture behaviour, not live LLM performance unless live mode used."
        ),
        "scenarios": results,
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# ORB Residential Baseline Quality Report",
        "",
        f"- **Run timestamp:** {report.get('run_timestamp')}",
        f"- **Mode:** `{report.get('mode')}`",
        f"- **Baseline version:** {report.get('baseline_version')}",
        f"- **Commit SHA:** {report.get('commit_sha') or 'unknown'}",
        f"- **Scenarios:** {report.get('scenario_count')}",
        f"- **Average overall score:** {report.get('average_overall_score')} / 5",
        "",
        "> " + str(report.get("disclaimer")),
        "",
        "## Category averages",
        "",
        "| Category | Average (0–5) |",
        "| --- | ---: |",
    ]
    for cat, avg in (report.get("category_averages") or {}).items():
        lines.append(f"| {cat.replace('_', ' ')} | {avg} |")

    lines.extend(
        [
            "",
            "## Rating distribution",
            "",
        ]
    )
    for rating, count in sorted((report.get("rating_distribution") or {}).items()):
        lines.append(f"- **{rating}:** {count}")

    if report.get("unsafe_flags"):
        lines.extend(["", "## Unsafe flags", ""])
        for flag in report["unsafe_flags"]:
            lines.append(f"- `{flag}`")

    lines.extend(["", "## Top strengths", ""])
    for s in report.get("top_strengths") or []:
        lines.append(f"- {s}")

    lines.extend(["", "## Top weaknesses", ""])
    for w in report.get("top_weaknesses") or []:
        lines.append(f"- {w}")

    lines.extend(["", "## Recommended fixes", ""])
    for fix in report.get("recommended_fixes") or []:
        lines.append(f"- {fix}")

    if report.get("model_provider"):
        lines.extend(["", "## Model / provider (live mode)", "", "```json"])
        lines.append(json.dumps(report["model_provider"], indent=2))
        lines.append("```")

    comparison = report.get("baseline_comparison")
    if comparison:
        lines.extend(
            [
                "",
                "## Baseline comparison",
                "",
                f"- **Previous average:** {comparison.get('previous_average_overall_score')} / 5",
                f"- **New average:** {comparison.get('new_average_overall_score')} / 5",
                f"- **Overall delta:** {comparison.get('overall_delta')}",
                "",
                "### Category delta",
                "",
                "| Category | Delta |",
                "| --- | ---: |",
            ]
        )
        for cat, delta in sorted((comparison.get("category_delta") or {}).items()):
            lines.append(f"| {cat.replace('_', ' ')} | {delta} |")
        if comparison.get("scenarios_improved"):
            lines.extend(["", "### Scenarios improved", ""])
            for sid in comparison["scenarios_improved"]:
                lines.append(f"- {sid}")
        if comparison.get("remaining_weak_categories"):
            lines.extend(["", "### Remaining weak categories", ""])
            for cat in comparison["remaining_weak_categories"]:
                lines.append(f"- {cat.replace('_', ' ')}")

    lines.extend(["", "## Scenario scores", "", "| Scenario | Score | Rating | Source |", "| --- | ---: | --- | --- |"])
    for row in report.get("scenarios") or []:
        lines.append(
            f"| {row.get('scenario_id')} | {row.get('overall_score')} | {row.get('rating')} | {row.get('answer_source')} |"
        )
    lines.append("")
    return "\n".join(lines)


def run_baseline(*, live: bool = False) -> dict[str, Any]:
    mode = "live" if live else "static"
    model_meta: dict[str, Any] | None = None
    if live:
        model_meta = model_provider_registry.health_payload()

    results: list[dict[str, Any]] = []
    for scenario in load_scenarios():
        input_text = str(scenario.get("input") or "")
        if live:
            output, source, extra = generate_live_output(scenario)
            if extra and model_meta is not None:
                model_meta = {**model_meta, **extra}
        else:
            output, source = generate_static_output(scenario)

        evaluation = evaluate_output(output, scenario=scenario, input_text=input_text)
        row = serialise_evaluation(evaluation)
        row["title"] = scenario.get("title")
        row["record_type"] = scenario.get("record_type")
        row["answer_source"] = source
        row["output_excerpt"] = output[:280].replace("\n", " ")
        results.append(row)

    return build_report(mode=mode, results=results, model_meta=model_meta)


def main() -> int:
    parser = argparse.ArgumentParser(description="ORB Residential baseline quality lab runner")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Enable live mode (also requires ORB_BASELINE_LIVE=1)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPORTS_DIR,
        help="Directory for JSON and Markdown reports",
    )
    args = parser.parse_args()

    live = args.live or is_live_mode_requested()
    if live and os.getenv("CI", "").strip().lower() in {"true", "1", "yes"}:
        print("ORB baseline live mode is disabled in CI.", file=sys.stderr)
        return 2

    report = run_baseline(live=live)
    previous = _load_previous_report()
    if previous:
        PREVIOUS_SNAPSHOT_PATH.write_text(json.dumps(previous, indent=2), encoding="utf-8")
    comparison = _build_baseline_comparison(previous, report)
    if comparison:
        report["baseline_comparison"] = comparison

    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_path = args.output_dir / "orb_residential_baseline_report.json"
    md_path = args.output_dir / "orb_residential_baseline_report.md"
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    _append_history_snapshot(report)

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print(f"Mode: {report.get('mode')} | Average: {report.get('average_overall_score')} | Unsafe: {report.get('unsafe_flags')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
