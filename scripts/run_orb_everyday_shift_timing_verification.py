#!/usr/bin/env python3
"""ORB Everyday Shift live timing verification — PR #1716 routing + optional live LLM."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SESSION_SECRET", "orb-everyday-shift-timing-verification-local")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://indicare:indicare123@localhost:5432/childrens_homes",
)

PROMPTS: list[tuple[str, str]] = [
    ("1_refused_school", "A young person refused school today. How should staff record this?"),
    ("2_upset_after_contact", "A young person was upset after contact. How should staff record this?"),
    ("3_refused_medication", "A young person refused medication. What should we consider?"),
    ("4_does_not_want_to_be_here", "A young person said they do not want to be here anymore."),
    ("5_allegation_grabbed", "A young person alleged a member of staff grabbed them."),
]


def _routing_snapshot(message: str) -> dict[str, Any]:
    from routers.orb_standalone_routes import (
        OrbStandaloneConversationRequest,
        _build_standalone_request_context,
    )
    from services.indicare_intelligence_core_service import indicare_intelligence_core_service
    from services.orb_brain_convergence_orchestrator_service import (
        orb_brain_convergence_orchestrator_service,
    )
    from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
    from services.orb_safety_scaffold_service import orb_safety_scaffold_service

    t0 = time.perf_counter()
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(message)
    depth = indicare_intelligence_core_service.estimate_expert_depth(message)
    scaffold = orb_safety_scaffold_service.build_from_message(message)
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        message,
        mode="Ask ORB",
    )
    chips = orb_brain_convergence_orchestrator_service.convergence_source_chips_as_sources(decision)
    ctx = _build_standalone_request_context(OrbStandaloneConversationRequest(message=message))
    context_build_ms = int((time.perf_counter() - t0) * 1000)
    telemetry = dict(ctx.get("routing_telemetry") or {})
    safety = dict(ctx.get("safety_scaffold") or {})

    return {
        "prompt_tier": bundle.get("prompt_tier"),
        "expert_depth": bundle.get("expert_depth") or depth,
        "active_final_domains": list(decision.active_final_domains),
        "prompt_chars": len(ctx.get("framed_message") or ""),
        "scaffold_guardrail_active": bool(safety.get("guardrail_active")),
        "scaffold_risk_level": safety.get("risk_level"),
        "scaffold_override_reason": telemetry.get("scaffold_override_reason"),
        "simple_standard_contract": telemetry.get("simple_standard_contract"),
        "source_chips_present": bool(decision.public_source_chips) and bool(chips),
        "source_chip_count": len(decision.public_source_chips or []),
        "final_prompt_tier": telemetry.get("final_prompt_tier"),
        "expert_depth_after_scaffold": telemetry.get("expert_depth_after_scaffold"),
        "per_layer_prompt_chars": telemetry.get("per_layer_prompt_chars"),
        "context_build_ms": context_build_ms,
        "contract_family": bundle.get("selected_contract"),
    }


def _assess_usefulness(prompt_id: str, answer: str, snap: dict[str, Any]) -> str:
    lower = (answer or "").lower()
    if not answer or len(answer.strip()) < 80:
        return "no — too short or empty"
    if prompt_id.startswith(("4_", "5_")):
        if any(term in lower for term in ("escalat", "dsl", "safeguarding", "manager", "lado", "allegation")):
            return "yes — safeguarding escalation preserved"
        return "partial — answer present but escalation markers weak"
    if any(term in lower for term in ("record", "chronolog", "note", "log", "document")):
        return "yes — practical recording guidance"
    return "partial — answer present but recording focus unclear"


async def _live_stream_timing(message: str, user: dict[str, Any]) -> dict[str, Any]:
    import routers.orb_standalone_routes as routes

    started = time.perf_counter()
    first_token_ms: int | None = None
    answer_parts: list[str] = []
    metadata: dict[str, Any] = {}

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
            if event == "token":
                delta = payload.get("delta") or ""
                if delta and first_token_ms is None:
                    first_token_ms = int((time.perf_counter() - started) * 1000)
                answer_parts.append(delta)
            elif event == "metadata":
                metadata = payload

    total_ms = int((time.perf_counter() - started) * 1000)
    timing = (metadata.get("context_used") or {}).get("timing") or {}
    answer = "".join(answer_parts) or metadata.get("answer") or ""
    return {
        "first_token_ms": timing.get("first_token_ms") or first_token_ms,
        "total_ms": timing.get("elapsed_ms") or timing.get("total_elapsed_ms") or total_ms,
        "provider_elapsed_ms": timing.get("provider_elapsed_ms"),
        "context_build_ms": timing.get("context_build_ms"),
        "prompt_tier_timing": timing.get("prompt_tier"),
        "provider": (timing.get("provider") or (metadata.get("context_used") or {}).get("model_routing", {}).get("provider")),
        "answer_chars": len(answer),
        "answer_preview": answer[:280].replace("\n", " "),
        "answer": answer,
        "metadata": metadata,
    }


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


async def run_live(user: dict[str, Any], *, provider_note: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for prompt_id, message in PROMPTS:
        snap = _routing_snapshot(message)
        live = await _live_stream_timing(message, user)
        rows.append(
            {
                "id": prompt_id,
                "message": message,
                "provider_note": provider_note,
                **snap,
                "first_token_ms": live.get("first_token_ms"),
                "total_ms": live.get("total_ms"),
                "provider_elapsed_ms": live.get("provider_elapsed_ms"),
                "stream_context_build_ms": live.get("context_build_ms"),
                "shift_useful": _assess_usefulness(prompt_id, live.get("answer", ""), snap),
                "answer_preview": live.get("answer_preview"),
            }
        )
        await asyncio.sleep(0.3)
    return rows


def _print_table(rows: list[dict[str, Any]], *, live: bool) -> None:
    headers = [
        "id",
        "prompt_tier",
        "expert_depth",
        "active_final_domains",
        "prompt_chars",
        "context_build_ms",
    ]
    if live:
        headers.extend(["first_token_ms", "total_ms", "provider"])
    headers.extend(["scaffold", "source_chips", "shift_useful"])

    print("| " + " | ".join(headers) + " |")
    print("| " + " | ".join("---" for _ in headers) + " |")
    for row in rows:
        domains = ", ".join(row.get("active_final_domains") or [])[:40]
        scaffold = "active" if row.get("scaffold_guardrail_active") else "off"
        chips = "yes" if row.get("source_chips_present") else "no"
        cells = [
            row["id"],
            str(row.get("final_prompt_tier") or row.get("prompt_tier")),
            str(row.get("expert_depth_after_scaffold") or row.get("expert_depth")),
            domains,
            str(row.get("prompt_chars")),
            str(row.get("context_build_ms")),
        ]
        if live:
            cells.extend(
                [
                    str(row.get("first_token_ms")),
                    str(row.get("total_ms")),
                    str(row.get("provider_note") or row.get("provider") or ""),
                ]
            )
        cells.extend([scaffold, chips, str(row.get("shift_useful", "routing-only"))])
        print("| " + " | ".join(cells) + " |")


def _slow_paths(rows: list[dict[str, Any]], *, live: bool) -> list[str]:
    issues: list[str] = []
    for row in rows:
        pid = row["id"]
        tier = str(row.get("final_prompt_tier") or row.get("prompt_tier") or "")
        depth = str(row.get("expert_depth_after_scaffold") or row.get("expert_depth") or "")
        chars = int(row.get("prompt_chars") or 0)
        if pid.startswith(("1_", "2_", "3_")):
            if tier not in {"residential", "fast"}:
                issues.append(f"{pid}: expected residential/fast tier, got {tier}")
            if depth not in {"residential_light", "residential_standard"}:
                issues.append(f"{pid}: expected residential_light/standard depth, got {depth}")
            if chars > 8000:
                issues.append(f"{pid}: prompt_chars {chars} exceeds 8k everyday cap")
            if row.get("scaffold_guardrail_active") and pid in {"1_refused_school", "2_upset_after_contact"}:
                issues.append(f"{pid}: scaffold guardrail unexpectedly active")
        if pid.startswith(("4_", "5_")):
            if tier != "deep":
                issues.append(f"{pid}: expected deep tier, got {tier}")
            if depth != "safeguarding_critical":
                issues.append(f"{pid}: expected safeguarding_critical depth, got {depth}")
            if not row.get("source_chips_present"):
                issues.append(f"{pid}: source chips missing")
            if pid == "5_allegation_grabbed" and not row.get("scaffold_guardrail_active"):
                issues.append(f"{pid}: allegation scaffold guardrail not active")
        if live:
            ft = row.get("first_token_ms")
            total = row.get("total_ms")
            if pid.startswith(("1_", "2_", "3_")) and ft and ft > 4000:
                issues.append(f"{pid}: slow first_token_ms={ft}")
            if pid.startswith(("1_", "2_", "3_")) and total and total > 15000:
                issues.append(f"{pid}: slow total_ms={total}")
    return issues


async def _async_main(args: argparse.Namespace) -> int:
    rows: list[dict[str, Any]] = []
    live = False
    provider_note = ""

    if args.local_live:
        from tests.conftest import TEST_USER_ID

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

        has_openai = bool(os.getenv("OPENAI_API_KEY", "").strip()) and "replace" not in os.getenv(
            "OPENAI_API_KEY", ""
        )
        if has_openai:
            provider_note = "openai-live"
        else:
            os.environ["AI_PROVIDER_STRICT"] = "false"
            provider_note = "mock-fallback (no OPENAI_API_KEY)"

        rows = await run_live(user, provider_note=provider_note)
        live = True
    else:
        for prompt_id, message in PROMPTS:
            snap = _routing_snapshot(message)
            rows.append({"id": prompt_id, "message": message, **snap, "shift_useful": "routing-only"})

    print("\n## ORB Everyday Shift Timing Verification (PR #1716)\n")
    if live:
        print(f"Stream mode: **{provider_note}** (local backend)\n")
    else:
        print("Mode: routing / prompt-build only (no LLM stream)\n")

    _print_table(rows, live=live)
    issues = _slow_paths(rows, live=live)
    print("\n### Remaining slow paths / regressions\n")
    if issues:
        for item in issues:
            print(f"- {item}")
    else:
        print("- None detected against expected routing/timing thresholds")

    everyday_ok = not any(i for i in issues if any(i.startswith(p) for p in ("1_", "2_", "3_")))
    safeguarding_ok = not any(i for i in issues if i.startswith(("4_", "5_")))
    print("\n### Shift acceptability\n")
    if everyday_ok and safeguarding_ok:
        print(
            "Everyday shift prompts (1–3) route light with capped prompts; "
            "safeguarding prompts (4–5) stay deep with chips."
        )
    elif everyday_ok and not safeguarding_ok:
        print(
            "Everyday recording prompts largely acceptable where `simple_standard_contract` applies (prompt 1). "
            "Safeguarding escalation routing for prompts 4–5 still needs work."
        )
    else:
        print("Everyday shift speed is not yet acceptable across all routine prompts — see issues above.")

    if args.json:
        print("\n```json")
        print(json.dumps(rows, indent=2))
        print("```")

    return 1 if issues else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--local-live",
        action="store_true",
        help="Run stream locally (OPENAI_API_KEY for live; mock fallback otherwise)",
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    return asyncio.run(_async_main(args))


if __name__ == "__main__":
    raise SystemExit(main())
