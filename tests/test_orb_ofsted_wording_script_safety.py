"""Regression tests for ORB wording safety and technical path restoration scripts."""

from __future__ import annotations

from pathlib import Path

from scripts.apply_orb_ofsted_wording_safety import apply_wording_safety
from scripts.restore_inspection_readiness_technical_paths import restore_content

ROOT = Path(__file__).resolve().parents[1]


def test_wording_script_preserves_inspection_readiness_route() -> None:
    sample = 'href="/inspection-readiness"\nlabel="Ofsted readiness"\n'
    updated = apply_wording_safety(sample)
    assert "/inspection-readiness" in updated
    assert "Inspection evidence preparation" in updated
    assert "/inspection evidence preparation" not in updated


def test_wording_script_preserves_component_import_alias() -> None:
    sample = "import { X } from '@/components/inspection-readiness/foo'\n"
    assert apply_wording_safety(sample) == sample


def test_wording_script_preserves_snake_case_identifier() -> None:
    sample = "def build_inspection_readiness_summary():\n    return inspection_readiness\n"
    assert apply_wording_safety(sample) == sample


def test_wording_script_preserves_data_orb_attribute() -> None:
    sample = '<div data-orb-inspection-readiness-panel />\n'
    assert apply_wording_safety(sample) == sample


def test_wording_script_replaces_display_ofsted_readiness() -> None:
    sample = '<h1>Ofsted readiness</h1>\n<p>Help staff with inspection readiness.</p>\n'
    updated = apply_wording_safety(sample)
    assert "Ofsted readiness" not in updated
    assert "Inspection evidence preparation" in updated
    assert "inspection evidence preparation" in updated


def test_restore_script_fixes_corrupted_api_path() -> None:
    sample = "fetch('/api/inspection evidence preparation/health')\n"
    restored = restore_content(sample)
    assert restored == "fetch('/api/inspection-readiness/health')\n"


def test_restore_script_fixes_corrupted_import_alias() -> None:
    sample = "from '@/lib/os-api/inspection evidence preparation'\n"
    restored = restore_content(sample)
    assert restored == "from '@/lib/os-api/inspection-readiness'\n"


def test_restore_script_fixes_corrupted_data_orb_attribute() -> None:
    sample = 'data-orb-inspection evidence preparation-panel\n'
    restored = restore_content(sample)
    assert restored == "data-orb-inspection-readiness-panel\n"
