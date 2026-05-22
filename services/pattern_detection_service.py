from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from schemas.indicare_intelligence import PatternFinding, Severity
from services.risk_intelligence_language import field

SAFE_NOTICE = "records indicate a pattern for review; do not treat as a final decision"

PATTERN_TYPES = (
    "missing_episode_increase",
    "incident_increase",
    "restraint_increase",
    "safeguarding_concern_repeated",
    "child_voice_missing",
    "manager_review_missing",
    "risk_assessment_stale",
    "repeated_family_contact_escalation",
    "education_refusal_pattern",
    "medication_refusal_pattern",
    "night_time_incident_pattern",
    "staff_debrief_missing",
    "overdue_actions",
    "weak_recording_quality",
)

TYPE_ALIASES: dict[str, str] = {
    "missing": "missing_episode",
    "missing_episode": "missing_episode",
    "unauthorised_absence": "missing_episode",
    "incident": "incident",
    "restraint": "restraint",
    "physical_intervention": "restraint",
    "safeguarding": "safeguarding_concern",
    "safeguarding_concern": "safeguarding_concern",
    "daily_note": "daily_note",
    "daily_log": "daily_note",
    "risk_assessment": "risk_assessment",
    "risk": "risk_assessment",
    "family_contact": "family_contact",
    "family": "family_contact",
    "education": "education",
    "health": "health",
    "medication": "medication",
    "action": "action",
    "keywork": "keywork",
    "child_voice": "child_voice",
    "manager_review": "manager_review",
    "supervision": "staff_supervision",
    "training": "training_record",
}


def _norm_type(record: dict[str, Any]) -> str:
    raw = str(field(record, "record_type", "type", "event_type", "category") or "unknown").lower().strip()
    return TYPE_ALIASES.get(raw, raw)


def _record_id(record: dict[str, Any], index: int) -> str:
    return str(field(record, "id", "record_id", "source_id") or f"record-{index}")


def _parse_date(record: dict[str, Any]) -> datetime | None:
    for key in ("date", "event_date", "incident_datetime", "created_at", "updated_at", "note_date"):
        value = field(record, key)
        if not value:
            continue
        try:
            text = str(value).replace("Z", "+00:00")
            return datetime.fromisoformat(text)
        except Exception:
            continue
    return None


def _text_blob(record: dict[str, Any]) -> str:
    parts = [
        field(record, "title", "summary", "description", "notes", "content", "body"),
        field(record, "child_voice", "child_voice_text", "young_person_voice"),
    ]
    return " ".join(str(p) for p in parts if p).lower()


def _child_voice_present(record: dict[str, Any]) -> bool:
    if field(record, "child_voice_present") is True:
        return True
    blob = _text_blob(record)
    markers = ("child said", "young person said", "yp said", "child voice", "wishes", "feelings")
    return any(marker in blob for marker in markers)


def _manager_review_present(record: dict[str, Any]) -> bool:
    if field(record, "manager_reviewed", "manager_review_complete", "manager_review") is True:
        return True
    status = str(field(record, "manager_review_status", "review_status") or "").lower()
    return status in {"complete", "completed", "reviewed", "signed_off"}


