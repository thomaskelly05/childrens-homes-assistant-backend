from __future__ import annotations

import re
from typing import Any

from repositories.reports_repository import generate_report_draft
from services.assistant_context_service import build_shared_assistant_context
from services.assistant_response_service import AssistantResponseService
from services.assistant_retrieval_service import AssistantRetrievalService
from services.os_chronology_service import _dedupe_chronology_items
from services.young_person_daily_notes_service import YoungPersonDailyNotesService
from services.young_person_incidents_service import YoungPersonIncidentsService


class _Cursor:
    def __init__(self, conn: "_Conn") -> None:
        self.conn = conn
        self._result: Any = None
        self.description = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=None):
        params = params or ()
        q = " ".join(str(query).split()).lower()
        if "from young_people" in q:
            self._result = self.conn.young_person
            return
        if "information_schema.columns" in q:
            self._result = {"exists": params[1] in self.conn.incident_cols}
            return
        if q.startswith("insert into daily_notes"):
            note_id = self.conn.next_id("daily_notes")
            self.conn.daily_notes[note_id] = {
                "id": note_id,
                "young_person_id": params[0],
                "home_id": params[1],
                "note_date": params[2],
                "shift_type": params[3],
                "mood": params[4],
                "presentation": params[5],
                "activities": params[6],
                "education_update": params[7],
                "health_update": params[8],
                "family_update": params[9],
                "behaviour_update": params[10],
                "young_person_voice": params[11],
                "positives": params[12],
                "actions_required": params[13],
                "significance": params[14],
                "workflow_status": params[15],
                "manager_review_comment": params[16],
                "approved_by": params[17],
                "approved_at": params[18],
                "returned_at": params[19],
                "submitted_at": params[20],
                "last_edited_at": params[21],
                "author_id": params[22],
                "created_at": params[23],
                "updated_at": params[24],
                "author_first_name": "Pat",
                "author_last_name": "Recorder",
                "approved_by_first_name": None,
                "approved_by_last_name": None,
            }
            self._result = {"id": note_id}
            return
        if "from daily_notes dn" in q:
            if "where dn.id" in q:
                self._result = self.conn.daily_notes.get(params[0])
            else:
                self._result = list(self.conn.daily_notes.values())
            return
        if q.startswith("insert into incidents"):
            incident_id = self.conn.next_id("incidents")
            columns = re.search(r"insert into incidents \((.*?)\)", q, re.I).group(1)
            names = [name.strip() for name in columns.split(",")]
            row = dict(zip(names, params))
            row["id"] = incident_id
            row["staff_first_name"] = "Sam"
            row["staff_last_name"] = "Staff"
            self.conn.incidents[incident_id] = row
            self._result = {"id": incident_id}
            return
        if "from incidents i" in q:
            if "where i.id" in q:
                self._result = self.conn.incidents.get(params[0])
            else:
                self._result = list(self.conn.incidents.values())
            return
        self._result = None

    def fetchone(self):
        if isinstance(self._result, list):
            return self._result[0] if self._result else None
        return self._result

    def fetchall(self):
        if isinstance(self._result, list):
            return self._result
        return [self._result] if self._result else []


class _Conn:
    incident_cols = {
        "antecedent",
        "presentation",
        "staff_response",
        "trauma_informed_formulation",
        "child_voice",
        "restorative_follow_up",
        "outcome",
        "manager_review_comment",
        "physical_intervention_used",
        "body_map_required",
        "external_notification_required",
        "external_notification_details",
    }

    def __init__(self) -> None:
        self.young_person = {"id": 42, "home_id": 7, "first_name": "Alex", "last_name": "Jones"}
        self.daily_notes: dict[int, dict[str, Any]] = {}
        self.incidents: dict[int, dict[str, Any]] = {}
        self.commits = 0
        self.rollbacks = 0
        self._ids = {"daily_notes": 100, "incidents": 200}

    def cursor(self, *_args, **_kwargs):
        return _Cursor(self)

    def next_id(self, table: str) -> int:
        self._ids[table] += 1
        return self._ids[table]

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


class _LinkingService:
    calls: list[dict[str, Any]] = []

    @classmethod
    def process_record_event(cls, **kwargs):
        cls.calls.append(kwargs)
        return {"ok": True, "chronology": {"source_table": kwargs["source_table"], "source_id": kwargs["source_id"]}}


def test_daily_note_saves_loads_and_syncs_to_chronology(monkeypatch):
    conn = _Conn()
    sync_calls: list[dict[str, Any]] = []
    _LinkingService.calls.clear()

    monkeypatch.setattr(
        "services.young_person_daily_notes_service.metadata_extraction_service.process_daily_note_saved",
        lambda *_args, **_kwargs: {"metadata": {"regulatory": {"quality_standard_ids": ["quality_and_purpose_of_care"], "evidence_strength": "medium", "sccif_area_ids": ["experiences_and_progress"]}}},
    )
    monkeypatch.setattr("services.young_person_daily_notes_service.sync_after_save", lambda **kwargs: sync_calls.append(kwargs) or True)

    created = YoungPersonDailyNotesService.create_daily_note(
        conn,
        young_person_id=42,
        payload={
            "note_date": "2026-05-15",
            "shift_type": "day",
            "presentation": "Settled after school.",
            "positives": "Completed homework.",
            "actions_required": "Share with key worker.",
            "link_to_chronology": True,
        },
        author_id=5,
        linking_service=_LinkingService,
    )

    loaded = YoungPersonDailyNotesService.get_daily_note(conn, created["id"])
    listed = YoungPersonDailyNotesService.list_daily_notes_for_young_person(conn, young_person_id=42)

    assert loaded["summary"] == "Completed homework. | Settled after school. | Share with key worker."
    assert listed[0]["id"] == created["id"]
    assert _LinkingService.calls[0]["source_table"] == "daily_notes"
    assert _LinkingService.calls[0]["young_person_id"] == 42
    assert sync_calls[0]["source_table"] == "daily_notes"
    assert sync_calls[0]["record"]["home_id"] == 7


