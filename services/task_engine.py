from datetime import datetime, timedelta

DEFAULT_TASK_TEMPLATES = [
    ("Admission", "Initial risk assessment", 72),
    ("Admission", "Health needs check", 24),
    ("Admission", "Keyworker assigned", 24),
    ("Admission", "Placement plan started", 72),
]


def create_tasks_for_admission(conn, admission_id, home_id, created_by):
    with conn.cursor() as cur:
        for title, label, hours in DEFAULT_TASK_TEMPLATES:
            due = datetime.utcnow() + timedelta(hours=hours)
            cur.execute("""
                INSERT INTO tasks (title, home_id, admission_id, due_at, created_at, source, status)
                VALUES (%s, %s, %s, %s, NOW(), 'admission', 'pending')
            """, (label, home_id, admission_id, due))

        conn.commit()
