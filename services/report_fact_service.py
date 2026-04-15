from __future__ import annotations

import hashlib
import json
from typing import Any

from psycopg2.extras import RealDictCursor


SUPPORTED_REPORT_TYPES = {"monthly", "reg45", "yearly"}


def _fetch_one(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        row = cur.fetchone()
        return dict(row) if row else None


def _fetch_all(conn, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        rows = cur.fetchall() or []
        return [dict(row) for row in rows]


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def _safe_int_list(value: Any) -> list[int]:
    if not isinstance(value, list):
        return []
    result: list[int] = []
    for item in value:
        parsed = _safe_int(item)
        if parsed is not None:
            result.append(parsed)
    return result


def _resolve_home_ids(
    *,
    home_id: int | None,
    access_level: str | None,
    allowed_home_ids: list[int] | None,
) -> list[int]:
    if (access_level or "").strip().lower() == "provider":
        ids = _safe_int_list(allowed_home_ids or [])
        if ids:
            return ids
        return [home_id] if home_id else []
    return [home_id] if home_id else []


def _snapshot_key(
    *,
    report_type: str,
    home_id: int | None,
    provider_id: int | None,
    access_level: str | None,
    allowed_home_ids: list[int] | None,
    start_date: str,
    end_date: str,
) -> str:
    payload = {
        "report_type": str(report_type or "").strip().lower(),
        "home_id": home_id,
        "provider_id": provider_id,
        "access_level": (access_level or "").strip().lower(),
        "allowed_home_ids": sorted(_safe_int_list(allowed_home_ids or [])),
        "start_date": start_date,
        "end_date": end_date,
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _json_default(value: Any):
    return str(value)


def _get_home_rows(conn, home_ids: list[int]) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            id,
            name,
            name AS home_name,
            manager_email,
            provider_id
        FROM homes
        WHERE id = ANY(%s)
        ORDER BY name ASC, id ASC
        """,
        (home_ids,),
    )


def _get_source_updated_at(conn, home_ids: list[int]) -> str | None:
    if not home_ids:
        return None

    row = _fetch_one(
        conn,
        """
        SELECT MAX(updated_at) AS updated_at
        FROM (
            SELECT MAX(updated_at) AS updated_at FROM young_people WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(updated_at) AS updated_at FROM incidents WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(updated_at) AS updated_at FROM compliance_items WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM safeguarding_records WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM manager_updates WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM manager_actions WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM review_meetings WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM supervision_notes WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM supervision_submissions WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM supervision_summaries WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM staff_checkins WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM achievement_records WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM keywork_sessions WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(created_at) AS updated_at FROM family_contact_records WHERE home_id = ANY(%s)
            UNION ALL
            SELECT MAX(updated_at) AS updated_at FROM daily_notes WHERE home_id = ANY(%s)
        ) t
        """,
        (
            home_ids, home_ids, home_ids, home_ids, home_ids,
            home_ids, home_ids, home_ids, home_ids, home_ids,
            home_ids, home_ids, home_ids, home_ids, home_ids,
        ),
    )
    value = (row or {}).get("updated_at")
    return str(value) if value else None


def _build_children_outcomes_summary(
    conn,
    home_ids: list[int],
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            yp.home_id,
            yp.id AS young_person_id,
            COALESCE(
                yp.preferred_name,
                CONCAT_WS(' ', yp.first_name, yp.last_name),
                'Young person'
            ) AS young_person_name,
            yp.placement_status,
            yp.summary_risk_level,
            COUNT(DISTINCT er.id) AS education_records_count,
            COUNT(DISTINCT hr.id) AS health_records_count,
            COUNT(DISTINCT fcr.id) AS family_contact_records_count,
            COUNT(DISTINCT ar.id) AS achievement_records_count,
            COUNT(DISTINCT i.id) AS incidents_count,
            COUNT(DISTINCT me.id) AS missing_episodes_count,
            COUNT(DISTINCT ks.id) AS keywork_sessions_count
        FROM young_people yp
        LEFT JOIN education_records er
            ON er.young_person_id = yp.id
           AND er.record_date BETWEEN %s AND %s
        LEFT JOIN health_records hr
            ON hr.young_person_id = yp.id
           AND hr.event_datetime::date BETWEEN %s AND %s
        LEFT JOIN family_contact_records fcr
            ON fcr.young_person_id = yp.id
           AND fcr.contact_datetime::date BETWEEN %s AND %s
        LEFT JOIN achievement_records ar
            ON ar.young_person_id = yp.id
           AND ar.achievement_date BETWEEN %s AND %s
           AND COALESCE(ar.archived, FALSE) = FALSE
        LEFT JOIN incidents i
            ON i.young_person_id = yp.id
           AND i.incident_datetime::date BETWEEN %s AND %s
        LEFT JOIN missing_episodes me
            ON me.young_person_id = yp.id
           AND me.start_datetime::date BETWEEN %s AND %s
        LEFT JOIN keywork_sessions ks
            ON ks.young_person_id = yp.id
           AND ks.session_date BETWEEN %s AND %s
        WHERE yp.home_id = ANY(%s)
          AND COALESCE(yp.archived, FALSE) = FALSE
        GROUP BY
            yp.home_id,
            yp.id,
            yp.preferred_name,
            yp.first_name,
            yp.last_name,
            yp.placement_status,
            yp.summary_risk_level
        ORDER BY yp.home_id ASC, young_person_name ASC
        """,
        (
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            home_ids,
        ),
    )


def _build_incident_summary(conn, home_ids: list[int], start_date: str, end_date: str) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            home_id,
            incident_type,
            COUNT(*) AS count
        FROM incidents
        WHERE home_id = ANY(%s)
          AND incident_datetime::date BETWEEN %s AND %s
        GROUP BY home_id, incident_type
        ORDER BY home_id ASC, count DESC, incident_type ASC
        """,
        (home_ids, start_date, end_date),
    )


def _build_safeguarding_summary(conn, home_ids: list[int], start_date: str, end_date: str) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            home_id,
            safeguarding_category,
            status,
            COUNT(*) AS count
        FROM safeguarding_records
        WHERE home_id = ANY(%s)
          AND concern_datetime::date BETWEEN %s AND %s
        GROUP BY home_id, safeguarding_category, status
        ORDER BY home_id ASC, count DESC, safeguarding_category ASC
        """,
        (home_ids, start_date, end_date),
    )


def _build_compliance_summary(conn, home_ids: list[int], start_date: str, end_date: str) -> list[dict[str, Any]]:
    if not home_ids:
        return []

    return _fetch_all(
        conn,
        """
        SELECT
            home_id,
            status,
            severity,
            COUNT(*) AS count
        FROM compliance_items
        WHERE home_id = ANY(%s)
          AND (
            due_date BETWEEN %s AND %s
            OR updated_at::date BETWEEN %s AND %s
          )
        GROUP BY home_id, status, severity
        ORDER BY home_id ASC, count DESC, status ASC, severity ASC
        """,
        (home_ids, start_date, end_date, start_date, end_date),
    )


def _build_staffing_summary(conn, home_ids: list[int], start_date: str, end_date: str) -> dict[str, Any]:
    if not home_ids:
        return {
            "staff_assignments": [],
            "staff_status": [],
            "roster_shifts": [],
            "staff_shifts": [],
            "checkins": [],
        }

    return {
        "staff_assignments": _fetch_all(
            conn,
            """
            SELECT sha.home_id, COUNT(DISTINCT sha.staff_id) AS count
            FROM staff_home_assignments sha
            WHERE sha.home_id = ANY(%s)
            GROUP BY sha.home_id
            ORDER BY sha.home_id ASC
            """,
            (home_ids,),
        ),
        "staff_status": _fetch_all(
            conn,
            """
            SELECT
                sha.home_id,
                COALESCE(s.status, 'unknown') AS status,
                COUNT(DISTINCT s.id) AS count
            FROM staff_home_assignments sha
            INNER JOIN staff s ON s.id = sha.staff_id
            WHERE sha.home_id = ANY(%s)
            GROUP BY sha.home_id, COALESCE(s.status, 'unknown')
            ORDER BY sha.home_id ASC, count DESC, status ASC
            """,
            (home_ids,),
        ),
        "roster_shifts": _fetch_all(
            conn,
            """
            SELECT
                rs.home_id,
                COALESCE(rs.status, 'unknown') AS status,
                COUNT(*) AS count
            FROM roster_shifts rs
            WHERE rs.home_id = ANY(%s)
              AND rs.shift_date BETWEEN %s AND %s
            GROUP BY rs.home_id, COALESCE(rs.status, 'unknown')
            ORDER BY rs.home_id ASC, count DESC, status ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "staff_shifts": _fetch_all(
            conn,
            """
            SELECT
                ss.home_id,
                COALESCE(ss.status, 'unknown') AS status,
                COUNT(*) AS count
            FROM staff_shifts ss
            WHERE ss.home_id = ANY(%s)
              AND ss.shift_date BETWEEN %s AND %s
            GROUP BY ss.home_id, COALESCE(ss.status, 'unknown')
            ORDER BY ss.home_id ASC, count DESC, status ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "checkins": _fetch_all(
            conn,
            """
            SELECT sc.home_id, COUNT(*) AS count
            FROM staff_checkins sc
            WHERE sc.home_id = ANY(%s)
              AND sc.created_at::date BETWEEN %s AND %s
            GROUP BY sc.home_id
            ORDER BY sc.home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }


def _build_supervision_summary(conn, home_ids: list[int], start_date: str, end_date: str) -> dict[str, Any]:
    if not home_ids:
        return {
            "supervision_notes": [],
            "supervision_submissions": [],
            "supervision_summaries": [],
        }

    return {
        "supervision_notes": _fetch_all(
            conn,
            """
            SELECT sn.home_id, COUNT(*) AS count
            FROM supervision_notes sn
            WHERE sn.home_id = ANY(%s)
              AND sn.created_at::date BETWEEN %s AND %s
            GROUP BY sn.home_id
            ORDER BY sn.home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "supervision_submissions": _fetch_all(
            conn,
            """
            SELECT
                ss.home_id,
                COALESCE(ss.status, 'unknown') AS status,
                COUNT(*) AS count
            FROM supervision_submissions ss
            WHERE ss.home_id = ANY(%s)
              AND ss.created_at::date BETWEEN %s AND %s
            GROUP BY ss.home_id, COALESCE(ss.status, 'unknown')
            ORDER BY ss.home_id ASC, count DESC, status ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "supervision_summaries": _fetch_all(
            conn,
            """
            SELECT ss.home_id, COUNT(*) AS count
            FROM supervision_summaries ss
            WHERE ss.home_id = ANY(%s)
              AND ss.created_at::date BETWEEN %s AND %s
            GROUP BY ss.home_id
            ORDER BY ss.home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }


def _build_management_summary(conn, home_ids: list[int], start_date: str, end_date: str) -> dict[str, Any]:
    if not home_ids:
        return {
            "manager_updates": [],
            "manager_actions": [],
            "monthly_reviews": [],
            "review_meetings": [],
        }

    return {
        "manager_updates": _fetch_all(
            conn,
            """
            SELECT
                home_id,
                COALESCE(status, 'unknown') AS status,
                COUNT(*) AS count
            FROM manager_updates
            WHERE home_id = ANY(%s)
              AND created_at::date BETWEEN %s AND %s
            GROUP BY home_id, COALESCE(status, 'unknown')
            ORDER BY home_id ASC, count DESC, status ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "manager_actions": _fetch_all(
            conn,
            """
            SELECT
                home_id,
                COALESCE(status, 'unknown') AS status,
                COUNT(*) AS count
            FROM manager_actions
            WHERE home_id = ANY(%s)
              AND created_at::date BETWEEN %s AND %s
            GROUP BY home_id, COALESCE(status, 'unknown')
            ORDER BY home_id ASC, count DESC, status ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "monthly_reviews": _fetch_all(
            conn,
            """
            SELECT
                home_id,
                COALESCE(status, 'unknown') AS status,
                COUNT(*) AS count
            FROM monthly_reviews
            WHERE home_id = ANY(%s)
              AND (
                review_month BETWEEN %s AND %s
                OR created_at::date BETWEEN %s AND %s
              )
            GROUP BY home_id, COALESCE(status, 'unknown')
            ORDER BY home_id ASC, count DESC, status ASC
            """,
            (home_ids, start_date, end_date, start_date, end_date),
        ),
        "review_meetings": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM review_meetings
            WHERE home_id = ANY(%s)
              AND created_at::date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }


def _build_positive_indicators(conn, home_ids: list[int], start_date: str, end_date: str) -> dict[str, Any]:
    if not home_ids:
        return {
            "achievement_counts": [],
            "keywork_counts": [],
            "family_contact_counts": [],
            "daily_notes_counts": [],
        }

    return {
        "achievement_counts": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM achievement_records
            WHERE home_id = ANY(%s)
              AND achievement_date BETWEEN %s AND %s
              AND COALESCE(archived, FALSE) = FALSE
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "keywork_counts": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM keywork_sessions
            WHERE home_id = ANY(%s)
              AND session_date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "family_contact_counts": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM family_contact_records
            WHERE home_id = ANY(%s)
              AND contact_datetime::date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "daily_notes_counts": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM daily_notes
            WHERE home_id = ANY(%s)
              AND note_date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }


def _build_metrics(facts: dict[str, Any]) -> dict[str, Any]:
    children = facts.get("children_outcomes") or []
    incident_summary = facts.get("incident_summary") or []
    safeguarding_summary = facts.get("safeguarding_summary") or []
    compliance_summary = facts.get("compliance_summary") or []
    positives = facts.get("positive_indicators") or {}

    total_children = len(children)
    total_incidents = sum(int(item.get("count") or 0) for item in incident_summary)
    total_safeguarding = sum(int(item.get("count") or 0) for item in safeguarding_summary)
    total_compliance = sum(int(item.get("count") or 0) for item in compliance_summary)
    total_achievements = sum(int(item.get("count") or 0) for item in positives.get("achievement_counts", []))
    total_keywork = sum(int(item.get("count") or 0) for item in positives.get("keywork_counts", []))
    total_family_contact = sum(int(item.get("count") or 0) for item in positives.get("family_contact_counts", []))
    total_daily_notes = sum(int(item.get("count") or 0) for item in positives.get("daily_notes_counts", []))

    return {
        "total_children": total_children,
        "total_incidents": total_incidents,
        "total_safeguarding_records": total_safeguarding,
        "total_compliance_items": total_compliance,
        "total_achievements": total_achievements,
        "total_keywork_sessions": total_keywork,
        "total_family_contacts": total_family_contact,
        "total_daily_notes": total_daily_notes,
    }


def _build_signals(facts: dict[str, Any]) -> dict[str, Any]:
    children = facts.get("children_outcomes") or []
    incident_summary = facts.get("incident_summary") or []
    safeguarding_summary = facts.get("safeguarding_summary") or []
    compliance_summary = facts.get("compliance_summary") or []
    staffing_summary = facts.get("staffing_summary") or {}
    supervision_summary = facts.get("supervision_summary") or {}
    positives = facts.get("positive_indicators") or {}

    strengths: list[str] = []
    concerns: list[str] = []
    recommendations: list[str] = []

    total_achievements = sum(int(item.get("count") or 0) for item in positives.get("achievement_counts", []))
    total_keywork = sum(int(item.get("count") or 0) for item in positives.get("keywork_counts", []))
    total_family_contact = sum(int(item.get("count") or 0) for item in positives.get("family_contact_counts", []))
    total_daily_notes = sum(int(item.get("count") or 0) for item in positives.get("daily_notes_counts", []))
    total_incidents = sum(int(item.get("count") or 0) for item in incident_summary)
    total_safeguarding = sum(int(item.get("count") or 0) for item in safeguarding_summary)

    high_severity_compliance = sum(
        int(item.get("count") or 0)
        for item in compliance_summary
        if str(item.get("severity") or "").strip().lower() in {"high", "critical"}
    )
    overdue_compliance = sum(
        int(item.get("count") or 0)
        for item in compliance_summary
        if str(item.get("status") or "").strip().lower() in {"overdue", "late"}
    )

    if total_achievements > 0:
        strengths.append(
            f"There is evidence of positive progress and achievement activity across the period ({total_achievements} achievement records)."
        )

    if total_keywork > 0:
        strengths.append(f"Keywork engagement is evidenced across the period ({total_keywork} sessions recorded).")

    if total_family_contact > 0:
        strengths.append(f"Family and relationship contact is evidenced within the period ({total_family_contact} contact records).")

    if total_daily_notes > 0:
        strengths.append(f"Day-to-day recording activity appears active across the period ({total_daily_notes} daily notes).")

    if total_incidents == 0:
        strengths.append("No incidents were recorded during the period.")
    elif total_incidents >= 10:
        concerns.append(f"Incident activity is relatively high across the reporting period ({total_incidents} incidents recorded).")

    if total_safeguarding >= 5:
        concerns.append(f"There is notable safeguarding activity in the period ({total_safeguarding} safeguarding records).")

    if overdue_compliance > 0:
        concerns.append(f"There are overdue or late compliance items requiring management oversight ({overdue_compliance} items).")
        recommendations.append("Review overdue compliance items and allocate named owners with clear timescales.")

    if high_severity_compliance > 0:
        concerns.append(f"There are high-severity or critical compliance items requiring prompt management attention ({high_severity_compliance} items).")
        recommendations.append("Escalate and monitor all high-severity compliance items through management oversight.")

    if not supervision_summary.get("supervision_notes") and not supervision_summary.get("supervision_summaries"):
        concerns.append("Limited supervision evidence was identified in the selected period.")
        recommendations.append("Check whether supervision activity is taking place and being recorded consistently.")

    if not staffing_summary.get("staff_assignments"):
        concerns.append("No staffing assignment summary was available for the selected period.")
        recommendations.append("Confirm staffing assignment and rota data is being captured consistently.")

    if not strengths:
        strengths.append("The structured data does not show strong positive indicators clearly enough in this period, so narrative should state where evidence is limited.")

    if not concerns:
        concerns.append("No major concerns were automatically identified from the structured data alone, but narrative review should still consider quality and lived experience.")

    if not recommendations:
        recommendations.append("Continue management monitoring, strengthen evidence where gaps exist, and maintain focus on outcomes as well as risk.")

    return {
        "strengths": strengths,
        "concerns": concerns,
        "recommendations": recommendations,
        "children_without_incidents": sum(1 for row in children if int(row.get("incidents_count") or 0) == 0),
        "children_with_achievements": sum(1 for row in children if int(row.get("achievement_records_count") or 0) > 0),
        "children_with_keywork": sum(1 for row in children if int(row.get("keywork_sessions_count") or 0) > 0),
    }


def build_report_facts(
    conn,
    *,
    report_type: str,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
) -> dict[str, Any]:
    report_type = str(report_type or "").strip().lower()
    if report_type not in SUPPORTED_REPORT_TYPES:
        raise ValueError("Unsupported report_type")

    home_ids = _resolve_home_ids(
        home_id=home_id,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
    )

    facts = {
        "report_type": report_type,
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "access_level": access_level,
        "provider_id": provider_id,
        "home_id": home_id,
        "home_ids": home_ids,
        "allowed_home_ids": sorted(_safe_int_list(allowed_home_ids or [])),
        "homes": _get_home_rows(conn, home_ids),
        "children_outcomes": _build_children_outcomes_summary(conn, home_ids, start_date, end_date),
        "incident_summary": _build_incident_summary(conn, home_ids, start_date, end_date),
        "safeguarding_summary": _build_safeguarding_summary(conn, home_ids, start_date, end_date),
        "compliance_summary": _build_compliance_summary(conn, home_ids, start_date, end_date),
        "staffing_summary": _build_staffing_summary(conn, home_ids, start_date, end_date),
        "supervision_summary": _build_supervision_summary(conn, home_ids, start_date, end_date),
        "management_summary": _build_management_summary(conn, home_ids, start_date, end_date),
        "positive_indicators": _build_positive_indicators(conn, home_ids, start_date, end_date),
    }

    metrics = _build_metrics(facts)
    signals = _build_signals(facts)

    return {
        "facts": facts,
        "metrics": metrics,
        "signals": signals,
        "source_updated_at": _get_source_updated_at(conn, home_ids),
    }


def get_cached_snapshot(
    conn,
    *,
    snapshot_key: str,
) -> dict[str, Any] | None:
    return _fetch_one(
        conn,
        """
        SELECT *
        FROM report_fact_snapshots
        WHERE snapshot_key = %s
        LIMIT 1
        """,
        (snapshot_key,),
    )


def upsert_report_snapshot(
    conn,
    *,
    report_type: str,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None,
    allowed_home_ids: list[int] | None,
    provider_id: int | None,
    generated_by: int | None,
) -> dict[str, Any]:
    report_type = str(report_type or "").strip().lower()
    if report_type not in SUPPORTED_REPORT_TYPES:
        raise ValueError("Unsupported report_type")

    key = _snapshot_key(
        report_type=report_type,
        home_id=home_id,
        provider_id=provider_id,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        start_date=start_date,
        end_date=end_date,
    )

    existing = get_cached_snapshot(conn, snapshot_key=key)
    fresh = build_report_facts(
        conn,
        report_type=report_type,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
    )

    facts_json = json.loads(json.dumps(fresh["facts"], ensure_ascii=False, default=_json_default))
    signals_json = json.loads(json.dumps(fresh["signals"], ensure_ascii=False, default=_json_default))
    metrics_json = json.loads(json.dumps(fresh["metrics"], ensure_ascii=False, default=_json_default))
    source_updated_at = fresh.get("source_updated_at")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if existing:
            cur.execute(
                """
                UPDATE report_fact_snapshots
                SET
                    source_updated_at = %s,
                    facts_json = %s::jsonb,
                    signals_json = %s::jsonb,
                    metrics_json = %s::jsonb,
                    status = 'ready',
                    generated_by = %s,
                    updated_at = NOW()
                WHERE snapshot_key = %s
                RETURNING *
                """,
                (
                    source_updated_at,
                    json.dumps(facts_json, ensure_ascii=False),
                    json.dumps(signals_json, ensure_ascii=False),
                    json.dumps(metrics_json, ensure_ascii=False),
                    generated_by,
                    key,
                ),
            )
        else:
            cur.execute(
                """
                INSERT INTO report_fact_snapshots (
                    report_type,
                    home_id,
                    provider_id,
                    access_level,
                    allowed_home_ids,
                    period_start,
                    period_end,
                    snapshot_key,
                    source_updated_at,
                    facts_json,
                    signals_json,
                    metrics_json,
                    status,
                    generated_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s,
                    %s::jsonb, %s::jsonb, %s::jsonb,
                    'ready', %s, NOW(), NOW()
                )
                RETURNING *
                """,
                (
                    report_type,
                    home_id,
                    provider_id,
                    access_level,
                    json.dumps(sorted(_safe_int_list(allowed_home_ids or []))),
                    start_date,
                    end_date,
                    key,
                    source_updated_at,
                    json.dumps(facts_json, ensure_ascii=False),
                    json.dumps(signals_json, ensure_ascii=False),
                    json.dumps(metrics_json, ensure_ascii=False),
                    generated_by,
                ),
            )

        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else {}


def get_or_create_report_snapshot(
    conn,
    *,
    report_type: str,
    home_id: int | None,
    start_date: str,
    end_date: str,
    access_level: str | None,
    allowed_home_ids: list[int] | None,
    provider_id: int | None,
    generated_by: int | None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    key = _snapshot_key(
        report_type=report_type,
        home_id=home_id,
        provider_id=provider_id,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        start_date=start_date,
        end_date=end_date,
    )

    existing = get_cached_snapshot(conn, snapshot_key=key)
    if existing and not force_refresh:
        return existing

    return upsert_report_snapshot(
        conn,
        report_type=report_type,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=generated_by,
    )
