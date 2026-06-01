from __future__ import annotations

from pathlib import Path

from services.orb_schema_verification import CANONICAL_SAVED_OUTPUT_COLUMNS, verify_saved_outputs_schema


def test_canonical_migration_file_exists():
    path = Path("sql/207_orb_saved_outputs_canonical.sql")
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "user_id" in text
    for column in ("intelligence_output", "content_markdown", "standalone_only"):
        assert column in text


def test_verify_saved_outputs_schema_without_db():
    result = verify_saved_outputs_schema()
    assert result["status"] in {"ok", "degraded", "fail"}
    assert "user_id" in CANONICAL_SAVED_OUTPUT_COLUMNS
