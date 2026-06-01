from __future__ import annotations

import re
from pathlib import Path

from services.orb_schema_verification import CANONICAL_SAVED_OUTPUT_COLUMNS, verify_saved_outputs_schema

MIGRATION_PATH = Path("sql/207_orb_saved_outputs_canonical.sql")


def test_canonical_migration_file_exists():
    assert MIGRATION_PATH.is_file()
    text = MIGRATION_PATH.read_text(encoding="utf-8")
    assert "user_id" in text
    for column in ("intelligence_output", "content_markdown", "standalone_only"):
        assert column in text


def test_migration_does_not_assign_jsonb_into_legacy_text_array_tags():
    text = MIGRATION_PATH.read_text(encoding="utf-8")
    forbidden = re.compile(
        r"SET\s+tags\s*=\s*COALESCE\s*\(\s*to_jsonb\s*\(\s*tags::text\[\]",
        re.IGNORECASE,
    )
    assert not forbidden.search(text), (
        "Migration must not assign JSONB into legacy TEXT[] tags column"
    )


def test_migration_uses_temporary_tags_jsonb_conversion():
    text = MIGRATION_PATH.read_text(encoding="utf-8")
    assert "tags_jsonb" in text
    assert "information_schema.columns" in text
    assert "tags_data_type = 'ARRAY'" in text or "tags_data_type = ''ARRAY''" in text
    assert "to_jsonb(tags)" in text


def test_migration_covers_075_and_200_shapes():
    text = MIGRATION_PATH.read_text(encoding="utf-8")
    assert "075" in text or "075_rich" in text
    assert "200" in text or "200_premium" in text or "workflow" in text


def test_migration_quarantines_rows_without_user_id():
    text = MIGRATION_PATH.read_text(encoding="utf-8")
    assert "orb_saved_outputs_orphaned" in text
    assert "user_id IS NULL" in text


def test_canonical_target_tags_is_jsonb():
    text = MIGRATION_PATH.read_text(encoding="utf-8")
    assert re.search(r"tags\s+JSONB", text, re.IGNORECASE)


def test_verify_saved_outputs_schema_without_db():
    result = verify_saved_outputs_schema()
    assert result["status"] in {"ok", "degraded", "fail"}
    assert "user_id" in CANONICAL_SAVED_OUTPUT_COLUMNS


def test_canonical_columns_include_rich_output_fields():
    required = {
        "user_id",
        "intelligence_output",
        "content_markdown",
        "content_json",
        "standalone_only",
        "tags",
    }
    assert required.issubset(set(CANONICAL_SAVED_OUTPUT_COLUMNS))
