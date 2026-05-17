from __future__ import annotations

from schemas.safeguarding_contracts import SafeguardingCreateRequest, SafeguardingTransitionRequest
from services.safeguarding_domain_service import SafeguardingDomainService


USER = {
    "id": 7,
    "role": "manager",
    "provider_id": 3,
    "home_id": 11,
    "allowed_home_ids": [11],
    "permissions": ["records:read", "records:write", "chronology:read", "safeguarding:review", "governance:review"],
}


class FakeSafeguardingRepository:
    def __init__(self):
        self.records = {}
        self.attached = []

    def create(self, conn, *, payload, current_user):
        from schemas.safeguarding_contracts import SafeguardingRecord

        record = SafeguardingRecord(id="sg-1", created_by=7, updated_by=7, **payload)
        self.records[record.id] = record
        return record

    def get(self, conn, *, safeguarding_id, current_user):
        return self.records.get(safeguarding_id)

    def list(self, conn, *, current_user, filters=None, limit=100):
        return list(self.records.values())

    def update_state(self, conn, *, safeguarding_id, lifecycle_state, payload, current_user):
        before = self.records[safeguarding_id]
        data = before.model_dump(mode="json")
        data.update({key: value for key, value in payload.items() if value not in (None, "")})
        data["lifecycle_state"] = lifecycle_state
        after = type(before)(**data)
        self.records[safeguarding_id] = after
        return before, after

    def attach_chronology_and_replay(self, conn, *, safeguarding_id, chronology_event_id, replay_event_ids):
        self.attached.append((safeguarding_id, chronology_event_id, replay_event_ids))


def test_safeguarding_create_review_escalate_resolve_without_fake_operational_truth(monkeypatch):
    monkeypatch.setattr("services.safeguarding_domain_service.table_exists", lambda conn, table_name: False)
    repo = FakeSafeguardingRepository()
    service = SafeguardingDomainService(repository=repo)
    created = service.create(
        object(),
        payload=SafeguardingCreateRequest(
            home_id=11,
            young_person_id=22,
            title="Concern raised",
            concern_summary="Child shared a concern and manager review is required.",
            child_voice="I felt worried.",
            evidence_ids=["chronology:1"],
        ),
        current_user=USER,
    )
    assert created.lifecycle_state == "draft"
    reviewed = service.review(object(), safeguarding_id=created.id, payload=SafeguardingTransitionRequest(notes="Reviewed"), current_user=USER)
    assert reviewed.lifecycle_state == "manager_review"
    escalated = service.escalate(object(), safeguarding_id=created.id, payload=SafeguardingTransitionRequest(notes="Escalated"), current_user=USER)
    assert escalated.lifecycle_state == "escalated"
    resolved = service.resolve(object(), safeguarding_id=created.id, payload=SafeguardingTransitionRequest(notes="Resolved"), current_user=USER)
    assert resolved.lifecycle_state == "resolved"
    assert repo.attached


def test_safeguarding_queues_surface_first_class_categories(monkeypatch):
    monkeypatch.setattr("services.safeguarding_domain_service.table_exists", lambda conn, table_name: False)
    repo = FakeSafeguardingRepository()
    service = SafeguardingDomainService(repository=repo)
    record = service.create(
        object(),
        payload=SafeguardingCreateRequest(
            home_id=11,
            young_person_id=22,
            title="External notification needed",
            concern_summary="External notification pending.",
            external_notification_required=True,
        ),
        current_user=USER,
    )
    service.review(object(), safeguarding_id=record.id, payload=SafeguardingTransitionRequest(child_voice=""), current_user=USER)
    queues = service.queues(object(), current_user=USER)
    assert queues.summary["unresolved_safeguarding"] == 1
    assert queues.summary["external_notification_pending"] == 1
    assert queues.summary["child_voice_missing"] == 1
