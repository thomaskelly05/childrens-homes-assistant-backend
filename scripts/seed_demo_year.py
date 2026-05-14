#!/usr/bin/env python3
"""Seed a synthetic full-year IndiCare OS demo dataset.

The script is intentionally dev/demo gated and writes to a dedicated table so
demo records cannot be confused with production child records.
"""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any


DEMO_SEED_VERSION = "demo-year-2026-v1"
DEMO_YEAR_START = date(2025, 6, 1)
DEMO_YEAR_END = date(2026, 5, 31)


@dataclass(frozen=True)
class ChildStory:
    key: str
    name: str
    home: str
    worker: str
    journey: str
    risk: str
    positives: tuple[str, ...]
    setbacks: tuple[str, ...]


STAFF = [
    ("staff-avery-ri", "Avery Chen", "RI"),
    ("staff-ella-manager", "Ella Morgan", "registered manager"),
    ("staff-morgan-deputy", "Morgan Reed", "deputy manager"),
    ("staff-riley-senior", "Riley Brooks", "senior residential support worker"),
    ("staff-abi-support", "Abi Clarke", "support worker"),
    ("staff-sam-support", "Sam Patel", "support worker"),
    ("staff-jo-support", "Jo Williams", "support worker"),
    ("staff-nadia-support", "Nadia Hussain", "support worker"),
    ("staff-taylor-admin", "Taylor Green", "admin/viewer"),
    ("staff-harper-night", "Harper Scott", "support worker"),
]

CHILDREN = [
    ChildStory("yp-jamie-demo", "Jamie Taylor", "home-oak", "staff-abi-support", "building school attendance and family-time confidence", "medium", ("football coaching", "cooking tea with staff", "settled bedtime routine"), ("family call pressure", "peer disagreement")),
    ChildStory("yp-noah-demo", "Noah Ahmed", "home-oak", "staff-morgan-deputy", "reducing missing episodes and rebuilding education routine", "high", ("basketball group", "return interview engagement", "trusted adult check-ins"), ("missing episode", "unsafe peer contact")),
    ChildStory("yp-mia-demo", "Mia Roberts", "home-oak", "staff-ella-manager", "sustaining school stability and emotional vocabulary", "low", ("art club", "homework completion", "positive family contact"), ("anxiety before reviews", "low mood evenings")),
    ChildStory("yp-leo-demo", "Leo Bennett", "home-cedar", "staff-riley-senior", "developing independence skills after placement move", "medium", ("shopping budget", "room routine", "college taster day"), ("sleep disruption", "refused appointment")),
    ChildStory("yp-ava-demo", "Ava Collins", "home-cedar", "staff-nadia-support", "strengthening health routines and safe relationships", "medium", ("CAMHS engagement", "dog walking", "positive keywork"), ("medication refusal", "contact worry")),
]


def month_starts() -> list[date]:
    months: list[date] = []
    current = DEMO_YEAR_START
    while current <= DEMO_YEAR_END:
        months.append(current)
        year = current.year + (1 if current.month == 12 else 0)
        month = 1 if current.month == 12 else current.month + 1
        current = date(year, month, 1)
    return months


def record(kind: str, key: str, record_date: date, payload: dict[str, Any], child: ChildStory | None = None, home: str | None = None) -> dict[str, Any]:
    home_key = home if home is not None else (child.home if child else None)
    return {
        "seed_key": f"{DEMO_SEED_VERSION}:{kind}:{key}",
        "record_type": kind,
        "record_date": record_date.isoformat(),
        "home_key": home_key,
        "young_person_key": child.key if child else None,
        "payload": {
            "demo": True,
            "synthetic": True,
            "seed_version": DEMO_SEED_VERSION,
            **payload,
        },
    }


