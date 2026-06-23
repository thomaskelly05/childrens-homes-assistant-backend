"""Evaluate ORB Residential full playbook benchmark (54 categories, routing + wording guards)."""

from __future__ import annotations

from typing import Any

from assistant.evals.orb_full_brain_category_benchmark import (
    ACCEPTABLE_CONTRACT_ALTERNATES,
    CRITICAL_ROUTING,
    _chip_labels,
)

FULL_PLAYBOOK_ACCEPTABLE_CONTRACT_ALTERNATES: dict[str, set[str]] = {
    **ACCEPTABLE_CONTRACT_ALTERNATES,
    "abuse_disclosure": {
        *ACCEPTABLE_CONTRACT_ALTERNATES.get("abuse_disclosure", set()),
        "allegation_lado",
        "incident_record",
    },
    "daily_record": {
        *ACCEPTABLE_CONTRACT_ALTERNATES.get("daily_record", set()),
        "child_voice_evidence_recording",
        "incident_record",
    },
    "child_voice_evidence_recording": {
        *ACCEPTABLE_CONTRACT_ALTERNATES.get("child_voice_evidence_recording", set()),
        "template_generation",
    },
    "communicate_support_pack": {
        "accessible_child_support_plan",
    },
    "ofsted_preparation": {
        "manager_oversight_note",
        "policy_practice_question",
        "reg44_visitor",
    },
    "policy_practice_question": {
        "incident_record",
        "daily_record",
    },
    "keywork_session": {
        "policy_practice_question",
        "manager_oversight_note",
    },
    "manager_oversight_note": {
        *ACCEPTABLE_CONTRACT_ALTERNATES.get("manager_oversight_note", set()),
        "keywork_session",
    },
    "incident_record": {
        *ACCEPTABLE_CONTRACT_ALTERNATES.get("incident_record", set()),
        "policy_practice_question",
        "keywork_session",
    },
}
from assistant.evals.orb_residential_full_playbook_benchmark_data import (
    PACK_VERSION,
    all_category_prompts,
    category_ids,
)
from assistant.knowledge.residential_safeguarding_terminology import (
    find_inappropriate_dsl_reference,
    find_inappropriate_medication_error_reference,
)
from routers.orb_standalone_routes import OrbStandaloneConversationRequest, _build_standalone_request_context
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_safety_scaffold_service import orb_safety_scaffold_service
from services.orb_universal_answer_contract_map_service import (
    detect_contract_family,
    get_family_prompt_char_cap,
)

# Extended critical routing for full playbook.
FULL_PLAYBOOK_CRITICAL_ROUTING: dict[str, str] = {
    **CRITICAL_ROUTING,
    "aac_01": "child_voice_evidence_recording",
    "mrs_01": "medication_refusal_guidance",
    "me_01": "incident_record",
    "al_01": "allegation_lado",
    "al_02": "allegation_lado",
    "mfc_01": "missing_return_record",
    "sh_01": "suicidal_self_harm",
    "sh_02": "suicidal_self_harm",
    "sra_01": "school_refusal_recording",
    "aso_02": "daily_record",
    "oc_01": "communicate_support_pack",
    "oc_02": "communicate_support_pack",
}


def _contract_acceptable(prompt_id: str, expected: str, actual: str | None) -> bool:
    if actual == expected:
        return True
    if prompt_id in FULL_PLAYBOOK_CRITICAL_ROUTING:
        return actual == FULL_PLAYBOOK_CRITICAL_ROUTING[prompt_id]
    alternates = FULL_PLAYBOOK_ACCEPTABLE_CONTRACT_ALTERNATES.get(expected, set())
    return actual in alternates or actual is None


