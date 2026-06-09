from __future__ import annotations

from db.founder_telemetry_db import (
    reject_identifiable_metadata,
    sanitise_telemetry_metadata,
)


def test_reject_identifiable_metadata_flags_blocked_keys():
    violations = reject_identifiable_metadata({"childName": "hidden", "mode": "Ask ORB"})
    assert "childName" in violations


def test_sanitise_telemetry_metadata_truncates_long_strings():
    redacted = sanitise_telemetry_metadata({"note": "a" * 300})
    assert isinstance(redacted, dict)
    assert len(redacted["note"]) <= 201


def test_sanitise_telemetry_metadata_strips_prompt_fields():
    redacted = sanitise_telemetry_metadata(
        {"mode": "Ask ORB", "prompt": "full prompt body", "message": "hello"}
    )
    assert redacted == {"mode": "Ask ORB"}
