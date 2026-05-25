from __future__ import annotations

import pytest

from services.child_archive_service import child_archive_service
from services.document_plan_impact_service import document_plan_impact_service


@pytest.fixture(autouse=True)
def memory(monkeypatch):
    child_archive_service._memory = {}
    monkeypatch.setattr(child_archive_service, "_detect_storage_mode", lambda: "memory")


def test_lac_review_creates_care_plan_suggestions(fake_state):
    user = fake_state["user"]
    doc = {
        "id": "doc_lac",
        "young_person_id": 1,
        "document_type": "lac_review",
        "status": "approved",
        "title": "LAC review",
        "extracted_text": "Goal: improve education attendance\nTarget: 90% attendance",
    }
    result = document_plan_impact_service.process_signed_off_document(doc, user, conn=None)
    assert result["archive_record_id"]
    assert len(result["plan_impact_ids"]) >= 1


def test_pep_education_targets(fake_state):
    user = fake_state["user"]
    doc = {
        "id": "doc_pep",
        "child_id": 2,
        "document_type": "pep",
        "status": "signed_off",
        "extracted_text": "Target: complete GCSE maths",
    }
    result = document_plan_impact_service.process_signed_off_document(doc, user, conn=None)
    assert result["plan_impact_ids"]


def test_reg44_action_plan(fake_state):
    user = fake_state["user"]
    doc = {
        "id": "doc_r44",
        "young_person_id": 3,
        "document_type": "reg44-report",
        "status": "approved",
        "summary": "Reg 44 visit",
    }
    result = document_plan_impact_service.process_signed_off_document(doc, user, conn=None)
    assert result["archive_record_id"]
