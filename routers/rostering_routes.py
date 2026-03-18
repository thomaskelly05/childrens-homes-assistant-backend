import csv
import io
import json
import math
import os
import smtplib
from datetime import date, datetime, timedelta
from email.mime.text import MIMEText
from typing import Optional

import psycopg2
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from psycopg2.extras import Json, RealDictCursor

router = APIRouter(prefix="/api/rostering", tags=["Rostering"])

DATABASE_URL = os.getenv("DATABASE_URL")
APP_BASE_URL = os.getenv("APP_BASE_URL", "").rstrip("/")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM")


def get_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def send_email(to_email: str, subject: str, body: str):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD or not SMTP_FROM:
        raise HTTPException(status_code=500, detail="Email is not configured")

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


class AssignRequest(BaseModel):
    shift_id: int
    staff_id: int
    actor: str = "manager"


class UnassignRequest(BaseModel):
    assignment_id: int
    actor: str = "manager"


class LeaveRequest(BaseModel):
    staff_id: int
    leave_type: str
    start_date: date
    end_date: date
    notes: Optional[str] = None
    actor: str = "manager"


class ShiftTemplateRequest(BaseModel):
    home_id: int
    week_start: date
    actor: str = "manager"


class PublishWeekRequest(BaseModel):
    home_id: int
    week_start: date
    actor: str = "manager"
    send_email: bool = True


class CheckEventRequest(BaseModel):
    home_id: int
    shift_id: int
    staff_id: int
    latitude: float
    longitude: float
    notes: Optional[str] = None
    actor: str = "staff"


