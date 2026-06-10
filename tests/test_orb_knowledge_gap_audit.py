"""Tests for ORB knowledge gap audit pack."""

from __future__ import annotations

from services.orb_knowledge_gap_audit_service import (
    ORB_KNOWLEDGE_GAP_DOMAINS,
    orb_knowledge_gap_audit_service,
)


def test_audit_covers_at_least_40_residential_domains():
    assert len(ORB_KNOWLEDGE_GAP_DOMAINS) >= 40
    domains = {item["domain"] for item in ORB_KNOWLEDGE_GAP_DOMAINS}
    assert "Daily recording" in domains
    assert "Safeguarding concern" in domains
    assert "Professional curiosity" in domains


def test_audit_report_identifies_structure():
    report = orb_knowledge_gap_audit_service.run_audit()
    assert report["total"] >= 40
    assert "internal_knowledge_passed" in report
    assert "internal_knowledge_failed" in report
    assert "openai_avoided" in report
    assert "gaps" in report
    assert "domain_results" in report
    assert isinstance(report["missing_knowledge_markers"], list)


def test_audit_report_identifies_missing_knowledge_markers():
    report = orb_knowledge_gap_audit_service.run_audit()
    daily = next(r for r in report["domain_results"] if r["prompt_id"] == "daily_recording")
    assert daily["selected_contract"] == "daily_record"
    assert daily["execution_policy"] in {"deterministic_only", "internal_template_plus_validator"}
    assert daily["openai_would_be_called"] is False


def test_audit_writes_report_files(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "services.orb_knowledge_gap_audit_service.REPORTS_DIR",
        tmp_path,
    )
    report = orb_knowledge_gap_audit_service.run_audit()
    paths = orb_knowledge_gap_audit_service.write_reports(report)
    assert paths["json"].endswith("orb_knowledge_gap_audit.json")
    assert paths["markdown"].endswith("orb_knowledge_gap_audit.md")
    assert (tmp_path / "orb_knowledge_gap_audit.json").exists()
    assert (tmp_path / "orb_knowledge_gap_audit.md").exists()
