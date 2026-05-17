from __future__ import annotations

from schemas.missing_episode_contracts import MissingEpisodeCreateRequest, MissingEpisodeTransitionRequest
from schemas.return_home_interview_contracts import ReturnHomeInterviewCreateRequest, ReturnHomeInterviewRecord
from services.missing_episode_service import MissingEpisodeService
from services.return_home_interview_service import ReturnHomeInterviewService


USER = {
    "id": 7,
    "role": "manager",
    "provider_id": 3,
    "home_id": 11,
    "allowed_home_ids": [11],
    "permissions": ["records:read", "records:write", "chronology:read", "safeguarding:review", "governance:review"],
}


class FakeMissingRepository:
    def __init__(self):
        self.records = {}
        self.rhi_records = {}
        self.attached_missing = []
        self.attached_rhi = []

    def create_missing(self, conn, *, payload, current_user):
        from schemas.missing_episode_contracts import MissingEpisodeRecord

        data = {"lifecycle_state": "police_notified" if payload.get("police_notified_at") else "reported_missing", **payload}
        record = MissingEpisodeRecord(id=f"me-{len(self.records) + 1}", created_by=7, updated_by=7, **data)
        self.records[record.id] = record
        return record

    def get_missing(self, conn, *, missing_episode_id, current_user):
        return self.records.get(missing_episode_id)

    def list_missing(self, conn, *, current_user, filters=None, limit=100):
        return list(self.records.values())

    def update_missing_state(self, conn, *, missing_episode_id, lifecycle_state, payload, current_user):
        before = self.records[missing_episode_id]
        data = before.model_dump(mode="json")
        data.update({key: value for key, value in payload.items() if value not in (None, "")})
        data["lifecycle_state"] = lifecycle_state
        after = type(before)(**data)
        self.records[missing_episode_id] = after
        return before, after

    def create_rhi(self, conn, *, payload, current_user):
        record = ReturnHomeInterviewRecord(id="rhi-1", created_by=7, created_at=payload["interview_at"], **payload)
        self.rhi_records[record.id] = record
        return record

    def attach_missing_chronology_and_replay(self, conn, *, missing_episode_id, chronology_event_id, replay_event_ids):
        self.attached_missing.append((missing_episode_id, chronology_event_id, replay_event_ids))

    def attach_rhi_chronology_and_replay(self, conn, *, return_home_interview_id, chronology_event_id, replay_event_ids):
        self.attached_rhi.append((return_home_interview_id, chronology_event_id, replay_event_ids))


def test_missing_episode_lifecycle_and_rhi_completion(monkeypatch):
    monkeypatch.setattr("services.missing_episode_service.table_exists", lambda conn, table_name: False)
    monkeypatch.setattr("services.return_home_interview_service.table_exists", lambda conn, table_name: False)
    repo = FakeMissingRepository()
    service = MissingEpisodeService(repository=repo)
    rhi_service = ReturnHomeInterviewService(repository=repo)
    created = service.create(
        object(),
        payload=MissingEpisodeCreateRequest(
            home_id=11,
            young_person_id=22,
            missing_from="2026-05-17T10:00:00+00:00",
            circumstances="Child was reported missing from the home.",
            risk_level="high",
        ),
        current_user=USER,
    )
    assert created.lifecycle_state == "reported_missing"
    returned = service.mark_returned(
        object(),
        missing_episode_id=created.id,
        payload=MissingEpisodeTransitionRequest(returned_at="2026-05-17T13:00:00+00:00"),
        current_user=USER,
    )
    assert returned.lifecycle_state == "RHI_required"
    interview = rhi_service.create(
        object(),
        payload=ReturnHomeInterviewCreateRequest(
            home_id=11,
            young_person_id=22,
            missing_episode_id=created.id,
            interview_at="2026-05-17T14:00:00+00:00",
            child_voice="I wanted space and came back when I felt calmer.",
        ),
        current_user=USER,
    )
    assert interview.lifecycle_state == "completed"
    assert repo.records[created.id].lifecycle_state == "RHI_completed"
    assert repo.attached_missing
    assert repo.attached_rhi


def test_missing_episode_queues_surface_repeated_patterns(monkeypatch):
    monkeypatch.setattr("services.missing_episode_service.table_exists", lambda conn, table_name: False)
    repo = FakeMissingRepository()
    service = MissingEpisodeService(repository=repo)
    for index in range(3):
        service.create(
            object(),
            payload=MissingEpisodeCreateRequest(
                home_id=11,
                young_person_id=22,
                missing_from=f"2026-05-1{index}T10:00:00+00:00",
                circumstances="Missing episode requiring review.",
                risk_level="high",
            ),
            current_user=USER,
        )
    queues = service.queues(object(), current_user=USER)
    assert queues.summary["active_missing_episodes"] == 3
    assert queues.summary["repeated_missing_patterns"] == 3
    assert queues.summary["safeguarding_escalation"] == 3
