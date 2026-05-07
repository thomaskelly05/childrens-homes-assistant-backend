from __future__ import annotations

from assistant.provider_benchmarking import (
    build_provider_benchmarking,
    build_provider_benchmarking_prompt_block,
    serialise_provider_benchmarking,
)


def test_provider_benchmarking_builds_home_benchmarks():
    homes = [
        {
            "home_name": "Home A",
            "evidence_index": [
                {
                    "citation_ref": "[incident:1]",
                    "record_type": "incident",
                    "excerpt": "Police informed after missing episode.",
                }
            ],
        },
        {
            "home_name": "Home B",
            "evidence_index": [
                {
                    "citation_ref": "[daily_note:2]",
                    "record_type": "daily_note",
                    "excerpt": "Young person engaged positively in education.",
                }
            ],
        },
    ]

    result = build_provider_benchmarking(
        homes=homes,
    )

    assert result.benchmarks != []
    assert result.home_count == 2


def test_provider_benchmarking_warns_when_no_home_evidence_exists():
    result = build_provider_benchmarking(
        homes=[],
    )

    assert result.provider_level == "unknown"
    assert "no_visible_home_evidence_for_provider_benchmarking" in result.warnings


def test_provider_benchmarking_prompt_block_contains_home_summary():
    homes = [
        {
            "home_name": "Home A",
            "evidence_index": [
                {
                    "citation_ref": "[risk:2]",
                    "record_type": "risk_assessment",
                    "excerpt": "Escalating self-harm concerns.",
                }
            ],
        }
    ]

    result = build_provider_benchmarking(
        homes=homes,
    )

    prompt_block = build_provider_benchmarking_prompt_block(result)

    assert "PROVIDER BENCHMARKING CONTEXT" in prompt_block
    assert "Home benchmarking summary" in prompt_block


def test_serialised_provider_benchmarking_contains_benchmarks():
    homes = [
        {
            "home_name": "Home A",
            "evidence_index": [
                {
                    "citation_ref": "[manager_action:2]",
                    "record_type": "manager_action",
                    "excerpt": "Oversight review delayed and actions remain open.",
                }
            ],
        }
    ]

    result = build_provider_benchmarking(
        homes=homes,
    )

    payload = serialise_provider_benchmarking(result)

    assert payload["benchmarks"] != []
    assert payload["provider_actions"] != []
