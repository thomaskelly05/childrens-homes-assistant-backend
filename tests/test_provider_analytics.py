from __future__ import annotations

from assistant.provider_analytics import (
    build_provider_analytics,
    build_provider_analytics_prompt_block,
    serialise_provider_analytics,
)


def test_provider_analytics_builds_cross_home_view():
    homes = [
        {
            "home_id": "home-1",
            "home_name": "North House",
            "evidence_index": [
                {
                    "citation_ref": "[incident:44]",
                    "record_type": "incident",
                    "date": "2030-01-03T12:00:00",
                    "excerpt": "Police informed after missing episode.",
                }
            ],
        },
        {
            "home_id": "home-2",
            "home_name": "South House",
            "evidence_index": [
                {
                    "citation_ref": "[daily_note:3]",
                    "record_type": "daily_note",
                    "date": "2030-01-05T09:00:00",
                    "excerpt": "Young person engaged positively in education.",
                }
            ],
        },
    ]

    result = build_provider_analytics(
        homes=homes,
    )

    assert result.home_count == 2
    assert result.provider_headlines != []


def test_provider_analytics_warns_when_no_visible_home_evidence_exists():
    result = build_provider_analytics(
        homes=[],
    )

    assert result.provider_trend == "unknown"
    assert "no_visible_home_evidence_for_provider_analytics" in result.warnings


def test_provider_analytics_prompt_block_contains_provider_actions():
    homes = [
        {
            "home_name": "Example Home",
            "evidence_index": [
                {
                    "citation_ref": "[task:7]",
                    "record_type": "task",
                    "excerpt": "Overdue safeguarding review action.",
                }
            ],
        }
    ]

    result = build_provider_analytics(
        homes=homes,
    )

    prompt_block = build_provider_analytics_prompt_block(result)

    assert "PROVIDER ANALYTICS CONTEXT" in prompt_block
    assert "Provider actions" in prompt_block


def test_serialised_provider_analytics_contains_home_payloads():
    homes = [
        {
            "home_name": "Example Home",
            "evidence_index": [
                {
                    "citation_ref": "[risk:2]",
                    "record_type": "risk_assessment",
                    "excerpt": "Escalating emotional wellbeing concerns.",
                }
            ],
        }
    ]

    result = build_provider_analytics(
        homes=homes,
    )

    payload = serialise_provider_analytics(result)

    assert payload["high_attention_homes"] != [] or payload["positive_or_stable_homes"] != []