class PatternDetectionService:
    """Deterministic early-pattern detection from passed-in records."""

    def detect(
        self,
        *,
        records: list[dict[str, Any]] | None = None,
        child_id: int | str | None = None,
        home_id: int | str | None = None,
        days: int = 30,
    ) -> list[PatternFinding]:
        items = list(records or [])
        if child_id is not None:
            items = [
                r
                for r in items
                if str(field(r, "child_id", "young_person_id", "yp_id") or "") in {"", str(child_id)}
                or field(r, "child_id", "young_person_id", "yp_id") in (None, "", child_id)
            ]
        if not items:
            return []

        cutoff = datetime.now(UTC) - timedelta(days=days)
        typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]] = defaultdict(list)
        for index, record in enumerate(items):
            when = _parse_date(record)
            if when and when.tzinfo is None:
                when = when.replace(tzinfo=UTC)
            if when and when < cutoff:
                continue
            typed[_norm_type(record)].append((index, record, when))

        findings: list[PatternFinding] = []
        findings.extend(self._volume_patterns(typed))
        findings.extend(self._child_voice_patterns(typed))
        findings.extend(self._manager_review_patterns(typed))
        findings.extend(self._risk_stale_patterns(typed))
        findings.extend(self._family_escalation_patterns(typed))
        findings.extend(self._refusal_patterns(typed))
        findings.extend(self._night_incident_patterns(typed))
        findings.extend(self._debrief_patterns(typed))
        findings.extend(self._overdue_actions(typed))
        findings.extend(self._weak_recording(typed))
        return findings

    def _volume_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        specs = (
            ("missing_episode", "missing_episode_increase", 2, "medium", "reg_12", "sccif_help_and_protection"),
            ("incident", "incident_increase", 3, "medium", "reg_35", "sccif_help_and_protection"),
            ("restraint", "restraint_increase", 2, "high", "reg_35", "sccif_help_and_protection"),
            ("safeguarding_concern", "safeguarding_concern_repeated", 2, "high", "reg_12", "sccif_safeguarding_culture"),
        )
        out: list[PatternFinding] = []
        for key, pattern_type, threshold, severity, reg, sccif in specs:
            bucket = typed.get(key, [])
            if len(bucket) < threshold:
                continue
            ids = [_record_id(r, i) for i, r, _ in bucket[:8]]
            out.append(
                PatternFinding(
                    pattern_type=pattern_type,
                    severity=severity,  # type: ignore[arg-type]
                    summary=(
                        f"records indicate {len(bucket)} {key.replace('_', ' ')} entries in the review window; "
                        "review recommended to understand triggers and oversight."
                    ),
                    linked_records=ids,
                    possible_triggers=["clustered events", "placement stress", "contact disruption"],
                    recommended_reviews=["manager oversight required", "check chronology and risk assessment links"],
                    regulatory_links=[reg],
                    sccif_links=[sccif],
                    manager_review_required=True,
                    safe_language_notice=SAFE_NOTICE,
                )
            )
        return out

    def _child_voice_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        care_types = ("daily_note", "keywork", "incident", "safeguarding_concern", "missing_episode")
        missing: list[str] = []
        for key in care_types:
            for index, record, _ in typed.get(key, []):
                if not _child_voice_present(record):
                    missing.append(_record_id(record, index))
        if len(missing) < 2:
            return []
        return [
            PatternFinding(
                pattern_type="child_voice_missing",
                severity="medium",
                summary=(
                    "evidence suggests child voice may be limited across recent care records; "
                    "review recommended to strengthen lived experience evidence."
                ),
                linked_records=missing[:10],
                recommended_reviews=["add child words where known", "link to Reg 7 and SCCIF children's voice"],
                regulatory_links=["reg_7"],
                sccif_links=["sccif_childrens_voice"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]

    def _manager_review_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        review_types = ("incident", "safeguarding_concern", "missing_episode", "restraint")
        missing: list[str] = []
        for key in review_types:
            for index, record, _ in typed.get(key, []):
                if not _manager_review_present(record):
                    missing.append(_record_id(record, index))
        if not missing:
            return []
        return [
            PatternFinding(
                pattern_type="manager_review_missing",
                severity="high",
                summary="records indicate manager review may not be visible on significant events; manager oversight required.",
                linked_records=missing[:10],
                recommended_reviews=["confirm manager review in source records", "check debrief and action closure"],
                regulatory_links=["reg_13"],
                sccif_links=["sccif_management_oversight"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]

    def _risk_stale_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        risks = typed.get("risk_assessment", [])
        if not risks:
            return []
        latest: datetime | None = None
        ids: list[str] = []
        for index, record, when in risks:
            ids.append(_record_id(record, index))
            if when and (latest is None or when > latest):
                latest = when
        stale_days = 90
        if latest and (datetime.now(UTC) - latest).days <= stale_days:
            return []
        return [
            PatternFinding(
                pattern_type="risk_assessment_stale",
                severity="medium",
                summary="evidence suggests risk assessment updates may be stale; review recommended against current incidents.",
                linked_records=ids[:5],
                recommended_reviews=["check risk assessment review date", "link recent safeguarding and missing evidence"],
                regulatory_links=["reg_12"],
                sccif_links=["sccif_help_and_protection"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]

    def _family_escalation_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        contacts = typed.get("family_contact", [])
        escalations = [
            (i, r)
            for i, r, _ in contacts
            if any(
                term in _text_blob(r)
                for term in ("escalat", "refused contact", "cancelled", "dispute", "conflict", "no show")
            )
        ]
        if len(escalations) < 2:
            return []
        return [
            PatternFinding(
                pattern_type="repeated_family_contact_escalation",
                severity="medium",
                summary="records indicate repeated family contact tension; review recommended for relationship support planning.",
                linked_records=[_record_id(r, i) for i, r in escalations[:8]],
                regulatory_links=["reg_11"],
                sccif_links=["sccif_experiences_and_progress"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]

    def _refusal_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        out: list[PatternFinding] = []
        edu = [
            (i, r)
            for i, r, _ in typed.get("education", [])
            if any(t in _text_blob(r) for t in ("refus", "non-attend", "exclusion", "not attend"))
        ]
        if len(edu) >= 2:
            out.append(
                PatternFinding(
                    pattern_type="education_refusal_pattern",
                    severity="medium",
                    summary="evidence suggests education engagement may need review; records indicate repeated refusal or non-attendance themes.",
                    linked_records=[_record_id(r, i) for i, r in edu[:8]],
                    regulatory_links=["reg_8"],
                    sccif_links=["sccif_experiences_and_progress"],
                    manager_review_required=True,
                    safe_language_notice=SAFE_NOTICE,
                )
            )
        meds = [
            (i, r)
            for i, r, _ in typed.get("medication", []) + typed.get("health", [])
            if any(t in _text_blob(r) for t in ("refus", "declined", "missed dose", "not taken"))
        ]
        if len(meds) >= 2:
            out.append(
                PatternFinding(
                    pattern_type="medication_refusal_pattern",
                    severity="medium",
                    summary="records indicate medication or health refusal themes; review recommended with health oversight.",
                    linked_records=[_record_id(r, i) for i, r in meds[:8]],
                    regulatory_links=["reg_10"],
                    sccif_links=["sccif_experiences_and_progress"],
                    manager_review_required=True,
                    safe_language_notice=SAFE_NOTICE,
                )
            )
        return out

    def _night_incident_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        night: list[str] = []
        for index, record, when in typed.get("incident", []):
            hour = when.hour if when else None
            if hour is None:
                text = str(field(record, "time", "incident_time") or "")
                if any(t in text for t in ("22:", "23:", "00:", "01:", "02:", "03:", "night")):
                    night.append(_record_id(record, index))
            elif hour >= 22 or hour < 6:
                night.append(_record_id(record, index))
        if len(night) < 2:
            return []
        return [
            PatternFinding(
                pattern_type="night_time_incident_pattern",
                severity="medium",
                summary="records indicate night-time incident clustering; review recommended for sleep, staffing and regulation support.",
                linked_records=night[:8],
                regulatory_links=["reg_35"],
                sccif_links=["sccif_experiences_and_progress"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]

    def _debrief_patterns(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        incidents = typed.get("incident", []) + typed.get("restraint", [])
        missing_debrief: list[str] = []
        for index, record, _ in incidents:
            blob = _text_blob(record)
            if "debrief" not in blob and not field(record, "debrief_complete", "staff_debrief"):
                missing_debrief.append(_record_id(record, index))
        if len(missing_debrief) < 2:
            return []
        return [
            PatternFinding(
                pattern_type="staff_debrief_missing",
                severity="medium",
                summary="evidence suggests staff debrief may be missing after significant events; review recommended.",
                linked_records=missing_debrief[:8],
                regulatory_links=["reg_13"],
                sccif_links=["sccif_workforce_stability"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]

    def _overdue_actions(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        overdue: list[str] = []
        now = datetime.now(UTC)
        for index, record, when in typed.get("action", []):
            status = str(field(record, "status") or "").lower()
            if status in {"completed", "closed", "done"}:
                continue
            due = _parse_date({**record, "date": field(record, "due_date", "due_at")})
            if due and due < now:
                overdue.append(_record_id(record, index))
            elif field(record, "overdue") is True:
                overdue.append(_record_id(record, index))
        if not overdue:
            return []
        return [
            PatternFinding(
                pattern_type="overdue_actions",
                severity="high",
                summary="records indicate overdue actions; manager oversight required for closure and impact review.",
                linked_records=overdue[:10],
                regulatory_links=["reg_13"],
                sccif_links=["sccif_management_oversight"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]

    def _weak_recording(
        self, typed: dict[str, list[tuple[int, dict[str, Any], datetime | None]]]
    ) -> list[PatternFinding]:
        weak: list[str] = []
        punitive = (
            "bad behaviour",
            "non-compliant",
            "attention seeking",
            "manipulative",
            "naughty",
            "kicked off",
        )
        for key in ("daily_note", "incident", "keywork"):
            for index, record, _ in typed.get(key, []):
                blob = _text_blob(record)
                if any(term in blob for term in punitive) or len(blob.strip()) < 40:
                    weak.append(_record_id(record, index))
        if len(weak) < 2:
            return []
        return [
            PatternFinding(
                pattern_type="weak_recording_quality",
                severity="medium",
                summary="evidence suggests recording quality may need strengthening; review recommended for therapeutic language and clarity.",
                linked_records=weak[:10],
                regulatory_links=["reg_6"],
                sccif_links=["sccif_records_monitoring_review"],
                manager_review_required=True,
                safe_language_notice=SAFE_NOTICE,
            )
        ]


pattern_detection_service = PatternDetectionService()
