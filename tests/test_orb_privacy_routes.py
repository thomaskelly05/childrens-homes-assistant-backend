"""ORB Residential privacy request route tests."""

from __future__ import annotations

import pytest

from db.orb_privacy_requests_db import sanitise_privacy_request_summary


def test_sanitise_privacy_request_summary_rejects_safeguarding_narrative():
    cleaned, error = sanitise_privacy_request_summary(
        "A young person disclosed abuse in the home yesterday."
    )
    assert cleaned == ""
    assert error
    assert "safeguarding" in error.lower() or "identifying" in error.lower()


def test_sanitise_privacy_request_summary_accepts_brief_request():
    cleaned, error = sanitise_privacy_request_summary(
        "Please delete my saved outputs and account metadata."
    )
    assert error is None
    assert "delete my saved outputs" in cleaned


def test_sanitise_privacy_request_summary_rejects_nhs_number():
    cleaned, error = sanitise_privacy_request_summary("Please delete data linked to NHS number 943 476 5919")
    assert cleaned == ""
    assert error