def parse_required_roles(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return []
    return []


def serialise_row(row):
    if not row:
        return {}
    return json.loads(json.dumps(row, default=str))


def log_audit(cur, entity_type, entity_id, action, actor, before_json=None, after_json=None):
    cur.execute(
        """
        INSERT INTO roster_audit_log
        (entity_type, entity_id, action, actor, before_json, after_json, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """,
        (
            entity_type,
            entity_id,
            action,
            actor,
            Json(before_json or {}),
            Json(after_json or {}),
        ),
    )


def haversine_distance_m(lat1, lon1, lat2, lon2):
    earth_radius_m = 6371000
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_m * c


def build_week_warnings(shifts, assignments, checkins=None):
    warnings = []
    checkins = checkins or []

    for shift in shifts:
        shift_assignments = [a for a in assignments if a["shift_id"] == shift["id"]]
        shift_checkins = [c for c in checkins if c.get("shift_id") == shift["id"]]

        if len(shift_assignments) < shift["required_count"]:
            warnings.append({
                "level": "high",
                "type": "understaffed",
                "message": f"{shift['shift_date']} {shift['shift_type']} is below required staffing."
            })

        safer_min = shift.get("safer_staffing_min") or 1
        if len(shift_assignments) < safer_min:
            warnings.append({
                "level": "high",
                "type": "safer_staffing",
                "message": f"{shift['shift_date']} {shift['shift_type']} is below safer staffing minimum."
            })

        required_roles = parse_required_roles(shift.get("required_roles_json"))
        assigned_roles = [a.get("role") for a in shift_assignments if a.get("role")]

        for role in required_roles:
            if role not in assigned_roles:
                warnings.append({
                    "level": "medium",
                    "type": "role_gap",
                    "message": f"{shift['shift_date']} {shift['shift_type']} is missing required role: {role}."
                })

        if shift["shift_type"] in ["day", "handover"]:
            leadership_roles = {"RM", "Deputy", "Senior"}
            if not any(role in leadership_roles for role in assigned_roles):
                warnings.append({
                    "level": "high",
                    "type": "leadership_gap",
                    "message": f"{shift['shift_date']} {shift['shift_type']} has no leadership cover."
                })

        for a in shift_assignments:
            full_name = a.get("full_name") or "Staff member"

            if a.get("safe_to_work") is False:
                warnings.append({
                    "level": "high",
                    "type": "safe_to_work",
                    "message": f"{full_name} is marked not safe to work."
                })

            training_valid_until = a.get("training_valid_until")
            if training_valid_until and str(training_valid_until) < str(shift["shift_date"]):
                warnings.append({
                    "level": "medium",
                    "type": "training_expired",
                    "message": f"{full_name} has training recorded as expired before {shift['shift_date']}."
                })

            if a.get("is_agency"):
                warnings.append({
                    "level": "medium",
                    "type": "agency_usage",
                    "message": f"{shift['shift_date']} {shift['shift_type']} includes agency cover for {full_name}."
                })

        assigned_staff_ids = {a["staff_id"] for a in shift_assignments if a.get("staff_id")}
        checked_in_staff_ids = {
            c["staff_id"] for c in shift_checkins if c.get("event_type") == "check_in"
        }

        for staff_id in assigned_staff_ids:
            if staff_id not in checked_in_staff_ids:
                warnings.append({
                    "level": "medium",
                    "type": "attendance_pending",
                    "message": f"{shift['shift_date']} {shift['shift_type']} has assigned staff without recorded check-in."
                })
                break

    return warnings


def build_email_text_for_staff(home_name, week_start, shifts):
    lines = [
        f"IndiCare rota for {home_name}",
        f"Week commencing {week_start.strftime('%d %b %Y')}",
        "",
    ]

    for shift in shifts[:10]:
        shift_date = shift["shift_date"].strftime("%a %d %b")
        shift_type = str(shift["shift_type"]).replace("_", " ").title()
        lines.append(f"{shift_date} {shift['start_time']}-{shift['end_time']} {shift_type}")

    if APP_BASE_URL:
        lines.extend([
            "",
            f"Live rota: {APP_BASE_URL}/rostering"
        ])

    return "\n".join(lines)


@router.get("/week")
def get_roster_week(home_id: int, week_start: str):
    conn = get_db()
    cur = conn.cursor()

    try:
        start = datetime.strptime(week_start, "%Y-%m-%d").date()
        end = start + timedelta(days=6)

        cur.execute(
            """
            SELECT rs.*, h.name AS home_name
            FROM roster_shifts rs
            JOIN homes h ON h.id = rs.home_id
            WHERE rs.home_id = %s
              AND rs.shift_date BETWEEN %s AND %s
            ORDER BY rs.shift_date, rs.start_time, rs.id
            """,
            (home_id, start, end),
        )
        shifts = cur.fetchall()

        shift_ids = [s["id"] for s in shifts]
        assignments = []
        checkins = []

        if shift_ids:
            cur.execute(
                """
                SELECT
                    ra.*,
                    st.full_name,
                    st.role,
                    st.is_agency,
                    st.contracted_hours,
                    st.training_valid_until,
                    st.qualification_level,
                    st.safe_to_work,
                    st.can_sleep_in,
                    st.can_waking_night,
                    st.email
                FROM roster_assignments ra
                LEFT JOIN staff st ON st.id = ra.staff_id
                WHERE ra.shift_id = ANY(%s)
                ORDER BY ra.created_at, ra.id
                """,
                (shift_ids,),
            )
            assignments = cur.fetchall()

            cur.execute(
                """
                SELECT *
                FROM staff_checkins
                WHERE shift_id = ANY(%s)
                ORDER BY event_time DESC, id DESC
                """,
                (shift_ids,),
            )
            checkins = cur.fetchall()

        cur.execute(
            """
            SELECT *
            FROM staff
            WHERE active = TRUE
              AND (home_id = %s OR home_id IS NULL)
            ORDER BY
              CASE role
                WHEN 'RM' THEN 1
                WHEN 'Deputy' THEN 2
                WHEN 'Senior' THEN 3
                WHEN 'RSW' THEN 4
                WHEN 'Bank' THEN 5
                WHEN 'Agency' THEN 6
                ELSE 99
              END,
              full_name
            """,
            (home_id,),
        )
        staff = cur.fetchall()

        cur.execute(
            """
            SELECT *
            FROM roster_publications
            WHERE home_id = %s AND week_start = %s
            LIMIT 1
            """,
            (home_id, start),
        )
        publication = cur.fetchone()

        warnings = build_week_warnings(shifts, assignments, checkins)

        return {
            "week_start": str(start),
            "week_end": str(end),
            "home_id": home_id,
            "shifts": shifts,
            "assignments": assignments,
            "staff": staff,
            "warnings": warnings,
            "publication": publication,
            "checkins": checkins,
        }

    finally:
        cur.close()
        conn.close()


@router.post("/assign")
def assign_staff(payload: AssignRequest):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM roster_shifts WHERE id = %s", (payload.shift_id,))
        shift = cur.fetchone()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        cur.execute("SELECT * FROM staff WHERE id = %s", (payload.staff_id,))
        staff = cur.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        cur.execute(
            """
            SELECT ra.id
            FROM roster_assignments ra
            WHERE ra.shift_id = %s
              AND ra.staff_id = %s
            LIMIT 1
            """,
            (payload.shift_id, payload.staff_id),
        )
        existing = cur.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Staff member is already assigned to this shift")

        if shift["shift_type"] == "sleep_in" and not staff.get("can_sleep_in", True):
            raise HTTPException(status_code=400, detail="Staff member cannot be assigned to sleep-ins")

        if shift["shift_type"] == "waking_night" and not staff.get("can_waking_night", True):
            raise HTTPException(status_code=400, detail="Staff member cannot be assigned to waking nights")

        cur.execute(
            """
            INSERT INTO roster_assignments
            (
                shift_id, staff_id, assignment_status, source, overtime_hours,
                handover_required, handover_completed, manager_reviewed, notes,
                created_at, updated_at
            )
            VALUES (%s, %s, 'assigned', 'manager', 0, %s, FALSE, FALSE, NULL, NOW(), NOW())
            RETURNING *
            """,
            (
                payload.shift_id,
                payload.staff_id,
                shift["shift_type"] in ["day", "waking_night", "handover"],
            ),
        )
        assignment = cur.fetchone()

        log_audit(
            cur,
            entity_type="assignment",
            entity_id=assignment["id"],
            action="assign",
            actor=payload.actor,
            before_json={},
            after_json=serialise_row(assignment),
        )

        conn.commit()
        return {"ok": True, "assignment": assignment}

    finally:
        cur.close()
        conn.close()


@router.post("/unassign")
def unassign_staff(payload: UnassignRequest):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM roster_assignments WHERE id = %s", (payload.assignment_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Assignment not found")

        cur.execute("DELETE FROM roster_assignments WHERE id = %s", (payload.assignment_id,))

        log_audit(
            cur,
            entity_type="assignment",
            entity_id=payload.assignment_id,
            action="unassign",
            actor=payload.actor,
            before_json=serialise_row(existing),
            after_json={},
        )

        conn.commit()
        return {"ok": True}

    finally:
        cur.close()
        conn.close()


