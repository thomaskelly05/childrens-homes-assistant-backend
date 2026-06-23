#!/usr/bin/env python3
"""ORB Live UI verification — PR #1724 full playbook merge (representative prompts)."""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SESSION_SECRET", "orb-live-ui-verification-pr1724")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://indicare:indicare123@localhost:5432/childrens_homes",
)

REPRESENTATIVE_PROMPTS: list[tuple[str, str, str]] = [
    ("daily_recording", "Daily recording", "Help me write a daily record — calm breakfast, chose toast, watched TV before handover."),
    ("missing_from_care", "Missing from care", "A young person is missing from care right now. What should staff do?"),
    ("allegations_lado", "Allegation against staff / LADO", "A young person alleged a member of staff grabbed them."),
    ("self_harm_suicide", "Self-harm", "Young person disclosed self-harm and said they want to die."),
    ("medication_refusal_support", "Medication refusal", "A young person refused medication. What should we consider?"),
    ("orb_communicate", "ORB Communicate support pack", "Create a communication support pack for a hospital visit tomorrow."),
    ("regulation_45", "Reg 45 evidence", "What should a Reg 45 review cover this quarter?"),
    ("aac_child_voice", "Child voice / gestures and symbols", "How can I evidence a young person's voice when they communicate mainly through gestures and symbols?"),
    ("physical_intervention_restraint", "Physical intervention", "Help me record a physical intervention used to guide a young person away from danger."),
    ("management_oversight_drift", "Management oversight", "What management oversight is needed when incident frequency is drifting up?"),
]


def _patch_access_for_local(user: dict[str, Any]) -> None:
    import auth.orb_standalone_premium_dependency as dep
    import services.orb_access_service as access_mod

    class _Decision:
        allowed = True
        reason = "verification"
        access_state = {"safety_accepted": True, "db_error": False}

    access_mod.orb_access_service.check_access = lambda *_a, **_k: _Decision()  # type: ignore[method-assign]

    async def _allow(_current_user=None):
        return user

    dep.require_rich_orb_premium_access = _allow  # type: ignore


async def _live_stream(message: str, user: dict[str, Any]) -> dict[str, Any]:
    import routers.orb_standalone_routes as routes

    started = time.perf_counter()
    first_token_ms: int | None = None
    first_token_text = ""
    token_events: list[str] = []
    metadata: dict[str, Any] = {}
    status_events: list[str] = []

    response = await routes.standalone_orb_conversation_stream(
        routes.OrbStandaloneConversationRequest(message=message, mode="Ask ORB"),
        current_user=user,
    )
    async for chunk in response.body_iterator:
        text = chunk.decode() if isinstance(chunk, bytes) else str(chunk)
        for block in text.split("\n\n"):
            if not block.strip():
                continue
            event = None
            data_line = None
            for line in block.split("\n"):
                if line.startswith("event:"):
                    event = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    data_line = line.split(":", 1)[1].strip()
            if not event or not data_line:
                continue
            try:
                payload = json.loads(data_line)
            except json.JSONDecodeError:
                continue
            if event == "status":
                status_events.append(str(payload.get("label") or payload.get("phase") or ""))
            elif event == "prelude":
                prelude_text = str(payload.get("text") or "").strip()
                if prelude_text:
                    if first_token_ms is None:
                        first_token_ms = int((time.perf_counter() - started) * 1000)
                        first_token_text = prelude_text
                    token_events.append(prelude_text)
            elif event == "token":
                delta = payload.get("delta") or ""
                if delta:
                    if first_token_ms is None:
                        first_token_ms = int((time.perf_counter() - started) * 1000)
                        first_token_text = delta.strip()
                    token_events.append(delta)
            elif event == "metadata":
                metadata = payload

    streamed = "".join(token_events)
    final_answer = str(metadata.get("answer") or streamed).strip()
    context_used = metadata.get("context_used") or {}
    timing = metadata.get("timing") or context_used.get("timing") or {}
    sources = metadata.get("sources") or []
    explainability = context_used.get("explainability") or {}
    source_anchors = explainability.get("source_anchors") or context_used.get("source_anchors") or []

    return {
        "first_token_ms": timing.get("first_token_ms") or first_token_ms,
        "total_ms": timing.get("total_ms") or timing.get("elapsed_ms") or int((time.perf_counter() - started) * 1000),
        "instant_first_lines_ms": timing.get("instant_first_lines_ms"),
        "instant_category": timing.get("instant_category"),
        "instant_lines_used": timing.get("instant_lines_used"),
        "first_token_text": first_token_text,
        "streamed_text": streamed,
        "final_answer": final_answer,
        "answer_chars": len(final_answer),
        "sources_count": len(sources),
        "source_anchors_count": len(source_anchors),
        "sources": sources[:6],
        "confidence": metadata.get("confidence"),
        "expert_depth": context_used.get("expert_depth") or timing.get("expert_depth"),
        "prompt_tier": timing.get("prompt_tier"),
        "provider": timing.get("provider"),
        "answer_repaired": metadata.get("answer_repaired"),
        "status_events": status_events[:5],
        "metadata_ok": metadata.get("ok"),
    }


