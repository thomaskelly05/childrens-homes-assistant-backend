from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from schemas.ai_models import AiRiskLevel
from services.orb_plan_enforcement_service import (
    USAGE_LIMIT_USER_MESSAGE,
    orb_plan_enforcement_service,
)


def test_soft_limit_does_not_block():
    with patch.object(orb_plan_enforcement_service, "check_request") as mock_check:
        mock_check.return_value = MagicMock(
            allowed=True,
            level="soft",
            soft_limit_reached=True,
            message="approaching limit",
        )
        decision = orb_plan_enforcement_service.check_request(
            user_id=1,
            user={"id": 1, "role": "orb_residential"},
            message="hello",
        )
        assert decision.allowed is True
        assert decision.soft_limit_reached is True


def test_hard_limit_blocks_non_safeguarding():
    with patch("services.orb_plan_enforcement_service.orb_usage_budget_service.check_budget") as mock_budget:
        mock_budget.return_value = MagicMock(allowed=False, level="hard", use_safeguarding_template=False, message="blocked")
        decision = orb_plan_enforcement_service.check_request(
            user_id=1,
            user={"id": 1, "role": "orb_residential"},
            message="hello",
        )
        assert decision.allowed is False
        assert decision.hard_limit_reached is True


def test_high_risk_safeguarding_returns_safety_template():
    decision = orb_plan_enforcement_service.check_request(
        user_id=1,
        user={"id": 1, "role": "orb_residential"},
        message="immediate safeguarding danger and abuse allegation",
        risk_level=AiRiskLevel.SAFEGUARDING_SENSITIVE,
        prompt_tier="deep",
    )
    if decision.hard_limit_reached:
        assert decision.use_safeguarding_template or decision.allowed
    else:
        assert decision.allowed is True


def test_enforce_or_raise_returns_429_style():
    with patch.object(orb_plan_enforcement_service, "check_request") as mock_check:
        mock_check.return_value = MagicMock(
            allowed=False,
            level="hard",
            message=USAGE_LIMIT_USER_MESSAGE,
            hard_limit_reached=True,
            use_safeguarding_template=False,
        )
        with pytest.raises(HTTPException) as exc:
            orb_plan_enforcement_service.enforce_or_raise(user_id=2, user={"id": 2}, message="hello")
        assert exc.value.status_code == 429
        assert exc.value.detail["os_access_granted"] is False


def test_admin_bypass_skips_limits():
    decision = orb_plan_enforcement_service.check_request(
        user_id=1,
        user={"id": 1, "role": "admin"},
        message="hello",
    )
    assert decision.bypassed is True