@router.post("/leave")
def add_leave(payload: LeaveRequest):
    conn = get_db()
    cur = conn.cursor()

    try:
        if payload.end_date < payload.start_date:
            raise HTTPException(status_code=400, detail="End date cannot be before start date")

        cur.execute("SELECT * FROM staff WHERE id = %s", (payload.staff_id,))
        staff = cur.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        cur.execute(
            """
            INSERT INTO staff_leave
            (staff_id, leave_type, start_date, end_date, status, notes, created_at)
            VALUES (%s, %s, %s, %s, 'approved', %s, NOW())
            RETURNING *
            """,
            (
                payload.staff_id,
                payload.leave_type,
                payload.start_date,
                payload.end_date,
                payload.notes,
            ),
        )
        leave = cur.fetchone()

        log_audit(
            cur,
            entity_type="leave",
            entity_id=leave["id"],
            action="create",
            actor=payload.actor,
            before_json={},
            after_json=serialise_row(leave),
        )

        conn.commit()
        return {"ok": True, "leave": leave}

    finally:
        cur.close()
        conn.close()


@router.post("/build-week-template")
def build_week_template(payload: ShiftTemplateRequest):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM homes WHERE id = %s", (payload.home_id,))
        home = cur.fetchone()
        if not home:
            raise HTTPException(status_code=404, detail="Home not found")

        created_shift_ids = []

        for i in range(7):
            shift_date = payload.week_start + timedelta(days=i)

            shift_defs = [
                {
                    "shift_type": "day",
                    "start_time": "08:00",
                    "end_time": "23:00",
                    "required_count": 2,
                    "required_roles_json": ["Senior", "RSW"],
                    "safer_staffing_min": 2,
                    "continuity_priority": True,
                    "notes": "Core day cover",
                },
                {
                    "shift_type": "sleep_in",
                    "start_time": "23:00",
                    "end_time": "08:00",
                    "required_count": 1,
                    "required_roles_json": ["RSW"],
                    "safer_staffing_min": 1,
                    "continuity_priority": True,
                    "notes": "Sleep-in",
                },
                {
                    "shift_type": "waking_night",
                    "start_time": "22:00",
                    "end_time": "08:00",
                    "required_count": 1,
                    "required_roles_json": ["RSW"],
                    "safer_staffing_min": 1,
                    "continuity_priority": True,
                    "notes": "Waking night",
                },
                {
                    "shift_type": "handover",
                    "start_time": "20:30",
                    "end_time": "21:00",
                    "required_count": 2,
                    "required_roles_json": ["Senior", "RSW"],
                    "safer_staffing_min": 2,
                    "continuity_priority": True,
                    "notes": "Shift handover",
                },
            ]

            for s in shift_defs:
                cur.execute(
                    """
                    SELECT id
                    FROM roster_shifts
                    WHERE home_id = %s
                      AND shift_date = %s
                      AND shift_type = %s
                      AND start_time = %s
                      AND end_time = %s
                    LIMIT 1
                    """,
                    (
                        payload.home_id,
                        shift_date,
                        s["shift_type"],
                        s["start_time"],
                        s["end_time"],
                    ),
                )
                existing = cur.fetchone()
                if existing:
                    continue

                cur.execute(
                    """
                    INSERT INTO roster_shifts
                    (
                        home_id, shift_date, shift_type, start_time, end_time,
                        required_count, required_roles_json, safer_staffing_min,
                        continuity_priority, notes, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING *
                    """,
                    (
                        payload.home_id,
                        shift_date,
                        s["shift_type"],
                        s["start_time"],
                        s["end_time"],
                        s["required_count"],
                        Json(s["required_roles_json"]),
                        s["safer_staffing_min"],
                        s["continuity_priority"],
                        s["notes"],
                    ),
                )
                new_shift = cur.fetchone()
                created_shift_ids.append(new_shift["id"])

                log_audit(
                    cur,
                    entity_type="shift",
                    entity_id=new_shift["id"],
                    action="create",
                    actor=payload.actor,
                    before_json={},
                    after_json=serialise_row(new_shift),
                )

        conn.commit()

        return {
            "ok": True,
            "created_count": len(created_shift_ids),
            "created_shift_ids": created_shift_ids,
        }

    finally:
        cur.close()
        conn.close()