def _has_dsl_outside_education(text: str) -> bool:
    from assistant.knowledge.residential_safeguarding_terminology import find_inappropriate_dsl_reference

    return bool(find_inappropriate_dsl_reference(text))


def _has_medication_error(text: str) -> bool:
    from assistant.knowledge.residential_safeguarding_terminology import find_inappropriate_medication_error_reference

    return bool(find_inappropriate_medication_error_reference(text))


def _is_sign_off_mode() -> bool:
    raw = os.getenv("ORB_LIVE_SIGN_OFF", "").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def _has_mock_leakage(text: str) -> bool:
    from services.orb_provider_user_answer_service import is_mock_provider_leakage

    return is_mock_provider_leakage(text)


def _assess_prompt(category_id: str, label: str, result: dict[str, Any]) -> dict[str, Any]:
    answer = result.get("final_answer") or ""
    streamed = result.get("streamed_text") or ""
    lower = answer.lower()
    concerns: list[str] = []
    failures: list[str] = []
    sign_off = _is_sign_off_mode()

    # Provider / mock leakage — hard fail in sign-off and for any visible answer
    provider = str(result.get("provider") or "").strip().lower()
    if sign_off and provider == "mock":
        failures.append("provider=mock in live sign-off run")
    if _has_mock_leakage(answer) or _has_mock_leakage(streamed):
        if sign_off:
            failures.append("mock/provider config text visible in answer")
        else:
            concerns.append("mock/provider config text visible in answer")
    if category_id == "daily_recording" and result.get("answer_chars", 0) == 0:
        failures.append("daily_recording produced empty assistant answer")
    if sign_off and category_id == "daily_recording" and not result.get("instant_lines_used"):
        failures.append("daily_recording missing instant first lines in sign-off")

    # 1–2: instant first line + streaming
    instant_ms = result.get("instant_first_lines_ms")
    first_token_ms = result.get("first_token_ms")
    if first_token_ms is None:
        failures.append("no first token observed")
    elif first_token_ms > 500:
        concerns.append(f"first_token_ms={first_token_ms} (target instant feel <500ms)")
    if not result.get("instant_lines_used"):
        if sign_off and category_id in {"daily_recording", "medication_refusal_support"}:
            failures.append("instant_lines_used=false")
        else:
            concerns.append("instant_lines_used=false")
    elif instant_ms is not None and instant_ms > 50:
        concerns.append(f"instant_first_lines_ms={instant_ms} exceeds 50ms target")

    # 3: final answer preservation
    first_line = (result.get("first_token_text") or "").strip()
    if first_line and first_line not in answer[: max(len(first_line) + 40, 120)]:
        concerns.append("instant first line may not be preserved in final answer")

    # 4: source chips / practice anchors
    safeguarding_ids = {
        "missing_from_care",
        "allegations_lado",
        "self_harm_suicide",
        "physical_intervention_restraint",
    }
    if category_id in safeguarding_ids and result.get("sources_count", 0) == 0:
        concerns.append("no source chips on safeguarding prompt")

    # 5–6: concision vs safeguarding weight
    routine_ids = {"daily_recording", "medication_refusal_support", "aac_child_voice", "regulation_45"}
    if category_id in routine_ids and result.get("answer_chars", 0) > 4500:
        concerns.append(f"routine answer long ({result.get('answer_chars')} chars)")
    if category_id in safeguarding_ids:
        if not any(t in lower for t in ("safeguard", "manager", "lado", "escalat", "on-call", "procedure")):
            concerns.append("safeguarding answer may be too light")
        if result.get("answer_chars", 0) < 200:
            concerns.append("safeguarding answer very short")

    # 7: DSL outside education
    if _has_dsl_outside_education(answer):
        failures.append("inappropriate DSL wording outside education context")

    # 8: medication error on refusal
    if category_id == "medication_refusal_support" and _has_medication_error(answer):
        failures.append("medication refusal mentions medication error")

    # 9: communicate support pack
    if category_id == "orb_communicate":
        pack_markers = ("support pack", "easy read", "visual", "hospital", "communication")
        if not any(m in lower for m in pack_markers):
            concerns.append("communicate answer may not be a support pack")

    # 10: templates child-centred (heuristic)
    if category_id == "orb_communicate":
        if not any(t in lower for t in ("young person", "child", "adult", "staff")):
            concerns.append("communicate pack may lack child-centred framing")

    # 11: wall of text on shift prompts
    shift_ids = {"daily_recording", "medication_refusal_support", "aac_child_voice"}
    if category_id in shift_ids and answer.count("\n\n") > 12:
        concerns.append("many paragraph breaks — possible wall of text")

    # 12: telemetry fields
    for field in ("instant_first_lines_ms", "instant_category", "first_token_ms", "total_ms", "provider_ms", "answer_chars"):
        if result.get(field) is None and field not in {"instant_first_lines_ms", "provider_ms"}:
            failures.append(f"missing telemetry: {field}")
        elif field == "instant_first_lines_ms" and result.get("instant_lines_used") and result.get(field) is None:
            failures.append("missing telemetry: instant_first_lines_ms")

    if failures:
        verdict = "fail"
    elif concerns:
        verdict = "concern"
    else:
        verdict = "pass"

    return {
        "category_id": category_id,
        "label": label,
        "verdict": verdict,
        "concerns": concerns,
        "failures": failures,
        "instant_first_line": first_line[:280],
        "final_answer_preview": answer[:500].replace("\n", " | "),
        "final_answer_chars": len(answer),
        "timing": {
            "instant_first_lines_ms": result.get("instant_first_lines_ms"),
            "instant_category": result.get("instant_category"),
            "first_token_ms": result.get("first_token_ms"),
            "total_ms": result.get("total_ms"),
        },
        "sources_count": result.get("sources_count"),
        "expert_depth": result.get("expert_depth"),
        "prompt_tier": result.get("prompt_tier"),
        "provider": result.get("provider"),
    }