def test_incident_saves_loads_and_syncs_to_chronology(monkeypatch):
    conn = _Conn()
    sync_calls: list[dict[str, Any]] = []
    _LinkingService.calls.clear()
    monkeypatch.setattr("services.young_person_incidents_service.sync_after_save", lambda **kwargs: sync_calls.append(kwargs) or True)

    created = YoungPersonIncidentsService.create_incident(
        conn,
        young_person_id=42,
        payload={
            "incident_datetime": "2026-05-15T10:00:00Z",
            "incident_type": "safeguarding_concern",
            "severity": "high",
            "description": "Disclosure recorded and manager informed.",
            "staff_response": "Immediate reassurance and escalation.",
            "follow_up_required": "Manager review today.",
        },
        actor_user_id=5,
        linking_service=_LinkingService,
    )

    loaded = YoungPersonIncidentsService.get_incident(conn, created["id"])
    listed = YoungPersonIncidentsService.list_incidents_for_young_person(conn, young_person_id=42)

    assert loaded["event_type"] == "incident"
    assert loaded["severity"] == "high"
    assert listed[0]["id"] == created["id"]
    assert _LinkingService.calls[0]["source_table"] == "incidents"
    assert _LinkingService.calls[0]["workflow"]["safeguarding"] is True
    assert sync_calls[0]["source_table"] == "incidents"
    assert sync_calls[0]["record"]["home_id"] == 7


def test_chronology_keeps_source_rows_and_removes_sync_duplicates():
    items = [
        {"id": "daily_log:101", "source_type": "daily_log", "canonical_source_key": "daily_notes:101", "date_time": "2026-05-15T09:00:00"},
        {"id": "chronology:101", "source_type": "chronology", "canonical_source_key": "daily_notes:101", "date_time": "2026-05-15T09:01:00"},
        {"id": "incident:201", "source_type": "incident", "canonical_source_key": "incidents:201", "date_time": "2026-05-15T10:00:00"},
        {"id": "chronology:201", "source_type": "chronology", "canonical_source_key": "incidents:201", "date_time": "2026-05-15T10:01:00"},
    ]

    deduped = _dedupe_chronology_items(items)

    assert {item["id"] for item in deduped} == {"daily_log:101", "incident:201"}


def test_assistant_retrieval_uses_scoped_chronology_and_evidence(monkeypatch):
    monkeypatch.setattr(
        "services.assistant_retrieval_service.list_chronology",
        lambda **_kwargs: {"items": [{"id": "incident:201", "source_type": "incident", "source_id": "201", "title": "Safeguarding Concern", "summary": "Disclosure recorded.", "home_id": "7", "young_person_ids": ["42"], "date_time": "2026-05-15T10:00:00"}]},
    )
    monkeypatch.setattr("services.assistant_retrieval_service.list_evidence", lambda *_args, **_kwargs: [{"id": "standard_link:1", "source_type": "incidents", "source_id": "201", "title": "Protection standard link", "description": "Strong evidence.", "quality": "strong", "linked_regulation": "helped_and_protected"}])
    monkeypatch.setattr("services.assistant_retrieval_service.list_actions", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_documents", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_reports", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.young_person_workspace", lambda *_args, **_kwargs: {})

    context = build_shared_assistant_context(
        current_user={"id": 5, "role": "manager", "home_id": 7, "allowed_home_ids": [7]},
        requested_context={"selected_young_person_id": 42, "current_route": "/young-people/42/chronology"},
        mode="chronology_qna",
    )
    result = AssistantRetrievalService().retrieve(
        _Conn(),
        message="What safeguarding chronology evidence is available?",
        context=context,
        current_user={"id": 5, "role": "manager", "home_id": 7, "allowed_home_ids": [7]},
    )

    assert [source["source_id"] for source in result.sources[:2]] == ["201", "201"]
    assert result.evidence_gaps == []


def test_standalone_assistant_does_not_use_os_retrieval():
    context = build_shared_assistant_context(
        current_user={"id": 5, "role": "manager", "home_id": 7},
        requested_context={"selected_young_person_id": 42, "current_route": "/assistant"},
        mode="standalone",
    )

    data = AssistantResponseService().query(
        _Conn(),
        message="Can you help draft safer recording?",
        context=context,
        current_user={"id": 5, "role": "manager", "home_id": 7},
    )

    assert data["assistant_product_mode"] == "standalone_assistant"
    assert "citations" not in data or data["citations"] == []


def test_report_draft_includes_chronology_citations_and_evidence_links():
    draft = generate_report_draft(
        payload={"report_type": "inspection_readiness", "title": "Evidence review"},
        chronology_items=[
            {"id": "daily_log:101", "title": "Day daily note", "summary": "Settled after school.", "citation_label": "Daily recording #101", "source_url": "/daily-logs/101", "date_time": "2026-05-15"},
            {"id": "incident:201", "title": "Safeguarding concern", "summary": "Disclosure recorded.", "citation_label": "Incident #201", "source_url": "/incidents/201", "date_time": "2026-05-15"},
        ],
        evidence=[{"id": "standard_link:1"}, {"id": "record_evidence_link:2"}],
    )

    assert "Day daily note: Settled after school." in draft["body"]
    assert draft["citations"][0]["label"] == "Daily recording #101"
    assert draft["evidence_links"] == ["standard_link:1", "record_evidence_link:2"]
    assert draft["evidence_gaps"] == []