def generate_records() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = [
        record("provider", "provider", DEMO_YEAR_START, {"name": "Northstar Children Services Demo Provider", "warning": "Synthetic demo provider only"}),
        record("home", "home-oak", DEMO_YEAR_START, {"name": "Oak House Demo Home", "capacity": 5, "registration": "DEMO-URN-OAK"}, home="home-oak"),
        record("home", "home-cedar", DEMO_YEAR_START, {"name": "Cedar View Demo Home", "capacity": 4, "registration": "DEMO-URN-CEDAR"}, home="home-cedar"),
    ]

    for staff_key, name, role in STAFF:
        records.append(record("staff", staff_key, DEMO_YEAR_START, {
            "name": name,
            "role": role,
            "email": f"{staff_key}@demo.indicare.local",
            "mfa_required": role in {"registered manager", "deputy manager", "RI", "admin/viewer"},
            "status": "active",
        }))

    for child in CHILDREN:
        records.append(record("young_person", child.key, DEMO_YEAR_START, {
            "name": child.name,
            "risk": child.risk,
            "key_worker": child.worker,
            "journey": child.journey,
            "synthetic_note": "Not a real child. Created for IndiCare OS demonstration.",
        }, child))

    for month_index, month in enumerate(month_starts()):
        for child_index, child in enumerate(CHILDREN):
            for week in range(4):
                day = month + timedelta(days=min(week * 7 + child_index, 26))
                positive = child.positives[(month_index + week) % len(child.positives)]
                setback = child.setbacks[(month_index + week) % len(child.setbacks)]
                theme = positive if week in {0, 2, 3} else setback
                records.append(record("daily_recording", f"{child.key}-{day.isoformat()}", day, {
                    "title": f"Daily note - {child.name} - {day.isoformat()}",
                    "sleep_routine": "Settled with staff prompts" if week != 1 else "Needed extra reassurance at bedtime",
                    "health_wellbeing": "Presentation observed and recorded; no real medical data",
                    "education_activity": "Education/activity theme logged for demo chronology",
                    "exercise_activity": positive,
                    "child_voice": f"{child.name.split()[0]} talked about {theme}.",
                    "staff_support": "Staff used calm, relational support and recorded outcome.",
                    "summary": f"{theme}; staff response and next steps recorded.",
                    "manager_review_required": week == 1,
                }, child))

            keywork_day = month + timedelta(days=12 + child_index)
            records.append(record("keywork", f"{child.key}-{month.isoformat()}", keywork_day, {
                "topic": child.journey,
                "goals": list(child.positives),
                "child_voice": f"{child.name.split()[0]} identified what helps and one next step.",
                "next_steps": "Review progress in four weeks and link evidence to chronology.",
            }, child))

            health_day = month + timedelta(days=18)
            records.append(record("health_medication", f"{child.key}-{month.isoformat()}", health_day, {
                "type": "wellbeing/medication note",
                "note": "Synthetic health/wellbeing entry; includes appointment or medication-refusal example where relevant.",
                "follow_up": "Manager/keyworker review if pattern repeats.",
                "professional_contact": "CAMHS/GP/school nurse placeholder where provider has configured contacts.",
            }, child))

            education_day = month + timedelta(days=20)
            records.append(record("education", f"{child.key}-{month.isoformat()}", education_day, {
                "attendance_theme": "Progress from starting point captured",
                "achievement_or_concern": child.positives[month_index % len(child.positives)] if month_index % 3 else child.setbacks[0],
                "school_contact": "Synthetic school contact logged for demo evidence.",
            }, child))

    incident_specs = [
        ("low-level", "Peer disagreement de-escalated through space, repair and restorative conversation.", False),
        ("serious", "Missing episode with police informed, return home interview offered and risk review actioned.", True),
        ("low-level", "Medication refusal discussed with child and manager oversight added.", False),
        ("serious", "Safeguarding threshold considered; external referral considered and evidence linked.", True),
    ]
    for index in range(16):
        child = CHILDREN[index % len(CHILDREN)]
        day = DEMO_YEAR_START + timedelta(days=18 + index * 22)
        level, summary, reg40 = incident_specs[index % len(incident_specs)]
        records.append(record("incident", f"{index:02d}-{child.key}", day, {
            "severity": level,
            "summary": summary,
            "de_escalation": "Calm voice, space, known adult, repair conversation.",
            "manager_review": "Completed" if index % 3 else "Open",
            "reg40_considered": reg40,
            "actions_created": ["Review risk plan", "Update chronology", "Inform professional network"],
        }, child))

    for index in range(10):
        child = CHILDREN[(index + 1) % len(CHILDREN)]
        day = DEMO_YEAR_START + timedelta(days=30 + index * 31)
        records.append(record("safeguarding", f"{index:02d}-{child.key}", day, {
            "concern": "Synthetic safeguarding concern with source evidence and threshold review.",
            "external_referral": "considered" if index % 2 else "not required after manager review",
            "status": "open" if index in {8, 9} else "closed",
            "evidence_linked": True,
        }, child))

    for index, child in enumerate([CHILDREN[1], CHILDREN[1], CHILDREN[3], CHILDREN[4], CHILDREN[1]]):
        day = DEMO_YEAR_START + timedelta(days=45 + index * 58)
        records.append(record("missing_episode", f"{index:02d}-{child.key}", day, {
            "police_informed": True,
            "return_home_interview": "Offered and recorded in demo chronology",
            "risk_review_follow_up": "Missing protocol reviewed with manager oversight",
            "outcome": "Returned safely; support and child voice recorded.",
        }, child))

    action_statuses = ["open", "overdue", "completed", "escalated", "evidence required"]
    for index in range(30):
        child = CHILDREN[index % len(CHILDREN)]
        day = DEMO_YEAR_START + timedelta(days=7 + index * 12)
        records.append(record("action", f"{index:02d}-{child.key}", day, {
            "title": f"Demo action {index + 1}: {child.journey}",
            "status": action_statuses[index % len(action_statuses)],
            "assigned_to": child.worker,
            "requires_evidence": index % 5 == 0,
            "manager_oversight": index % 4 == 0,
        }, child))

    document_types = ["care plan", "placement plan", "risk assessment", "education plan", "health plan", "behaviour support plan", "Reg 44 report", "Reg 45 draft", "LAC review", "supervision/training", "policy"]
    for index, doc_type in enumerate(document_types * 2):
        child = CHILDREN[index % len(CHILDREN)]
        day = DEMO_YEAR_START + timedelta(days=10 + index * 15)
        records.append(record("document", f"{index:02d}-{doc_type.replace(' ', '-')}", day, {
            "title": f"Demo {doc_type.title()}",
            "category": doc_type,
            "confidentiality": "confidential synthetic demo document",
            "review_date": (day + timedelta(days=90)).isoformat(),
        }, child))

    report_types = ["weekly summary", "monthly manager report", "LAC review draft", "safeguarding chronology", "Reg 44 action plan", "Reg 45 quality of care review", "Ofsted evidence pack"]
    for index in range(18):
        child = CHILDREN[index % len(CHILDREN)]
        day = DEMO_YEAR_START + timedelta(days=14 + index * 20)
        records.append(record("report", f"{index:02d}-{child.key}", day, {
            "type": report_types[index % len(report_types)],
            "status": "draft/review required",
            "citations_visible": True,
            "evidence_gaps_visible": True,
            "confidentiality_label": "Confidential demo report - review required",
        }, child))

    for index in range(24):
        child = CHILDREN[index % len(CHILDREN)]
        day = DEMO_YEAR_START + timedelta(days=5 + index * 15)
        records.append(record("regulatory_mapping", f"{index:02d}-{child.key}", day, {
            "quality_standard": ["QS1", "QS2", "QS5", "SCCIF protection", "SCCIF leadership"][index % 5],
            "strength_or_gap": "strength" if index % 3 else "gap",
            "management_oversight": True,
        }, child))

    for index, prompt in enumerate([
        "What needs manager review today?",
        "Summarise Noah's missing episodes with citations.",
        "Prepare a handover summary for Oak House.",
        "What evidence gaps exist for Reg 45?",
        "Show positive progress for Mia this month.",
    ]):
        day = DEMO_YEAR_START + timedelta(days=60 + index * 43)
        records.append(record("orb_assistant_demo", f"{index:02d}", day, {
            "sample_query": prompt,
            "sample_answer": "Synthetic cited answer using demo records only; no writes performed.",
            "citations": ["demo chronology", "demo action", "demo document"],
            "no_training": True,
        }))

    for item in list(records):
        if item["young_person_key"]:
            records.append(record("chronology", item["seed_key"].split(":", 2)[-1], date.fromisoformat(item["record_date"]), {
                "source_type": item["record_type"],
                "title": item["payload"].get("title") or item["payload"].get("summary") or item["record_type"].replace("_", " ").title(),
                "positive_progress": item["record_type"] in {"daily_recording", "keywork", "education"},
                "evidence_linked": item["record_type"] in {"incident", "safeguarding", "document", "report", "regulatory_mapping"},
            }, next(child for child in CHILDREN if child.key == item["young_person_key"])))

    return records