@router.post("/publish-week")
def publish_week(payload: PublishWeekRequest):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM homes WHERE id = %s", (payload.home_id,))
        home = cur.fetchone()
        if not home:
            raise HTTPException(status_code=404, detail="Home not found")

        week_end = payload.week_start + timedelta(days=6)

        cur.execute(
            """
            INSERT INTO roster_publications (home_id, week_start, published_by, published_at, email_sent, email_sent_at)
            VALUES (%s, %s, %s, NOW(), FALSE, NULL)
            ON CONFLICT (home_id, week_start)
            DO UPDATE SET published_by = EXCLUDED.published_by, published_at = NOW()
            RETURNING *
            """,
            (payload.home_id, payload.week_start, payload.actor),
        )
        publication = cur.fetchone()

        log_audit(
            cur,
            entity_type="publication",
            entity_id=publication["id"],
            action="publish_week",
            actor=payload.actor,
            before_json={},
            after_json=serialise_row(publication),
        )

        email_count = 0

        if payload.send_email:
            cur.execute(
                """
                SELECT
                    st.id AS staff_id,
                    st.full_name,
                    st.email,
                    rs.shift_date,
                    rs.shift_type,
                    rs.start_time,
                    rs.end_time
                FROM roster_assignments ra
                JOIN staff st ON st.id = ra.staff_id
                JOIN roster_shifts rs ON rs.id = ra.shift_id
                WHERE rs.home_id = %s
                  AND rs.shift_date BETWEEN %s AND %s
                  AND st.email IS NOT NULL
                  AND st.email <> ''
                ORDER BY st.id, rs.shift_date, rs.start_time
                """,
                (payload.home_id, payload.week_start, week_end),
            )
            rows = cur.fetchall()

            staff_shift_map = {}
            for row in rows:
                staff_shift_map.setdefault(row["staff_id"], {
                    "full_name": row["full_name"],
                    "email": row["email"],
                    "shifts": []
                })
                staff_shift_map[row["staff_id"]]["shifts"].append(row)

            for staff_id, item in staff_shift_map.items():
                subject = f"IndiCare rota – week commencing {payload.week_start.strftime('%d/%m/%Y')}"
                message_body = build_email_text_for_staff(
                    home_name=home["name"],
                    week_start=payload.week_start,
                    shifts=item["shifts"]
                )

                status = "sent"
                error_message = None

                try:
                    send_email(
                        to_email=item["email"],
                        subject=subject,
                        body=message_body,
                    )
                    email_count += 1
                except Exception as exc:
                    status = "failed"
                    error_message = str(exc)

                cur.execute(
                    """
                    INSERT INTO roster_email_log
                    (
                        publication_id, staff_id, email_address, message_body,
                        status, error_message, sent_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """,
                    (
                        publication["id"],
                        staff_id,
                        item["email"],
                        message_body,
                        status,
                        error_message,
                    ),
                )

            cur.execute(
                """
                UPDATE roster_publications
                SET email_sent = TRUE, email_sent_at = NOW()
                WHERE id = %s
                """,
                (publication["id"],),
            )

        conn.commit()

        return {
            "ok": True,
            "publication_id": publication["id"],
            "email_count": email_count,
        }

    finally:
        cur.close()
        conn.close()


