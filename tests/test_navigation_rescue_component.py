from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"
RESCUE = FRONTEND / "components" / "indicare" / "navigation" / "navigation-rescue.tsx"
LAYOUT = FRONTEND / "app" / "layout.tsx"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_navigation_rescue_component_exists():
    assert RESCUE.is_file(), "navigation-rescue.tsx must exist"


def test_navigation_rescue_imported_in_root_layout():
    layout = _read(LAYOUT)
    assert "NavigationRescue" in layout
    assert "navigation-rescue" in layout
    assert "<NavigationRescue" in layout


def test_navigation_rescue_uses_capture_phase_listener():
    text = _read(RESCUE)
    assert "addEventListener('click'" in text or 'addEventListener("click"' in text
    assert "capture: true" in text


def test_navigation_rescue_does_not_call_prevent_default():
    text = _read(RESCUE)
    assert "preventDefault" not in text


def test_navigation_rescue_ignores_external_links():
    text = _read(RESCUE)
    assert "url.origin" in text
    assert "window.location.origin" in text


def test_navigation_rescue_ignores_mailto_tel_javascript_and_hash():
    text = _read(RESCUE)
    assert "mailto:" in text
    assert "tel:" in text
    assert "javascript:" in text
    assert 'rawHref === "#"' in text or "rawHref === '#'" in text
    assert "startsWith('#')" in text


def test_navigation_rescue_ignores_blank_target_and_download():
    text = _read(RESCUE)
    assert "target" in text
    assert "_self" in text
    assert "download" in text


def test_navigation_rescue_supports_data_no_navigation_rescue():
    text = _read(RESCUE)
    assert 'data-no-navigation-rescue' in text
    assert "=== 'true'" in text or '=== "true"' in text


def test_navigation_rescue_uses_location_assign_fallback():
    text = _read(RESCUE)
    assert "window.location.assign" in text


def test_navigation_rescue_waits_before_fallback():
    text = _read(RESCUE)
    assert "setTimeout" in text
    assert "RESCUE_DELAY_MS" in text
    assert "300" in text


def test_navigation_rescue_checks_unchanged_url():
    text = _read(RESCUE)
    assert "window.location.href" in text
    assert "urlAtClick" in text


def test_navigation_rescue_plain_left_click_only():
    text = _read(RESCUE)
    assert "event.button === 0" in text
    assert "metaKey" in text
    assert "ctrlKey" in text
    assert "shiftKey" in text
    assert "altKey" in text


def test_navigation_rescue_respects_default_prevented():
    text = _read(RESCUE)
    assert "defaultPrevented" in text


def test_navigation_rescue_dev_logging_gated():
    text = _read(RESCUE)
    assert "nav_debug" in text
    assert "NODE_ENV" in text
    assert "[nav-rescue]" in text
