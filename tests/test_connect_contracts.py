import pytest
from pydantic import ValidationError

from schemas.connect_contracts import ConnectMessageCreate, ConnectThreadCreate


def test_thread_contract_normalises_members_and_title():
    payload = ConnectThreadCreate(title="  Home   channel  ", member_ids=[2, 2, 3], thread_type="home_channel")

    assert payload.title == "Home channel"
    assert payload.member_ids == [2, 3]


def test_message_contract_rejects_empty_body():
    with pytest.raises(ValidationError):
        ConnectMessageCreate(body="   ")


def test_message_contract_accepts_safeguarding_link_fields():
    payload = ConnectMessageCreate(
        body="Please review the linked update.",
        linked_child_id=10,
        linked_record_type="daily_note",
        linked_record_id="abc-123",
        priority="important",
    )

    assert payload.priority == "important"
    assert payload.linked_child_id == 10
