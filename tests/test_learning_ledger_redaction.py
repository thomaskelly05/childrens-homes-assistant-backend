from __future__ import annotations

from services.orb_learning_ledger_service import OrbLearningLedgerService, _redact_prompt_summary


SAMPLES = [
    ("John Smith is 14 years old", "name"),
    ("DOB: 01/02/2010", "dob"),
    ("NHS 943 476 5829", "nhs"),
    ("attends Oakwood Academy school", "school"),
    ("mum called Sarah Jones", "family"),
    ("lives at SW1A 1AA", "postcode"),
    ("allegation of sexual harm and LADO referral", "safeguarding"),
]


def test_redact_prompt_summary_removes_identifiers():
    for text, _label in SAMPLES:
        out = _redact_prompt_summary(text)
        assert "John Smith" not in out
        assert "01/02/2010" not in out
        assert "943" not in out or "[" in out


def test_record_never_stores_prompt_text():
    svc = OrbLearningLedgerService()
    row = svc.record(
        {
            "prompt_text": "Full secret prompt about Jane Doe",
            "prompt_summary": "Jane Doe missing from care",
            "learning_tags": ["missing_episode"],
        }
    )
    assert "prompt_text" not in row
    assert "Jane Doe" not in row.get("prompt_summary", "")
    assert row["learning_tags"] == ["missing_episode"]


def test_prompt_summary_truncated_after_redaction():
    long_text = "John Smith " * 200
    out = _redact_prompt_summary(long_text, max_len=100)
    assert len(out) <= 103