def require_demo_safety(*, reset: bool, dry_run: bool) -> None:
    env = (os.getenv("APP_ENV") or os.getenv("ENV") or os.getenv("NODE_ENV") or "development").lower()
    demo_mode = os.getenv("DEMO_MODE", "").lower() in {"1", "true", "yes"}
    allow_seed = os.getenv("ALLOW_DEMO_SEED", "").lower() in {"1", "true", "yes"}
    database_url = os.getenv("DATABASE_URL", "")

    if env == "production":
        raise SystemExit("Refusing to seed demo data when APP_ENV/ENV/NODE_ENV is production.")
    if not demo_mode:
        raise SystemExit("Refusing to seed demo data unless DEMO_MODE=true.")
    if not dry_run and not allow_seed:
        raise SystemExit("Set ALLOW_DEMO_SEED=true to write demo records.")
    if not dry_run and not database_url:
        raise SystemExit("DATABASE_URL is required for non-dry-run seeding.")
    if reset and os.getenv("DEMO_RESET_CONFIRM") != "RESET_DEMO_DATA":
        raise SystemExit("Set DEMO_RESET_CONFIRM=RESET_DEMO_DATA to reset demo records.")


def connect():
    import psycopg2
    import psycopg2.extras

    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        sslmode=os.getenv("DB_SSLMODE", "require"),
        cursor_factory=psycopg2.extras.RealDictCursor,
        application_name="indicare-demo-year-seed",
    )


