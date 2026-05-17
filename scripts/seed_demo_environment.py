#!/usr/bin/env python3
"""Seed the deterministic live demo environment used by the final walkthrough.

Unlike the year-long synthetic seed, this writes the operational tables that the
modern frontend reads: users, homes, young_people, daily_notes, incidents,
safeguarding_records, tasks, statutory_documents and inspection_evidence_facts.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any

from psycopg2.extras import Json, RealDictCursor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from auth.passwords import hash_password


DEMO_PROVIDER_ID = 9001
DEMO_HOME_ID = 9101
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "IndiCareDemo123!")
DEMO_SEED_VERSION = "final-demo-2026-v1"
DEMO_ANCHOR_DATE = date.fromisoformat(os.getenv("DEMO_ANCHOR_DATE", "2026-05-17"))

DEMO_USERS = [
    (9201, "demo.staff@indicare.co.uk", "support_worker", "Abi", "Clarke"),
    (9202, "demo.deputy@indicare.co.uk", "deputy_manager", "Morgan", "Reed"),
    (9203, "demo.manager@indicare.co.uk", "manager", "Ella", "Morgan"),
    (9204, "demo.provider@indicare.co.uk", "responsible_individual", "Avery", "Chen"),
]

DEMO_CHILDREN = [
    {
        "id": 9301,
        "first_name": "Jamie",
        "last_name": "Taylor",
        "preferred_name": "Jamie",
        "date_of_birth": DEMO_ANCHOR_DATE.replace(year=2012),
        "admission_date": DEMO_ANCHOR_DATE - timedelta(days=420),
        "placement_status": "active",
        "summary_risk_level": "medium",
        "primary_keyworker_id": 9201,
        "care_planning": "Jamie is building school attendance and confidence with family time.",
        "communication_needs": "Plain choices, time to process, and predictable transitions.",
        "sensory_needs": "Quiet decompression after school helps Jamie settle.",
        "what_helps": "Football, cooking with staff, humour, and clear next steps.",
        "known_triggers": "Unexpected contact changes and raised voices.",
        "legal_status": "Section 20",
    },
    {
        "id": 9302,
        "first_name": "Noah",
        "last_name": "Ahmed",
        "preferred_name": "Noah",
        "date_of_birth": DEMO_ANCHOR_DATE.replace(year=2011),
        "admission_date": DEMO_ANCHOR_DATE - timedelta(days=250),
        "placement_status": "active",
        "summary_risk_level": "high",
        "primary_keyworker_id": 9202,
        "care_planning": "Noah is reducing missing episodes and rebuilding education routine.",
        "communication_needs": "Short check-ins with a trusted adult; avoid crowded conversations.",
        "sensory_needs": "Music and basketball help Noah regulate after conflict.",
        "what_helps": "Clear boundaries, return-home reflection, and trusted adult check-ins.",
        "known_triggers": "Unsafe peer contact, shame after incidents, and abrupt changes.",
        "legal_status": "Interim care order",
    },
    {
        "id": 9303,
        "first_name": "Mia",
        "last_name": "Roberts",
        "preferred_name": "Mia",
        "date_of_birth": DEMO_ANCHOR_DATE.replace(year=2013),
        "admission_date": DEMO_ANCHOR_DATE - timedelta(days=610),
        "placement_status": "active",
        "summary_risk_level": "low",
        "primary_keyworker_id": 9203,
        "care_planning": "Mia is sustaining school stability and developing emotional vocabulary.",
        "communication_needs": "Warm encouragement, drawing prompts, and advance notice.",
        "sensory_needs": "Art materials and low-stimulation space before reviews.",
        "what_helps": "Art club, homework wins, and positive family contact preparation.",
        "known_triggers": "Review anxiety and low mood during evenings.",
        "legal_status": "Full care order",
    },
]


def require_demo_safety(*, dry_run: bool, reset: bool) -> None:
    env = (os.getenv("APP_ENV") or os.getenv("ENV") or os.getenv("NODE_ENV") or "development").lower()
    if env == "production":
        raise SystemExit("Refusing to seed demo data in production.")
    if os.getenv("DEMO_MODE", "").lower() not in {"1", "true", "yes"}:
        raise SystemExit("Set DEMO_MODE=true before running the demo seed.")
    if not dry_run and os.getenv("ALLOW_DEMO_SEED", "").lower() not in {"1", "true", "yes"}:
        raise SystemExit("Set ALLOW_DEMO_SEED=true to write demo records.")
    if reset and os.getenv("DEMO_RESET_CONFIRM") != "RESET_DEMO_DATA":
        raise SystemExit("Set DEMO_RESET_CONFIRM=RESET_DEMO_DATA to reset demo records.")
    if not dry_run and not os.getenv("DATABASE_URL"):
        raise SystemExit("DATABASE_URL is required for non-dry-run seeding.")


def connect():
    import psycopg2

    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        sslmode=os.getenv("DB_SSLMODE", "require"),
        cursor_factory=RealDictCursor,
        application_name="indicare-final-demo-seed",
    )


def deterministic_uuid(key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"indicare:{DEMO_SEED_VERSION}:{key}"))


def ensure_schema(cur) -> None:
    statements = [
        """CREATE TABLE IF NOT EXISTS public.providers (id INTEGER PRIMARY KEY, name TEXT, status TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.homes (id INTEGER PRIMARY KEY, provider_id INTEGER, name TEXT, status TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, role TEXT, home_id INTEGER, provider_id INTEGER, first_name TEXT, last_name TEXT, is_active BOOLEAN DEFAULT TRUE, archived BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.young_people (id INTEGER PRIMARY KEY, provider_id INTEGER, home_id INTEGER, first_name TEXT, last_name TEXT, preferred_name TEXT, date_of_birth DATE, admission_date DATE, placement_status TEXT, primary_keyworker_id INTEGER, summary_risk_level TEXT, archived BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.daily_notes (id INTEGER PRIMARY KEY, young_person_id INTEGER, home_id INTEGER, note_date DATE, shift_type TEXT, mood TEXT, presentation TEXT, activities TEXT, education_update TEXT, health_update TEXT, family_update TEXT, behaviour_update TEXT, young_person_voice TEXT, positives TEXT, actions_required TEXT, significance TEXT, workflow_status TEXT, manager_review_comment TEXT, author_id INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.incidents (id INTEGER PRIMARY KEY, young_person_id INTEGER, home_id INTEGER, staff_id INTEGER, incident_type TEXT, severity TEXT, summary TEXT, outcome TEXT, manager_review_status TEXT, status TEXT, archived BOOLEAN DEFAULT FALSE, incident_datetime TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.safeguarding_records (id INTEGER PRIMARY KEY, young_person_id INTEGER, home_id INTEGER, concern_type TEXT, title TEXT, summary TEXT, concern_details TEXT, status TEXT, severity TEXT, created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.tasks (id INTEGER PRIMARY KEY, title TEXT, task TEXT, description TEXT, status TEXT, priority TEXT, home_id INTEGER, young_person_id INTEGER, assigned_to_user_id INTEGER, due_date DATE, source_table TEXT, source_id INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.statutory_documents (id INTEGER PRIMARY KEY, title TEXT, document_type TEXT, status TEXT, young_person_id INTEGER, home_id INTEGER, uploaded_by INTEGER, uploaded_at TIMESTAMPTZ DEFAULT NOW(), review_date DATE, file_name TEXT, extracted_text TEXT, metadata JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
        """CREATE TABLE IF NOT EXISTS public.inspection_evidence_facts (id INTEGER PRIMARY KEY, title TEXT, description TEXT, quality TEXT, evidence_type TEXT, source_table TEXT, source_id INTEGER, young_person_id INTEGER, home_id INTEGER, regulation TEXT, created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), status TEXT)""",
        """CREATE TABLE IF NOT EXISTS public.chronology_events (id INTEGER PRIMARY KEY, young_person_id INTEGER, event_datetime TIMESTAMPTZ, category TEXT, subcategory TEXT, title TEXT, summary TEXT, significance TEXT, source_table TEXT, source_id INTEGER, created_by INTEGER, auto_generated BOOLEAN DEFAULT TRUE, is_visible BOOLEAN DEFAULT TRUE, metadata_json JSONB DEFAULT '{}'::jsonb, event_status TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())""",
    ]
    for statement in statements:
        cur.execute(statement)

    add_columns = {
        "young_people": {
            "provider_id": "INTEGER",
            "gender": "TEXT",
            "ethnicity": "TEXT",
            "nhs_number": "TEXT",
            "local_id_number": "TEXT",
            "provider_reference": "TEXT",
            "discharge_date": "DATE",
            "photo_url": "TEXT",
            "profile_photo_path": "TEXT",
            "profile_photo_updated_at": "TIMESTAMPTZ",
            "care_planning": "TEXT",
            "communication_needs": "TEXT",
            "sensory_needs": "TEXT",
            "what_helps": "TEXT",
            "known_triggers": "TEXT",
            "legal_status": "TEXT",
        },
        "users": {"provider_id": "INTEGER", "is_active": "BOOLEAN DEFAULT TRUE", "archived": "BOOLEAN DEFAULT FALSE"},
        "homes": {"provider_id": "INTEGER", "status": "TEXT"},
        "daily_notes": {
            "approved_by": "INTEGER",
            "approved_at": "TIMESTAMPTZ",
            "returned_at": "TIMESTAMPTZ",
            "submitted_at": "TIMESTAMPTZ",
            "last_edited_at": "TIMESTAMPTZ",
            "status": "TEXT",
        },
    }
    for table, columns in add_columns.items():
        for column, definition in columns.items():
            cur.execute(f'ALTER TABLE public."{table}" ADD COLUMN IF NOT EXISTS "{column}" {definition}')


def table_columns(cur, table: str) -> set[str]:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table,),
    )
    return {row["column_name"] for row in cur.fetchall()}


def id_for(cur, table: str, integer_id: int, key: str) -> Any:
    cur.execute(
        """
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s AND column_name = 'id'
        LIMIT 1
        """,
        (table,),
    )
    row = cur.fetchone() or {}
    if row.get("data_type") == "uuid" or row.get("udt_name") == "uuid":
        return deterministic_uuid(key)
    return integer_id


def adapt(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return Json(value)
    return value


def upsert(cur, table: str, row: dict[str, Any]) -> None:
    cols = table_columns(cur, table)
    values = {key: value for key, value in row.items() if key in cols}
    if "id" not in values:
        raise RuntimeError(f"{table} row missing compatible id column")
    columns = list(values)
    updates = [column for column in columns if column != "id"]
    sql = f"""
        INSERT INTO public."{table}" ({", ".join(f'"{column}"' for column in columns)})
        VALUES ({", ".join(["%s"] * len(columns))})
        ON CONFLICT (id) DO UPDATE SET
        {", ".join(f'"{column}" = EXCLUDED."{column}"' for column in updates)}
    """
    cur.execute(sql, tuple(adapt(values[column]) for column in columns))


def build_rows(cur) -> dict[str, list[dict[str, Any]]]:
    password_hash = hash_password(DEMO_PASSWORD)
    rows: dict[str, list[dict[str, Any]]] = {
        "providers": [{"id": DEMO_PROVIDER_ID, "name": "Northstar Children Services Demo Provider", "status": "active", "updated_at": datetime.now(timezone.utc)}],
        "homes": [{"id": DEMO_HOME_ID, "provider_id": DEMO_PROVIDER_ID, "name": "Oak House Demo Home", "status": "active", "updated_at": datetime.now(timezone.utc)}],
        "users": [
            {
                "id": user_id,
                "email": email,
                "password_hash": password_hash,
                "role": role,
                "home_id": DEMO_HOME_ID,
                "provider_id": DEMO_PROVIDER_ID,
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
                "archived": False,
                "updated_at": datetime.now(timezone.utc),
            }
            for user_id, email, role, first_name, last_name in DEMO_USERS
        ],
        "young_people": [
            {
                **child,
                "provider_id": DEMO_PROVIDER_ID,
                "home_id": DEMO_HOME_ID,
                "archived": False,
                "updated_at": datetime.now(timezone.utc),
            }
            for child in DEMO_CHILDREN
        ],
    }

    rows["daily_notes"] = [
        {
            "id": 9401 + index,
            "young_person_id": child["id"],
            "home_id": DEMO_HOME_ID,
            "note_date": DEMO_ANCHOR_DATE - timedelta(days=index),
            "shift_type": "evening" if index == 0 else "day",
            "mood": "settled" if child["summary_risk_level"] != "high" else "anxious but engaged",
            "presentation": child["care_planning"],
            "activities": "Routine, education and relationship-based support recorded.",
            "young_person_voice": f"{child['preferred_name']} said what helped and one thing staff should remember tomorrow.",
            "positives": child["what_helps"],
            "actions_required": "Key worker to review next shift and update chronology if the pattern continues.",
            "significance": "high" if child["summary_risk_level"] == "high" else "standard",
            "workflow_status": "submitted" if child["summary_risk_level"] == "high" else "approved",
            "manager_review_comment": "Manager oversight visible for demo walkthrough." if child["summary_risk_level"] == "high" else None,
            "author_id": 9201,
            "updated_at": datetime.now(timezone.utc),
        }
        for index, child in enumerate(DEMO_CHILDREN)
    ]
    rows["incidents"] = [
        {
            "id": 9501,
            "young_person_id": 9302,
            "home_id": DEMO_HOME_ID,
            "staff_id": 9202,
            "incident_type": "missing_episode",
            "severity": "high",
            "summary": "Noah returned safely after a short missing episode; return-home reflection and risk review are open.",
            "outcome": "Returned safely. Professional network informed where appropriate.",
            "manager_review_status": "open",
            "status": "open",
            "archived": False,
            "incident_datetime": datetime.combine(DEMO_ANCHOR_DATE - timedelta(days=2), datetime.min.time(), tzinfo=timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    ]
    rows["safeguarding_records"] = [
        {
            "id": 9601,
            "young_person_id": 9302,
            "home_id": DEMO_HOME_ID,
            "concern_type": "peer_contact",
            "title": "Unsafe peer contact review",
            "summary": "Threshold review remains open with clear manager oversight and evidence links.",
            "concern_details": "Synthetic safeguarding concern for demo walkthrough only.",
            "status": "open",
            "severity": "high",
            "created_by": 9203,
            "updated_at": datetime.now(timezone.utc),
        }
    ]
    rows["tasks"] = [
        {
            "id": 9701,
            "title": "Review Noah missing episode plan",
            "task": "Confirm return-home reflection, update risk plan, and link evidence before handover.",
            "description": "Operational follow-up from incident and safeguarding review.",
            "status": "open",
            "priority": "high",
            "home_id": DEMO_HOME_ID,
            "young_person_id": 9302,
            "assigned_to_user_id": 9203,
            "due_date": DEMO_ANCHOR_DATE,
            "source_table": "incidents",
            "source_id": 9501,
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "id": 9702,
            "title": "Evidence check before inspection discussion",
            "task": "Review daily note, incident and safeguarding evidence links for Oak House.",
            "description": "Inspection readiness action for the provider demo.",
            "status": "open",
            "priority": "medium",
            "home_id": DEMO_HOME_ID,
            "young_person_id": 9301,
            "assigned_to_user_id": 9204,
            "due_date": DEMO_ANCHOR_DATE + timedelta(days=1),
            "source_table": "inspection_evidence_facts",
            "source_id": 9901,
            "updated_at": datetime.now(timezone.utc),
        },
    ]

    document_id = id_for(cur, "statutory_documents", 9801, "statutory-document-care-plan")
    evidence_id = id_for(cur, "inspection_evidence_facts", 9901, "inspection-evidence-daily-note")
    rows["statutory_documents"] = [
        {
            "id": document_id,
            "title": "Jamie care plan review summary",
            "document_type": "care_plan",
            "status": "review_required",
            "young_person_id": 9301,
            "home_id": DEMO_HOME_ID,
            "uploaded_by": 9203,
            "uploaded_at": datetime.now(timezone.utc) - timedelta(days=1),
            "review_date": DEMO_ANCHOR_DATE + timedelta(days=7),
            "file_name": "jamie-care-plan-review-demo.pdf",
            "extracted_text": "Synthetic demo document showing care planning, child voice and evidence gaps.",
            "metadata": {"seed_version": DEMO_SEED_VERSION, "findings": [{"title": "Review child voice", "summary": "Child voice is present but review sign-off is due.", "severity": "medium"}]},
            "updated_at": datetime.now(timezone.utc),
        }
    ]
    rows["inspection_evidence_facts"] = [
        {
            "id": evidence_id,
            "title": "Daily note shows child voice and manager follow-up",
            "description": "Synthetic evidence item linking daily recording, safeguarding oversight and inspection readiness.",
            "quality": "review_required",
            "evidence_type": "daily_record",
            "source_table": "daily_notes",
            "source_id": 9401,
            "young_person_id": 9301,
            "home_id": DEMO_HOME_ID,
            "regulation": "SCCIF experiences and progress",
            "created_by": 9203,
            "created_at": datetime.now(timezone.utc) - timedelta(days=1),
            "status": "review_required",
        }
    ]

    chronology_items = [
        (10001, 9301, "daily_notes", 9401, "Daily note: Jamie settled evening", "Jamie used football and cooking to settle; child voice recorded.", "Daily recording", "standard"),
        (10002, 9302, "incidents", 9501, "Missing episode return and review", "Noah returned safely; manager review and risk update remain open.", "Incident", "high"),
        (10003, 9302, "safeguarding_records", 9601, "Safeguarding threshold review", "Unsafe peer contact concern remains visible for escalation review.", "Safeguarding", "high"),
        (10004, 9301, "statutory_documents", document_id, "Care plan review due", "Care plan review document is available and awaiting sign-off.", "Document", "medium"),
    ]
    rows["chronology_events"] = [
        {
            "id": id_for(cur, "chronology_events", row_id, f"chronology-{row_id}"),
            "young_person_id": child_id,
            "event_datetime": datetime.combine(DEMO_ANCHOR_DATE - timedelta(days=index), datetime.min.time(), tzinfo=timezone.utc),
            "category": category,
            "subcategory": source_table,
            "title": title,
            "summary": summary,
            "significance": significance,
            "source_table": source_table,
            "source_id": source_id if isinstance(source_id, int) else None,
            "created_by": 9203,
            "auto_generated": True,
            "is_visible": True,
            "metadata_json": {"seed_version": DEMO_SEED_VERSION, "document_source_id": str(source_id)},
            "event_status": "recorded",
            "updated_at": datetime.now(timezone.utc),
        }
        for index, (row_id, child_id, source_table, source_id, title, summary, category, significance) in enumerate(chronology_items)
    ]
    return rows


def reset_demo_rows(cur, rows: dict[str, list[dict[str, Any]]]) -> None:
    for table in reversed(list(rows)):
        ids = [row["id"] for row in rows[table] if row.get("id") is not None]
        if not ids:
            continue
        cur.execute(
            f'DELETE FROM public."{table}" WHERE id IN ({", ".join(["%s"] * len(ids))})',
            tuple(ids),
        )


def apply_seed(*, reset: bool) -> Counter[str]:
    with connect() as conn:
        with conn.cursor() as cur:
            ensure_schema(cur)
            rows = build_rows(cur)
            if reset:
                reset_demo_rows(cur, rows)
            for table, table_rows in rows.items():
                for row in table_rows:
                    upsert(cur, table, row)
        conn.commit()
    return Counter({table: len(table_rows) for table, table_rows in rows.items()})


def dry_run_counts() -> Counter[str]:
    return Counter(
        {
            "providers": 1,
            "homes": 1,
            "users": len(DEMO_USERS),
            "young_people": len(DEMO_CHILDREN),
            "daily_notes": len(DEMO_CHILDREN),
            "incidents": 1,
            "safeguarding_records": 1,
            "tasks": 2,
            "statutory_documents": 1,
            "inspection_evidence_facts": 1,
            "chronology_events": 4,
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed deterministic live demo records.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print counts without writing to the database.")
    parser.add_argument("--reset", action="store_true", help="Delete known demo IDs before writing. Requires DEMO_RESET_CONFIRM.")
    parser.add_argument("--json", action="store_true", help="Print the seed summary as JSON.")
    args = parser.parse_args()

    require_demo_safety(dry_run=args.dry_run, reset=args.reset)
    counts = dry_run_counts() if args.dry_run else apply_seed(reset=args.reset)
    summary = {
        "seed_version": DEMO_SEED_VERSION,
        "anchor_date": DEMO_ANCHOR_DATE.isoformat(),
        "demo_provider_id": DEMO_PROVIDER_ID,
        "demo_home_id": DEMO_HOME_ID,
        "demo_credentials": [{"email": email, "password": DEMO_PASSWORD, "role": role} for _, email, role, _, _ in DEMO_USERS],
        "counts": dict(sorted(counts.items())),
    }

    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
        return

    print(f"IndiCare final demo seed {DEMO_SEED_VERSION}")
    print(f"Provider {DEMO_PROVIDER_ID}, home {DEMO_HOME_ID}, anchor date {DEMO_ANCHOR_DATE}")
    for table, count in sorted(counts.items()):
        print(f"- {table}: {count}")
    print("Demo credentials:")
    for item in summary["demo_credentials"]:
        print(f"- {item['email']} / {item['password']} ({item['role']})")


if __name__ == "__main__":
    main()