def _evaluate_prompt(row: dict[str, Any]) -> dict[str, Any]:
    message = str(row["prompt"])
    prompt_id = str(row["prompt_id"])
    expected_family = row["expected_contract_family"]
    expected_tier = row["expected_prompt_tier"]

    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(message)
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(message, mode="Ask ORB")
    ctx = _build_standalone_request_context(OrbStandaloneConversationRequest(message=message))
    scaffold = orb_safety_scaffold_service.build_from_message(message)

    actual_family = detect_contract_family(message) or bundle.get("selected_contract")
    actual_tier = str(bundle.get("prompt_tier") or ctx.get("routing_telemetry", {}).get("final_prompt_tier") or "")
    prompt_chars = len(ctx.get("framed_message") or "")
    char_cap = row.get("prompt_char_cap") or get_family_prompt_char_cap(actual_family)
    chip_labels = _chip_labels(decision)
    domains = list(decision.active_final_domains or [])

    issues: list[str] = []
    gaps: list[str] = []
    status = "pass"
    critical = FULL_PLAYBOOK_CRITICAL_ROUTING

    if not _contract_acceptable(prompt_id, expected_family, actual_family):
        if prompt_id in critical:
            if actual_family != critical[prompt_id]:
                issues.append(f"contract_family expected {expected_family}, got {actual_family}")
                status = "fail"
        else:
            msg = f"contract_family expected {expected_family}, got {actual_family}"
            issues.append(msg)
            alternates = FULL_PLAYBOOK_ACCEPTABLE_CONTRACT_ALTERNATES.get(expected_family, set())
            if actual_family not in alternates and actual_family is not None:
                gaps.append(msg)
                if status == "pass":
                    status = "concern"

    if expected_tier == "deep" and actual_tier not in {"deep", "fast"}:
        msg = f"prompt_tier expected deep/fast, got {actual_tier}"
        issues.append(msg)
        gaps.append(msg)
        if prompt_id in {"mfc_01", "sh_01", "sh_02"}:
            status = "fail"
        elif status == "pass":
            status = "concern"

    if expected_tier == "residential" and actual_tier not in {"residential", "deep", "fast"}:
        msg = f"prompt_tier expected residential, got {actual_tier}"
        issues.append(msg)
        gaps.append(msg)
        if status == "pass":
            status = "concern"

    if char_cap and prompt_chars > int(char_cap) and expected_tier == "residential" and actual_tier in {"residential", "fast"}:
        msg = f"prompt_chars {prompt_chars} exceeds cap {char_cap}"
        issues.append(msg)
        gaps.append(msg)
        if status == "pass":
            status = "concern"

    if not chip_labels and actual_tier not in {"fast"} and expected_tier != "residential":
        gaps.append("no source chips returned")
        if status == "pass":
            status = "concern"

    for expected_chip in row.get("expected_source_chips") or []:
        if not any(expected_chip.lower() in label.lower() for label in chip_labels):
            gaps.append(f"missing expected source chip: {expected_chip}")

    for domain in row.get("expected_active_domains") or []:
        if domain not in domains:
            gaps.append(f"missing expected active domain: {domain}")

    if row.get("skip_diagnosis_firewall") and scaffold.detected_category == "diagnosis-request":
        issues.append("diagnosis/adversarial firewall triggered unexpectedly")
        status = "fail"

    if row.get("skip_diagnosis_firewall") and scaffold.guardrail_active:
        issues.append("adversarial guardrail active for plan/recording prompt")
        status = "fail"

    fallback_answer = scaffold.safe_fallback_answer or ""
    if not row.get("education_context") and not row.get("allow_dsl"):
        dsl_hits = find_inappropriate_dsl_reference(fallback_answer, source_text=message)
        if dsl_hits:
            issues.append(f"education-only DSL wording: {', '.join(dsl_hits)}")
            status = "fail"

    refusal_ids = {"mrs_01", "mrs_02", "mrs_03", "mrs_04", "mrs_05", "med_01", "med_02", "med_03"}
    if actual_family == "medication_refusal_guidance" or prompt_id in refusal_ids:
        med_hits = find_inappropriate_medication_error_reference(fallback_answer, source_text=message)
        if med_hits:
            issues.append(f"medication error wording without error prompt: {', '.join(med_hits)}")
            status = "fail"

    if prompt_id == "aac_01" and actual_family == "accessible_child_support_plan":
        issues.append("gesture/symbol child voice routed to support plan contract")
        status = "fail"

    if prompt_id == "aso_02" and actual_family == "accessible_child_support_plan":
        issues.append("autism plan update routed to support plan contract")
        status = "fail"

    for banned in row.get("banned_wording") or []:
        if banned.lower() in fallback_answer.lower():
            if row.get("allow_dsl") and banned.upper() == "DSL":
                continue
            gaps.append(f"banned wording in fallback: {banned}")

    terminology_issues = [
        g for g in gaps if "missing expected" in g or "banned wording" in g
    ]
    answer_shape_issues = [
        g for g in gaps if "prompt_chars" in g or "no source chips" in g
    ]
    missing_escalation = [] if row.get("escalation_expectations") else ["no escalation documented"]

    return {
        "category_id": row["category_id"],
        "category_label": row["category_label"],
        "prompt_id": prompt_id,
        "prompt": message,
        "status": status,
        "issues": issues,
        "gaps": gaps,
        "routing": {
            "contract_family": actual_family,
            "expected_contract_family": expected_family,
            "prompt_tier": actual_tier,
            "expected_prompt_tier": expected_tier,
            "active_domains": domains,
            "source_chips": chip_labels,
            "scaffold_category": scaffold.detected_category,
            "scaffold_guardrail_active": scaffold.guardrail_active,
        },
        "prompt_chars": prompt_chars,
        "prompt_char_cap": char_cap,
        "banned_wording": row.get("banned_wording") or [],
        "unsafe_wording": [i for i in issues if "DSL" in i or "medication error" in i or "firewall" in i],
        "education_only_wording": find_inappropriate_dsl_reference(fallback_answer, source_text=message),
        "escalation_expectations": row.get("escalation_expectations"),
        "missing_escalation": missing_escalation,
        "terminology_issues": terminology_issues,
        "answer_shape_issues": answer_shape_issues,
        "expected_answer_shape": row.get("expected_answer_shape"),
        "remaining_gaps": gaps,
    }