@router.post("/check-in")
def check_in(payload: CheckEventRequest):
    return _record_check_event(payload, "check_in")


@router.post("/check-out")
def check_out(payload: CheckEventRequest):
    return _record_check_event(payload, "check_out")


def _record_check_event(payload: CheckEventRequest, event_type: str):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM homes WHERE id = %s", (payload.home_id,))
        home = cur.fetchone()
        if not home:
            raise HTTPException(status_code=404, detail="Home not found")

        cur.execute("SELECT * FROM staff WHERE id = %s", (payload.staff_id,))
        staff = cur.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        cur.execute("SELECT * FROM roster_shifts WHERE id = %s", (payload.shift_id,))
        shift = cur.fetchone()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        if home.get("latitude") is None or home.get("longitude") is None:
            raise HTTPException(status_code=400, detail="Home geofence is not configured")

        distance_m = haversine_distance_m(
            payload.latitude,
            payload.longitude,
            home["latitude"],
            home["longitude"],
        )
        inside_geofence = distance_m <= (home.get("geofence_radius_m") or 100)

        cur.execute(
            """
            INSERT INTO staff_checkins
            (
                home_id, shift_id, staff_id, event_type, event_time,
                latitude, longitude, distance_m, inside_geofence, notes, created_by
            )
            VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                payload.home_id,
                payload.shift_id,
                payload.staff_id,
                event_type,
                payload.latitude,
                payload.longitude,
                round(distance_m, 2),
                inside_geofence,
                payload.notes,
                payload.actor,
            ),
        )
        check_row = cur.fetchone()

        log_audit(
            cur,
            entity_type="attendance",
            entity_id=check_row["id"],
            action=event_type,
            actor=payload.actor,
            before_json={},
            after_json=serialise_row(check_row),
        )

        conn.commit()

        return {
            "ok": True,
            "check_event": check_row,
            "inside_geofence": inside_geofence,
            "distance_m": round(distance_m, 2),
        }

    finally:
        cur.close()
        conn.close()


@router.get("/attendance")
def attendance_summary(home_id: int, week_start: str):
    conn = get_db()
    cur = conn.cursor()

    try:
        start = datetime.strptime(week_start, "%Y-%m-%d").date()
        end = start + timedelta(days=6)

        cur.execute(
            """
            SELECT
                sc.*,
                st.full_name,
                st.role,
                rs.shift_date,
                rs.shift_type,
                rs.start_time,
                rs.end_time
            FROM staff_checkins sc
            JOIN staff st ON st.id = sc.staff_id
            LEFT JOIN roster_shifts rs ON rs.id = sc.shift_id
            WHERE sc.home_id = %s
              AND sc.event_time::date BETWEEN %s AND %s
            ORDER BY sc.event_time DESC, sc.id DESC
            """,
            (home_id, start, end),
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/email-log")
def email_log(home_id: int, week_start: str):
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT p.id
            FROM roster_publications p
            WHERE p.home_id = %s AND p.week_start = %s
            LIMIT 1
            """,
            (home_id, week_start),
        )
        pub = cur.fetchone()
        if not pub:
            return []

        cur.execute(
            """
            SELECT el.*, st.full_name
            FROM roster_email_log el
            LEFT JOIN staff st ON st.id = el.staff_id
            WHERE el.publication_id = %s
            ORDER BY el.sent_at DESC, el.id DESC
            """,
            (pub["id"],),
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/payroll.csv")
def payroll_export(home_id: int, week_start: str):
    conn = get_db()
    cur = conn.cursor()

    try:
        start = datetime.strptime(week_start, "%Y-%m-%d").date()
        end = start + timedelta(days=6)

        cur.execute(
            """
            SELECT
                st.full_name,
                st.role,
                st.hourly_rate,
                rs.shift_date,
                rs.shift_type,
                rs.start_time,
                rs.end_time,
                ra.assignment_status,
                ra.overtime_hours,
                st.is_agency
            FROM roster_assignments ra
            JOIN roster_shifts rs ON rs.id = ra.shift_id
            LEFT JOIN staff st ON st.id = ra.staff_id
            WHERE rs.home_id = %s
              AND rs.shift_date BETWEEN %s AND %s
            ORDER BY st.full_name NULLS LAST, rs.shift_date, rs.start_time
            """,
            (home_id, start, end),
        )
        rows = cur.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Staff Name", "Role", "Hourly Rate", "Date", "Shift Type",
            "Start", "End", "Status", "Overtime Hours", "Agency"
        ])

        for row in rows:
            writer.writerow([
                row.get("full_name"),
                row.get("role"),
                row.get("hourly_rate"),
                row.get("shift_date"),
                row.get("shift_type"),
                row.get("start_time"),
                row.get("end_time"),
                row.get("assignment_status"),
                row.get("overtime_hours"),
                row.get("is_agency"),
            ])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=rostering_payroll.csv"},
        )

    finally:
        cur.close()
        conn.close()


