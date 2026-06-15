#!/usr/bin/env python3
"""Run ORB Residential baseline quality lab — static (CI) or optional live model mode.

Static mode (default): scores fixture outputs representing current template/brain
behaviour. Does not call external LLMs.

Scenario sets:
  baseline15  — original 15-scenario baseline (default for backward compatibility)
  core100     — 100 core recording scenarios
  variants1000 — 1000 deterministic variants (static/rule mode)

Live mode: set ORB_BASELINE_LIVE=1 and configure a provider. Never runs in CI by default.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections import Counter
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
from assistant.evals.orb_residential_scenario_schema import scenario_to_baseline_format  # noqa: E402
from assistant.services.model_provider_registry import model_provider_registry  # noqa: E402

SCENARIOS_PATH = ROOT / "quality" / "orb_residential_baseline_scenarios.json"
CORE100_PATH = ROOT / "quality" / "orb_residential_core_100_scenarios.json"
VARIANTS1000_PATH = ROOT / "quality" / "orb_residential_1000_scenario_variants.jsonl"
FIXTURES_DIR = ROOT / "assistant" / "evals" / "fixtures" / "orb_baseline_outputs"
REPORTS_DIR = ROOT / "reports"
HISTORY_PATH = REPORTS_DIR / "orb_residential_baseline_history.jsonl"
PREVIOUS_SNAPSHOT_PATH = REPORTS_DIR / "orb_residential_baseline_previous.json"
QUALITY_LAB_SUMMARY_PATH = REPORTS_DIR / "orb_quality_lab_summary.json"

SCENARIO_SET_CONFIG: dict[str, dict[str, Any]] = {
    "baseline15": {
        "path": SCENARIOS_PATH,
        "format": "json_bundle",
        "report_json": "orb_residential_baseline_report.json",
        "report_md": "orb_residential_baseline_report.md",
        "history": True,
    },
    "core100": {
        "path": CORE100_PATH,
        "format": "json_bundle",
        "report_json": "orb_residential_core_100_report.json",
        "report_md": "orb_residential_core_100_report.md",
        "history": False,
    },
    "variants1000": {
        "path": VARIANTS1000_PATH,
        "format": "jsonl",
        "report_json": "orb_residential_variants_1000_report.json",
        "report_md": "orb_residential_variants_1000_report.md",
        "history": False,
    },
}


def _load_previous_report(report_name: str) -> dict[str, Any] | None:
    path = REPORTS_DIR / report_name
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
        "scenario_set": report.get("scenario_set"),
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


def load_scenarios_for_set(scenario_set: str) -> list[dict[str, Any]]:
    config = SCENARIO_SET_CONFIG[scenario_set]
    path: Path = config["path"]
    if not path.is_file():
        raise FileNotFoundError(f"Scenario set file missing: {path}")

    if config["format"] == "jsonl":
        scenarios: list[dict[str, Any]] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                scenarios.append(json.loads(line))
    else:
        payload = json.loads(path.read_text(encoding="utf-8"))
        scenarios = list(payload.get("scenarios") or [])

    normalised: list[dict[str, Any]] = []
    for raw in scenarios:
        if "scenario_id" in raw and "id" not in raw:
            baseline = scenario_to_baseline_format(raw)
            if raw.get("source_baseline_id"):
                baseline["source_baseline_id"] = raw["source_baseline_id"]
            normalised.append(baseline)
        else:
            normalised.append(raw)
    return normalised


def load_scenarios() -> list[dict[str, Any]]:
    return load_scenarios_for_set("baseline15")


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


def _build_variant_static_output(scenario: dict[str, Any]) -> str:
    """Deterministic static output for variant scenarios — honest scaffold, not inflated."""
    variant_type = str(scenario.get("variant_type") or "")
    title = scenario.get("title") or scenario.get("id")
    input_text = str(scenario.get("input") or "").strip()
    if variant_type in {"rough_note", "voice_dictate_transcript", "poor_wording_correction"}:
        return _build_template_output(scenario)
    if variant_type == "safeguarding_escalation" and scenario.get("safeguarding_flags"):
        return (
            f"## {title}\n\n## What happened\n{input_text}\n\n"
            "## Safeguarding\nDSL informed. Escalation pathway followed per local policy.\n\n"
            "## Adult response\nStaff listened and recorded words used.\n\n"
            "## Outcome\nManager notified same shift.\n\n"
            "---\nDraft only — adult review required. Professional judgement applies."
        )
    return _build_template_output(scenario)


def generate_static_output(scenario: dict[str, Any], *, scenario_set: str = "baseline15") -> tuple[str, str]:
    scenario_id = str(scenario.get("id") or "")
    fixture_id = str(scenario.get("source_baseline_id") or scenario_id)

    if scenario_set == "variants1000":
        return _build_variant_static_output(scenario), "variant_static"

    try:
        return load_fixture_output(fixture_id), "fixture"
    except FileNotFoundError:
        if fixture_id != scenario_id:
            try:
                return load_fixture_output(scenario_id), "fixture"
            except FileNotFoundError:
                pass
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
    except Exception as exc:  # noqa: BLE001
        return generate_static_output(scenario)[0], f"live_fallback_error:{exc.__class__.__name__}", meta


def aggregate_category_averages(results: list[dict[str, Any]]) -> dict[str, float]:
    totals: dict[str, float] = {c: 0.0 for c in RUBRIC_CATEGORIES}
    count = len(results) or 1
    for row in results:
        for cat in RUBRIC_CATEGORIES:
            totals[cat] += float(row.get("category_scores", {}).get(cat, 0))
    return {cat: round(totals[cat] / count, 2) for cat in RUBRIC_CATEGORIES}


def _top_n_scenarios(results: list[dict[str, Any]], *, weakest: bool, n: int = 10) -> list[dict[str, Any]]:
    sorted_rows = sorted(results, key=lambda r: float(r.get("overall_score") or 0), reverse=not weakest)
    out: list[dict[str, Any]] = []
    for row in sorted_rows[:n]:
        out.append(
            {
                "scenario_id": row.get("scenario_id"),
                "title": row.get("title"),
                "overall_score": row.get("overall_score"),
                "record_type": row.get("record_type"),
                "rating": row.get("rating"),
            }
        )
    return out


def _record_type_averages(results: list[dict[str, Any]]) -> dict[str, float]:
    by_rt: dict[str, list[float]] = {}
    for row in results:
        rt = str(row.get("record_type") or "unknown")
        by_rt.setdefault(rt, []).append(float(row.get("overall_score") or 0))
    return {rt: round(sum(scores) / len(scores), 2) for rt, scores in by_rt.items()}


def _family_risk_map(results: list[dict[str, Any]], scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    family_by_id = {str(s.get("id") or s.get("scenario_id")): s.get("scenario_family", "unknown") for s in scenarios}
    by_family: dict[str, list[float]] = {}
    for row in results:
        sid = str(row.get("scenario_id") or "")
        family = str(family_by_id.get(sid) or row.get("scenario_family") or "unknown")
        by_family.setdefault(family, []).append(float(row.get("overall_score") or 0))
    ranked = sorted(
        (
            {"scenario_family": fam, "average_score": round(sum(scores) / len(scores), 2), "count": len(scores)}
            for fam, scores in by_family.items()
        ),
        key=lambda x: x["average_score"],
    )
    return ranked[:10]


def _missing_elements_frequency(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counter: Counter[str] = Counter()
    for row in results:
        for elem in row.get("missing_required_elements") or []:
            counter[str(elem)] += 1
    return [{"element": k, "count": v} for k, v in counter.most_common(10)]


def build_report(
    *,
    mode: str,
    scenario_set: str,
    results: list[dict[str, Any]],
    scenarios: list[dict[str, Any]],
    model_meta: dict[str, Any] | None = None,
    baseline15_report: dict[str, Any] | None = None,
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

    record_type_avgs = _record_type_averages(results)
    weakest_rts = sorted(record_type_avgs.items(), key=lambda x: x[1])[:5]

    weakest_cats = sorted(category_averages.items(), key=lambda x: x[1])[:4]
    strongest_cats = sorted(category_averages.items(), key=lambda x: x[1], reverse=True)[:4]

    recommended_targets: list[str] = []
    for cat, avg in weakest_cats:
        if avg < 4.0:
            recommended_targets.append(f"Improve {cat.replace('_', ' ')} (avg {avg})")
    for elem_row in _missing_elements_frequency(results)[:3]:
        recommended_targets.append(f"Address missing element: {elem_row['element']}")

    comparison_baseline15: dict[str, Any] | None = None
    if baseline15_report and scenario_set != "baseline15":
        comparison_baseline15 = {
            "baseline15_average": baseline15_report.get("average_overall_score"),
            "current_average": avg_overall,
            "delta": round(avg_overall - float(baseline15_report.get("average_overall_score") or 0), 2),
            "baseline15_unsafe_flags": baseline15_report.get("unsafe_flags") or [],
            "current_unsafe_flags": sorted(set(all_unsafe)),
        }

    live_disclaimer = (
        "No live LLM calls — static/rule mode scoring fixture or template scaffold outputs."
        if mode == "static"
        else "Live mode used framework scaffold; not a full LLM generation pass."
    )

    return {
        "baseline_version": BASELINE_VERSION,
        "commit_sha": _git_sha(),
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "scenario_set": scenario_set,
        "mode": mode,
        "scenario_count": len(results),
        "average_overall_score": avg_overall,
        "score_distribution": ratings,
        "category_averages": category_averages,
        "rating_distribution": ratings,
        "unsafe_flag_count": len(set(all_unsafe)),
        "unsafe_flags": sorted(set(all_unsafe)),
        "top_10_weakest_scenarios": _top_n_scenarios(results, weakest=True),
        "top_10_strongest_scenarios": _top_n_scenarios(results, weakest=False),
        "weakest_record_types": [{"record_type": rt, "average_score": sc} for rt, sc in weakest_rts],
        "highest_risk_scenario_families": _family_risk_map(results, scenarios),
        "most_common_missing_elements": _missing_elements_frequency(results),
        "recommended_improvement_targets": recommended_targets[:8] or ["Continue monitoring baseline categories"],
        "comparison_to_baseline15": comparison_baseline15,
        "top_strengths": _top(all_strengths),
        "top_weaknesses": _top(all_weaknesses),
        "recommended_fixes": _top(all_fixes, 8),
        "model_provider": model_meta,
        "live_llm_disclaimer": live_disclaimer,
        "disclaimer": (
            "Internal IndiCare Intelligence baseline — not clinically validated. "
            "Fixture mode scores template/fixture behaviour, not live LLM performance unless live mode used."
        ),
        "scenarios": results,
    }


def render_markdown(report: dict[str, Any]) -> str:
    title_map = {
        "baseline15": "ORB Residential Baseline Quality Report (15 scenarios)",
        "core100": "ORB Residential Core 100 Benchmark Report",
        "variants1000": "ORB Residential 1000 Variants Benchmark Report",
    }
    lines = [
        f"# {title_map.get(report.get('scenario_set', ''), 'ORB Residential Quality Report')}",
        "",
        f"- **Run timestamp:** {report.get('run_timestamp')}",
        f"- **Scenario set:** `{report.get('scenario_set')}`",
        f"- **Mode:** `{report.get('mode')}`",
        f"- **Baseline version:** {report.get('baseline_version')}",
        f"- **Commit SHA:** {report.get('commit_sha') or 'unknown'}",
        f"- **Scenarios scored:** {report.get('scenario_count')}",
        f"- **Average overall score:** {report.get('average_overall_score')} / 5",
        f"- **Unsafe flag count:** {report.get('unsafe_flag_count', len(report.get('unsafe_flags') or []))}",
        "",
        "> " + str(report.get("disclaimer")),
        "",
        f"> {report.get('live_llm_disclaimer', '')}",
        "",
        "## Category averages",
        "",
        "| Category | Average (0–5) |",
        "| --- | ---: |",
    ]
    for cat, avg in (report.get("category_averages") or {}).items():
        lines.append(f"| {cat.replace('_', ' ')} | {avg} |")

    lines.extend(["", "## Score distribution", ""])
    for rating, count in sorted((report.get("score_distribution") or {}).items()):
        lines.append(f"- **{rating}:** {count}")

    if report.get("unsafe_flags"):
        lines.extend(["", "## Unsafe flags", ""])
        for flag in report["unsafe_flags"]:
            lines.append(f"- `{flag}`")

    lines.extend(["", "## Top 10 weakest scenarios", ""])
    for row in report.get("top_10_weakest_scenarios") or []:
        lines.append(f"- `{row.get('scenario_id')}` ({row.get('overall_score')}) — {row.get('title')}")

    lines.extend(["", "## Top 10 strongest scenarios", ""])
    for row in report.get("top_10_strongest_scenarios") or []:
        lines.append(f"- `{row.get('scenario_id')}` ({row.get('overall_score')}) — {row.get('title')}")

    if report.get("weakest_record_types"):
        lines.extend(["", "## Weakest record types", ""])
        for row in report["weakest_record_types"]:
            lines.append(f"- `{row.get('record_type')}`: {row.get('average_score')}")

    if report.get("most_common_missing_elements"):
        lines.extend(["", "## Most common missing elements", ""])
        for row in report["most_common_missing_elements"]:
            lines.append(f"- {row.get('element')}: {row.get('count')}")

    if report.get("recommended_improvement_targets"):
        lines.extend(["", "## Recommended improvement targets", ""])
        for target in report["recommended_improvement_targets"]:
            lines.append(f"- {target}")

    comp = report.get("comparison_to_baseline15")
    if comp:
        lines.extend(
            [
                "",
                "## Comparison to baseline15",
                "",
                f"- **Baseline15 average:** {comp.get('baseline15_average')} / 5",
                f"- **Current average:** {comp.get('current_average')} / 5",
                f"- **Delta:** {comp.get('delta')}",
            ]
        )

    lines.extend(["", "## Top strengths", ""])
    for s in report.get("top_strengths") or []:
        lines.append(f"- {s}")

    lines.extend(["", "## Top weaknesses", ""])
    for w in report.get("top_weaknesses") or []:
        lines.append(f"- {w}")

    comparison = report.get("baseline_comparison")
    if comparison:
        lines.extend(
            [
                "",
                "## Baseline comparison (previous run)",
                "",
                f"- **Previous average:** {comparison.get('previous_average_overall_score')} / 5",
                f"- **New average:** {comparison.get('new_average_overall_score')} / 5",
                f"- **Overall delta:** {comparison.get('overall_delta')}",
            ]
        )

    lines.extend(["", "## Scenario scores", "", "| Scenario | Score | Rating | Source |", "| --- | ---: | --- | --- |"])
    for row in report.get("scenarios") or []:
        lines.append(
            f"| {row.get('scenario_id')} | {row.get('overall_score')} | {row.get('rating')} | {row.get('answer_source')} |"
        )
    lines.append("")
    return "\n".join(lines)


def run_baseline(
    *,
    live: bool = False,
    scenario_set: str = "baseline15",
) -> dict[str, Any]:
    mode = "live" if live else "static"
    model_meta: dict[str, Any] | None = None
    if live:
        model_meta = model_provider_registry.health_payload()

    scenarios = load_scenarios_for_set(scenario_set)
    baseline15_report: dict[str, Any] | None = None
    if scenario_set != "baseline15":
        baseline15_path = REPORTS_DIR / "orb_residential_baseline_report.json"
        if baseline15_path.is_file():
            try:
                baseline15_report = json.loads(baseline15_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                baseline15_report = None

    results: list[dict[str, Any]] = []
    for scenario in scenarios:
        input_text = str(scenario.get("input") or "")
        if live:
            output, source, extra = generate_live_output(scenario)
            if extra and model_meta is not None:
                model_meta = {**model_meta, **extra}
        else:
            output, source = generate_static_output(scenario, scenario_set=scenario_set)

        evaluation = evaluate_output(output, scenario=scenario, input_text=input_text)
        row = serialise_evaluation(evaluation)
        row["title"] = scenario.get("title")
        row["record_type"] = scenario.get("record_type")
        row["scenario_family"] = scenario.get("scenario_family")
        row["answer_source"] = source
        row["output_excerpt"] = output[:280].replace("\n", " ")
        results.append(row)

    return build_report(
        mode=mode,
        scenario_set=scenario_set,
        results=results,
        scenarios=scenarios,
        model_meta=model_meta,
        baseline15_report=baseline15_report,
    )


def update_quality_lab_summary(reports: dict[str, dict[str, Any]]) -> None:
    """Write compact machine-readable Quality Lab dashboard summary."""
    weakest: list[str] = []
    strongest: list[str] = []
    next_target = "Continue baseline15 monitoring"

    core = reports.get("core100")
    if core:
        cats = core.get("category_averages") or {}
        sorted_cats = sorted(cats.items(), key=lambda x: x[1])
        weakest = [c[0] for c in sorted_cats[:3]]
        strongest = [c[0] for c in sorted(cats.items(), key=lambda x: x[1], reverse=True)[:3]]
        targets = core.get("recommended_improvement_targets") or []
        if targets:
            next_target = targets[0]

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "commit_sha": _git_sha(),
        "baseline15_average": (reports.get("baseline15") or {}).get("average_overall_score"),
        "core100_average": (reports.get("core100") or {}).get("average_overall_score"),
        "variants1000_average": (reports.get("variants1000") or {}).get("average_overall_score"),
        "unsafe_flags": {
            "baseline15": (reports.get("baseline15") or {}).get("unsafe_flags") or [],
            "core100": (reports.get("core100") or {}).get("unsafe_flags") or [],
            "variants1000": (reports.get("variants1000") or {}).get("unsafe_flags") or [],
        },
        "weakest_categories": weakest,
        "strongest_categories": strongest,
        "recommended_next_target": next_target,
        "live_llm_disabled_in_ci": os.getenv("CI", "").strip().lower() in {"true", "1", "yes"}
        or not is_live_mode_requested(),
    }
    QUALITY_LAB_SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    QUALITY_LAB_SUMMARY_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="ORB Residential baseline quality lab runner")
    parser.add_argument(
        "--scenario-set",
        choices=list(SCENARIO_SET_CONFIG.keys()),
        default="baseline15",
        help="Scenario set to score (default: baseline15)",
    )
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
    parser.add_argument(
        "--update-quality-lab-summary",
        action="store_true",
        help="Refresh orb_quality_lab_summary.json after run",
    )
    args = parser.parse_args()

    live = args.live or is_live_mode_requested()
    if live and os.getenv("CI", "").strip().lower() in {"true", "1", "yes"}:
        print("ORB baseline live mode is disabled in CI.", file=sys.stderr)
        return 2

    config = SCENARIO_SET_CONFIG[args.scenario_set]
    report = run_baseline(live=live, scenario_set=args.scenario_set)

    if args.scenario_set == "baseline15" and config.get("history"):
        previous = _load_previous_report(config["report_json"])
        if previous:
            PREVIOUS_SNAPSHOT_PATH.write_text(json.dumps(previous, indent=2), encoding="utf-8")
        comparison = _build_baseline_comparison(previous, report)
        if comparison:
            report["baseline_comparison"] = comparison
        if HISTORY_PATH.is_file():
            first_line = HISTORY_PATH.read_text(encoding="utf-8").splitlines()[0]
            if first_line:
                try:
                    first_snapshot = json.loads(first_line)
                    initial = _build_baseline_comparison(first_snapshot, report)
                    if initial and float(first_snapshot.get("average_overall_score") or 0) < float(
                        report.get("average_overall_score") or 0
                    ):
                        report["initial_baseline_comparison"] = {
                            **initial,
                            "reference_run_timestamp": first_snapshot.get("run_timestamp"),
                        }
                except json.JSONDecodeError:
                    pass

    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_path = args.output_dir / config["report_json"]
    md_path = args.output_dir / config["report_md"]
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")

    if config.get("history"):
        _append_history_snapshot(report)

    if args.update_quality_lab_summary or args.scenario_set in {"core100", "variants1000"}:
        all_reports: dict[str, dict[str, Any]] = {args.scenario_set: report}
        for set_name, set_config in SCENARIO_SET_CONFIG.items():
            if set_name == args.scenario_set:
                continue
            path = args.output_dir / set_config["report_json"]
            if path.is_file():
                try:
                    all_reports[set_name] = json.loads(path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    pass
        update_quality_lab_summary(all_reports)

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print(
        f"Set: {args.scenario_set} | Mode: {report.get('mode')} | "
        f"Average: {report.get('average_overall_score')} | Unsafe: {report.get('unsafe_flags')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
