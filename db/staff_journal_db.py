from psycopg2.extras import RealDictCursor


def ensure_staff_journal_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS staff_journal (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER NOT NULL,
                holding_today TEXT,
                practice_today TEXT,
                reflection_today TEXT,
                description TEXT,
                feelings TEXT,
                evaluation TEXT,
                analysis TEXT,
                conclusion TEXT,
                action_plan TEXT,
                playfulness TEXT,
                acceptance TEXT,
                curiosity TEXT,
                empathy TEXT,
                leadership_style VARCHAR(100),
                leadership_reflection TEXT,
                child_impact TEXT,
                team_impact TEXT,
                safeguarding_considerations TEXT,
                support_needed TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS description TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS feelings TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS evaluation TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS analysis TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS conclusion TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS action_plan TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS playfulness TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS acceptance TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS curiosity TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS empathy TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS leadership_style VARCHAR(100);")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS leadership_reflection TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS child_impact TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS team_impact TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS safeguarding_considerations TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS support_needed TEXT;")
        cur.execute("ALTER TABLE staff_journal ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();")

        conn.commit()


def create_staff_journal(conn, data):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO staff_journal (
                staff_id,
                holding_today,
                practice_today,
                reflection_today,
                description,
                feelings,
                evaluation,
                analysis,
                conclusion,
                action_plan,
                playfulness,
                acceptance,
                curiosity,
                empathy,
                leadership_style,
                leadership_reflection,
                child_impact,
                team_impact,
                safeguarding_considerations,
                support_needed
            )
            VALUES (
                %(staff_id)s,
                %(holding_today)s,
                %(practice_today)s,
                %(reflection_today)s,
                %(description)s,
                %(feelings)s,
                %(evaluation)s,
                %(analysis)s,
                %(conclusion)s,
                %(action_plan)s,
                %(playfulness)s,
                %(acceptance)s,
                %(curiosity)s,
                %(empathy)s,
                %(leadership_style)s,
                %(leadership_reflection)s,
                %(child_impact)s,
                %(team_impact)s,
                %(safeguarding_considerations)s,
                %(support_needed)s
            )
            RETURNING *;
        """, data)
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None


def get_staff_journal(conn, journal_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT *
            FROM staff_journal
            WHERE id = %s
            LIMIT 1;
        """, (journal_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_latest_staff_journal(conn, staff_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT *
            FROM staff_journal
            WHERE staff_id = %s
            ORDER BY created_at DESC
            LIMIT 1;
        """, (staff_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def list_staff_journals(conn, staff_id, limit=50):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT *
            FROM staff_journal
            WHERE staff_id = %s
            ORDER BY created_at DESC
            LIMIT %s;
        """, (staff_id, limit))
        rows = cur.fetchall()
        return [dict(row) for row in rows]


def update_staff_journal(conn, journal_id, data):
    fields = []
    values = []

    allowed_fields = [
        "holding_today",
        "practice_today",
        "reflection_today",
        "description",
        "feelings",
        "evaluation",
        "analysis",
        "conclusion",
        "action_plan",
        "playfulness",
        "acceptance",
        "curiosity",
        "empathy",
        "leadership_style",
        "leadership_reflection",
        "child_impact",
        "team_impact",
        "safeguarding_considerations",
        "support_needed",
    ]

    for field in allowed_fields:
      if field in data:
        fields.append(f"{field} = %s")
        values.append(data[field])

    if not fields:
        return get_staff_journal(conn, journal_id)

    fields.append("updated_at = NOW()")
    values.append(journal_id)

    query = f"""
        UPDATE staff_journal
        SET {", ".join(fields)}
        WHERE id = %s
        RETURNING *;
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, values)
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