async def main() -> int:
    from services.orb_provider_user_answer_service import (
        assert_live_provider_for_signoff,
        openai_key_configured,
    )
    from tests.conftest import TEST_USER_ID

    sign_off = _is_sign_off_mode()
    if sign_off:
        assert_live_provider_for_signoff()
        os.environ["AI_PROVIDER_STRICT"] = "true"

    user = {
        "id": TEST_USER_ID,
        "user_id": TEST_USER_ID,
        "email": "admin@indicare.co.uk",
        "role": "admin",
        "home_id": 1,
        "first_name": "Admin",
        "last_name": "User",
        "is_active": True,
    }
    _patch_access_for_local(user)

    has_openai = openai_key_configured()
    strict = os.getenv("AI_PROVIDER_STRICT", "").strip().lower() in {"1", "true", "yes", "on"}
    if sign_off:
        provider_note = "openai-live-sign-off"
    elif has_openai:
        provider_note = "openai-live"
    elif strict:
        provider_note = "strict-no-key (provider unavailable expected)"
    else:
        provider_note = "mock-fallback (no OPENAI_API_KEY)"
        if not has_openai:
            os.environ["AI_PROVIDER_STRICT"] = "false"

    print(f"# ORB Live UI Verification — PR #1724\n")
    print(f"Environment: thomaskelly05/childrens-homes-assistant-backend")
    print(f"Provider: {provider_note}")
    print(f"Sign-off mode: {'yes' if sign_off else 'no'}\n")

    rows: list[dict[str, Any]] = []
    for category_id, label, message in REPRESENTATIVE_PROMPTS:
        live = await _live_stream(message, user)
        assessed = _assess_prompt(category_id, label, live)
        assessed["message"] = message
        rows.append(assessed)
        await asyncio.sleep(0.25)

    print("| Category | Verdict | first_token_ms | total_ms | instant_category |")
    print("|----------|---------|----------------|----------|------------------|")
    for row in rows:
        t = row["timing"]
        print(
            f"| {row['label']} | {row['verdict']} | {t.get('first_token_ms')} | "
            f"{t.get('total_ms')} | {t.get('instant_category')} |"
        )

    out_path = ROOT / "reports" / "orb_live_ui_verification_pr1724.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(
            {
                "provider": provider_note,
                "sign_off": sign_off,
                "openai_configured": has_openai,
                "ai_provider_strict": strict,
                "results": rows,
            },
            indent=2,
        )
    )
    print(f"\nWrote {out_path}")

    fail_count = sum(1 for r in rows if r["verdict"] == "fail")
    concern_count = sum(1 for r in rows if r["verdict"] == "concern")
    if sign_off and fail_count:
        return 1
    return 1 if fail_count else (0 if concern_count == 0 else 0)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
