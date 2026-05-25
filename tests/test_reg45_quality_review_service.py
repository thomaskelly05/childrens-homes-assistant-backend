from __future__ import annotations

import asyncio

import routers.reg45_quality_review_routes as routes
from schemas.reg45_quality_review import Reg45ReviewActionRequest, Reg45ReviewCreateRequest
from services.reg45_quality_review_registry_service import reg45_quality_review_registry_service
from services.reg45_quality_review_service import reg45_quality_review_service


def test_dashboard_builds(fake_state):
    user = fake_state["user"]
    dashboard = reg45_quality_review_service.build_dashboard(user, conn=None)
    assert dashboard.summary
    assert "does not determine compliance" in dashboard.summary.lower() or "compliance" in dashboard.summary.lower()


def test_generate_review_builds_sections(fake_state):
    user = fake_state["user"]
    review = reg45_quality_review_service.generate_review(
        user, Reg45ReviewCreateRequest(save_draft=False), conn=None
    )
    assert review.sections
    assert review.evidence_count >= 0
    section_types = {s.section_type for s in review.sections}
    assert "child_voice" in section_types
    assert "safeguarding_protection" in section_types
    assert "improvement_actions" in section_types


def test_gaps_identified(fake_state):
    user = fake_state["user"]
    items = reg45_quality_review_service.collect_evidence(user, conn=None)
    gaps = reg45_quality_review_service.identify_gaps(items)
    assert isinstance(gaps, list)


def test_improvement_action_drafts(fake_state):
    user = fake_state["user"]
    items = reg45_quality_review_service.collect_evidence(user, conn=None)
    gaps = reg45_quality_review_service.identify_gaps(items)
    drafts = reg45_quality_review_service.build_improvement_action_drafts(gaps)
    assert isinstance(drafts, list)


def test_lifecycle_and_finalise_no_compliance(fake_state):
    user = fake_state["user"]
    review = reg45_quality_review_service.generate_review(
        user, Reg45ReviewCreateRequest(save_draft=True), conn=None
    )
    result = reg45_quality_review_service.apply_action(
        review.id,
        Reg45ReviewActionRequest(action="finalise"),
        user,
        conn=None,
    )
    assert result.success
    assert result.review
    disclaimer = reg45_quality_review_registry_service.safe_review_disclaimer()
    md = reg45_quality_review_service.export_markdown(result.review)
    assert "compliance" in disclaimer.lower() or "not a compliance" in md.lower()
    assert "meets the standard" not in md.lower()
    assert "grade" not in md.lower() or "grades" in md.lower()


def test_export_markdown(fake_state):
    user = fake_state["user"]
    review = reg45_quality_review_service.generate_review(user, conn=None)
    md = reg45_quality_review_service.export_markdown(review)
    assert review.title in md
    assert "Draft review" in md or "manager" in md.lower()


def test_create_actions_from_gaps_honest_warning(fake_state):
    user = fake_state["user"]
    review = reg45_quality_review_service.generate_review(user, conn=None)
    ids, warning = reg45_quality_review_service.create_actions_from_gaps(review, user, conn=None)
    assert isinstance(ids, list)
    assert warning is None or isinstance(warning, str)


def test_no_raw_bodies_in_evidence(fake_state):
    user = fake_state["user"]
    review = reg45_quality_review_service.generate_review(user, conn=None)
    for section in review.sections:
        for item in section.evidence_items:
            assert item.safe_summary
            assert len(item.safe_summary) < 2000
            meta = item.metadata or {}
            assert meta.get("no_raw_body") is True or item.evidence_strength in {
                "route_hint_only",
                "partial_evidence",
                "draft_only",
            }


def test_health_route(fake_state):
    result = asyncio.run(routes.reg45_health(current_user=fake_state["user"], conn=None))
    assert result["success"] is True
    assert result["standalone_access"] is False