def apply_records(records: list[dict[str, Any]], *, reset: bool) -> None:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS public.demo_year_seed_records (
                    seed_key TEXT PRIMARY KEY,
                    record_type TEXT NOT NULL,
                    record_date DATE,
                    home_key TEXT,
                    young_person_key TEXT,
                    payload JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            if reset:
                cur.execute("DELETE FROM public.demo_year_seed_records WHERE payload->>'seed_version' = %s", (DEMO_SEED_VERSION,))
            for item in records:
                cur.execute(
                    """
                    INSERT INTO public.demo_year_seed_records (
                        seed_key, record_type, record_date, home_key, young_person_key, payload, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, NOW())
                    ON CONFLICT (seed_key) DO UPDATE
                    SET record_type = EXCLUDED.record_type,
                        record_date = EXCLUDED.record_date,
                        home_key = EXCLUDED.home_key,
                        young_person_key = EXCLUDED.young_person_key,
                        payload = EXCLUDED.payload,
                        updated_at = NOW()
                    """,
                    (
                        item["seed_key"],
                        item["record_type"],
                        item["record_date"],
                        item["home_key"],
                        item["young_person_key"],
                        json.dumps(item["payload"], sort_keys=True),
                    ),
                )
        conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a synthetic full-year IndiCare OS demo dataset.")
    parser.add_argument("--dry-run", action="store_true", help="Generate and validate records without writing to Postgres.")
    parser.add_argument("--reset", action="store_true", help="Delete this seed version before re-inserting it. Requires DEMO_RESET_CONFIRM.")
    parser.add_argument("--json", action="store_true", help="Print generated records as JSON.")
    args = parser.parse_args()

    require_demo_safety(reset=args.reset, dry_run=args.dry_run)
    records = generate_records()
    counts = Counter(item["record_type"] for item in records)

    if args.json:
        print(json.dumps({"generated_at": datetime.now(timezone.utc).isoformat(), "counts": counts, "records": records}, indent=2, sort_keys=True))
    else:
        print(f"Demo seed {DEMO_SEED_VERSION}: {len(records)} records from {DEMO_YEAR_START} to {DEMO_YEAR_END}")
        for kind, count in sorted(counts.items()):
            print(f"- {kind}: {count}")

    if args.dry_run:
        return

    apply_records(records, reset=args.reset)
    print("Demo year seed applied idempotently to public.demo_year_seed_records.")


if __name__ == "__main__":
    main()
