from __future__ import annotations

from assistant.cross_home_safeguarding_trends import (
    build_cross_home_safeguarding_prompt_block,
    build_cross_home_safeguarding_trends,
    serialise_cross_home_safeguarding_trends,
)


def test_cross_home_safeguarding_trends_builds_provider_view():
    homes = [
        {
            "home_name": "Home A",
            "evidence_index": [
                {
                    "citation_ref": "[incident:1]",
                    "record_type": "incident",
                    "excerpt": "Young person missing overnight and police informed.",
                }
            ],
        },
        {
            "home_name": "Home B",
            "evidence_index": [
                {
                    "citation_ref": "[incident:2]",
                    "record_type": "incident",
                    "excerpt": "Concerns regarding criminal exploitation and unsafe adults.",
                }
            ],
        },
    ]

    result = build_cross_home_safeguarding_trends(
        homes=homes,
    )

    assert result.home_trends != []
    assert result.home_count == 2


def test_cross_home_safeguarding_trends_warns_when_no_home_evidence_exists():
    result = build_cross_home_safeguarding_trends(
        homes=[],
    )

    assert result.provider_safeguarding_level == "unknown"
    assert "no_visible_home_evidence_for_cross_home_safeguarding_trends" in result.warnings


def test_cross_home_safeguarding_prompt_block_contains_recurring_themes():
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
        }
    ]

    result = build_cross_home_safeguarding_trends(
        homes=homes,
    )

    prompt_block = build_cross_home_safeguarding_prompt_block(result)

    assert "CROSS-HOME SAFEGUARDING TRENDS CONTEXT" in prompt_block
    assert "Provider safeguarding level" in prompt_block


def test_serialised_cross_home_safeguarding_contains_home_payloads():
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
        }
    ]

    result = build_cross_home_safeguarding_trends(
        homes=homes,
    )

    payload = serialise_cross_home_safeguarding_trends(result)

    assert payload["home_trends"] != []
    assert payload["provider_actions"] != []
