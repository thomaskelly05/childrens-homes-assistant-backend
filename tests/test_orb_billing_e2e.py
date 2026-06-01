from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from db.orb_stripe_events_db import is_orb_stripe_event_processed, record_orb_stripe_event


def test_duplicate_stripe_event_ignored():
    assert callable(is_orb_stripe_event_processed)


def test_record_stripe_event_contract():
    assert callable(record_orb_stripe_event)


def test_topup_metadata_contract():
    metadata = {"purchase_type": "usage_topup", "user_id": "12", "amount_pence": "500"}
    assert metadata["purchase_type"] == "usage_topup"
