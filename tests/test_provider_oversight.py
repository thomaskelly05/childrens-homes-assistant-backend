from __future__ import annotations

import pytest
from fastapi import HTTPException

from services.provider_oversight_service import provider_oversight_service


def test_provider_oversight_aggregates_provider_scoped_queues():
    user = {
        "id": 1,
        "role": "provider_admin",
        "provider_id": 99,
        "home_id": 10,
        "allowed_home_ids": [10],
    }
    records = [
        {
            "provider_id": 99,
            "home_id": 10,
            "entity_type": "safeguarding",
            "status": "open",
            "risk": "high",
            "requires_chronology": True,
            "governance_required": True,
            "inspection_gap": True,
        },
        {"provider_id": 100, "home_id": 20, "entity_type": "safeguarding", "status": "open"},
    ]

    overview = provider_oversight_service.build_overview(current_user=user, records=records)

    assert overview["provider_id"] == 99
    assert overview["summary"]["records"] == 1
    assert overview["summary"]["safeguarding_escalations"] == 1
    assert overview["summary"]["inspection_gaps"] == 1
    assert overview["summary"]["unsigned_governance_actions"] == 1


def test_provider_oversight_requires_provider_permission():
    with pytest.raises(HTTPException):
        provider_oversight_service.build_overview(
            current_user={"id": 2, "role": "support_worker", "home_id": 10, "provider_id": 99},
            records=[],
        )
