#!/usr/bin/env python3
"""Smoke check for ORB Residential live-output quality polish."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.orb_brain_visibility_service import sanitize_orb_brain_metadata_for_user
from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_final_answer_repair_service import (
    canonical_answer_for_qa,
    repair_accessible_child_support_plan,
)
from services.orb_mandatory_response_contract_service import find_inappropriate_lado_reference
from services.orb_universal_answer_contract_map_service import detect_contract_family

PROMPTS = {
    "daily_note": "Help me write a daily note",
    "convert_recording": (
        "Convert this to recording wording: Jamie was attention seeking all night and refused to listen."
    ),
    "missing_cannabis": (
        "A young person has come back from missing for three days and smells of cannabis. What do I do?"
    ),
    "gdd_support_plan": (
        "Create a child-friendly support plan for a 17-year-old with GDD who uses widgets to communicate."
    ),
    "reg44": "What should a Reg 44 visitor be looking for in a children's home?",
}


def _fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def main() -> int:
    print("ORB live output quality smoke")
    failures: list[str] = []

    daily = orb_execution_policy_service.try_deterministic_answer(PROMPTS["daily_note"])
    if not daily or "paste your rough notes" not in daily["answer"].lower():
        failures.append("daily note not compact/deterministic")
    if daily and len(daily["answer"].split()) > 120:
        failures.append("daily note too long")
    if daily and any(name in daily["answer"].lower() for name in ("jamie", "sarah", "he was calm")):
        failures.append("daily note invents examples")

    convert = orb_execution_policy_service.try_deterministic_answer(PROMPTS["convert_recording"])
    if not convert:
        failures.append("convert to recording not deterministic")
    elif any(term in convert["answer"].lower() for term in ("seek attention", "attention seeking", "refused to listen")):
        failures.append("convert to recording retains judgemental wording")

    missing_answer = canonical_answer_for_qa(
        "missing_return_record",
        message=PROMPTS["missing_cannabis"],
    )
    if not missing_answer:
        failures.append("missing return canonical answer missing")
    elif find_inappropriate_lado_reference(missing_answer, PROMPTS["missing_cannabis"]):
        failures.append("missing return cannabis mentions LADO inappropriately")

    gdd_plan = repair_accessible_child_support_plan("", message=PROMPTS["gdd_support_plan"])
    if "…]" in gdd_plan or "...]" in gdd_plan:
        failures.append("GDD support plan has truncated placeholders")

    reg44 = orb_execution_policy_service.try_deterministic_answer(PROMPTS["reg44"])
    if not reg44:
        failures.append("reg44 not deterministic")
    else:
        reg_lower = reg44["answer"].lower()
        if "consultation" not in reg_lower and "staff" not in reg_lower:
            failures.append("reg44 missing consultation markers")
        if "previous" not in reg_lower:
            failures.append("reg44 missing previous visit/actions")

    for label, prompt in PROMPTS.items():
        family = detect_contract_family(prompt)
        if label == "daily_note" and family != "daily_record":
            failures.append(f"unexpected contract for {label}: {family}")
        if label == "missing_cannabis" and family != "missing_return_record":
            failures.append(f"unexpected contract for {label}: {family}")

    staff_view = sanitize_orb_brain_metadata_for_user(
        {"repair_reason": "therapeutic_language", "selected_contract": "daily_record"},
        {"role": "staff"},
    )
    if "repair_reason" in staff_view or "selected_contract" in staff_view:
        failures.append("secret sauce visible to normal users")

    if failures:
        for item in failures:
            print(f"  - {item}")
        _fail(f"{len(failures)} check(s) failed")

    print("PASS: all live output quality checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
