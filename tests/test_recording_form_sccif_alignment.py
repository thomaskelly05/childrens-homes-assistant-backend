from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCCIF_TS = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-sccif-alignment.ts"
GUIDANCE = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-form-therapeutic-guidance.tsx"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_sccif_disclaimer_not_compliant_language():
    text = _read(SCCIF_TS) + _read(GUIDANCE)
    assert "not a compliance" in text.lower() or "not a legal" in text.lower()
    assert "compliant" not in text.lower() or "not a compliance" in text.lower()


def test_sccif_relevance_phrase():
    assert "sccifRelevancePhrase" in _read(SCCIF_TS)
    assert "May support evidence" in _read(SCCIF_TS) or "Relevant to" in _read(SCCIF_TS)


def test_registry_has_sccif_alignment_field():
    registry = _read(REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts")
    assert "sccifAlignment" in registry


def test_safeguarding_form_sccif_override():
    text = _read(SCCIF_TS)
    assert "safeguarding-concern" in text
    assert "Protection" in text