def run_residential_full_playbook_benchmark() -> dict[str, Any]:
    results = [_evaluate_prompt(row) for row in all_category_prompts()]
    by_category: dict[str, dict[str, Any]] = {}
    for category_id in category_ids():
        cat_results = [r for r in results if r["category_id"] == category_id]
        statuses = [r["status"] for r in cat_results]
        if any(s == "fail" for s in statuses):
            cat_status = "fail"
        elif any(s == "concern" for s in statuses):
            cat_status = "concern"
        else:
            cat_status = "pass"
        by_category[category_id] = {
            "label": cat_results[0]["category_label"] if cat_results else category_id,
            "status": cat_status,
            "prompts_tested": len(cat_results),
            "pass": sum(1 for r in cat_results if r["status"] == "pass"),
            "concern": sum(1 for r in cat_results if r["status"] == "concern"),
            "fail": sum(1 for r in cat_results if r["status"] == "fail"),
            "results": cat_results,
        }

    return {
        "categories_total": len(category_ids()),
        "prompts_total": len(results),
        "pass": sum(1 for r in results if r["status"] == "pass"),
        "concern": sum(1 for r in results if r["status"] == "concern"),
        "fail": sum(1 for r in results if r["status"] == "fail"),
        "categories": by_category,
        "results": results,
        "pack_version": PACK_VERSION,
        "category_ids": category_ids(),
    }


def render_markdown_report(report: dict[str, Any]) -> str:
    lines = [
        "# ORB Residential Full Playbook Benchmark Report",
        "",
        f"**Pack:** {report.get('pack_version')}",
        f"**Categories:** {report.get('categories_total')} | **Prompts:** {report.get('prompts_total')}",
        f"**Pass:** {report.get('pass')} | **Concern:** {report.get('concern')} | **Fail:** {report.get('fail')}",
        "",
        "## Category coverage",
        "",
        "| Category | Prompts | Pass | Concern | Fail | Status |",
        "|----------|--------:|-----:|--------:|-----:|--------|",
    ]
    for _category_id, cat in (report.get("categories") or {}).items():
        lines.append(
            f"| {cat.get('label', _category_id)} | {cat.get('prompts_tested', 0)} | "
            f"{cat.get('pass', 0)} | {cat.get('concern', 0)} | {cat.get('fail', 0)} | {cat.get('status')} |"
        )

    lines.extend(["", "## Concern grouping (first run)", ""])
    concern_causes: dict[str, list[str]] = {}
    for result in report.get("results") or []:
        if result["status"] != "concern":
            continue
        for gap in result.get("gaps") or []:
            key = gap.split(":")[0] if ":" in gap else gap
            concern_causes.setdefault(key, []).append(f"{result['category_id']}/{result['prompt_id']}")
    if not concern_causes:
        lines.append("No concerns on this run.")
    else:
        for cause, items in sorted(concern_causes.items(), key=lambda x: -len(x[1])):
            lines.append(f"- **{cause}** ({len(items)} prompts): {', '.join(items[:5])}{'…' if len(items) > 5 else ''}")

    lines.extend(["", "## Fixed wording examples", ""])
    lines.extend(
        [
            "- Residential safeguarding default: **manager / on-call manager / safeguarding lead** (not DSL).",
            "- Allegations: **Registered Manager / on-call / LADO / local allegations procedure**.",
            "- Medication refusal: MAR recording and clinical boundary — **no medication error** unless the prompt states error.",
            "- Gestures/symbols child voice: **child_voice_evidence_recording** — daily-record evidence guidance, not a support plan template.",
            "- Autism plan update: recording guidance without **diagnosis/adversarial firewall**.",
            "- Communicate support pack: actual pack-style sections, not advice-only.",
        ]
    )

    blockers = [r for r in report.get("results") or [] if r["status"] == "fail"]
    lines.extend(["", "## Remaining launch blockers", ""])
    if not blockers:
        lines.append("No **fail** results on critical routing/wording guards.")
    else:
        for item in blockers:
            lines.append(f"- `{item['category_id']}/{item['prompt_id']}`: {'; '.join(item.get('issues') or [])}")
    lines.append("")
    return "\n".join(lines)