@router.get("/evidence")
def rostering_evidence(home_id: int, week_start: str):
    conn = get_db()
    cur = conn.cursor()

    try:
        start = datetime.strptime(week_start, "%Y-%m-%d").date()
        end = start + timedelta(days=6)

        cur.execute(
            """
            SELECT rs.*, h.name AS home_name
            FROM roster_shifts rs
            JOIN homes h ON h.id = rs.home_id
            WHERE rs.home_id = %s
              AND rs.shift_date BETWEEN %s AND %s
            ORDER BY rs.shift_date, rs.start_time, rs.id
            """,
            (home_id, start, end),
        )
        shifts = cur.fetchall()

        cur.execute(
            """
            SELECT
                ra.*,
                st.full_name,
                st.role,
                st.training_valid_until,
                st.qualification_level,
                st.safe_to_work,
                st.is_agency
            FROM roster_assignments ra
            LEFT JOIN staff st ON st.id = ra.staff_id
            JOIN roster_shifts rs ON rs.id = ra.shift_id
            WHERE rs.home_id = %s
              AND rs.shift_date BETWEEN %s AND %s
            ORDER BY rs.shift_date, rs.start_time, ra.id
            """,
            (home_id, start, end),
        )
        assignments = cur.fetchall()

        cur.execute(
            """
            SELECT *
            FROM staff_checkins
            WHERE home_id = %s
              AND event_time::date BETWEEN %s AND %s
            ORDER BY event_time DESC
            """,
            (home_id, start, end),
        )
        checkins = cur.fetchall()

        cur.execute(
            """
            SELECT *
            FROM roster_audit_log
            WHERE created_at::date BETWEEN %s AND %s
            ORDER BY created_at DESC, id DESC
            """,
            (start, end),
        )
        audit_log = cur.fetchall()

        warnings = build_week_warnings(shifts, assignments, checkins)

        return {
            "home_id": home_id,
            "week_start": str(start),
            "week_end": str(end),
            "evidence_pack": {
                "shifts": shifts,
                "assignments": assignments,
                "attendance": checkins,
                "warnings": warnings,
                "audit_log": audit_log,
            },
        }

    finally:
        cur.close()
        conn.close()
