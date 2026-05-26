from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_recording_editor_action_handlers():
    text = (FRONTEND / "components/indicare/record/recording-editor.tsx").read_text(encoding="utf-8")
    for marker in (
        "recording-save-draft",
        "recording-submit-draft",
        "recording-ready-for-review",
        "handleSubmit",
        "persistDraft",
    ):
        assert marker in text


def test_recording_review_actions_handlers():
    text = (FRONTEND / "components/indicare/record/recording-review-actions.tsx").read_text(encoding="utf-8")
    assert "recording-review-approve" in text
    assert "recording-review-request-changes" in text
    assert "onClick" in text
    assert "recording-review-action-error" in text
