from psycopg2.extras import RealDictCursor


def ensure_supervision_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS supervision_submissions (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER NOT NULL,
                journal_id INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'submitted',
                journal_summary TEXT,
                development_plan TEXT,
                supervision_pack TEXT,
                submitted_at TIMESTAMPTZ DEFAULT NOW(),
                reviewed_at TIMESTAMPTZ
            );
        """)
        conn.commit()


def create_supervision_submission(
    conn,
    staff_id,
    journal_id,
    journal_summary,
    development_plan,
    supervision_pack
):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            INSERT INTO supervision_submissions (
                staff_id,
                journal_id,
                journal_summary,
                development_plan,
                supervision_pack
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *;
        """, (
            staff_id,
            journal_id,
            journal_summary,
            development_plan,
            supervision_pack
        ))
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None


def list_supervision_submissions(conn, limit=50):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                s.id,
                s.staff_id,
                st.first_name,
                st.last_name,
                st.role,
                s.status,
                s.submitted_at
            FROM supervision_submissions s
            LEFT JOIN staff st
                ON st.id = s.staff_id
            ORDER BY s.submitted_at DESC
            LIMIT %s;
        """, (limit,))
        rows = cur.fetchall()
        return [dict(row) for row in rows]


def get_supervision_submission(conn, submission_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT *
            FROM supervision_submissions
            WHERE id = %s
            LIMIT 1;
        """, (submission_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def mark_supervision_submission_reviewed(conn, submission_id):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            UPDATE supervision_submissions
            SET
                status = 'reviewed',
                reviewed_at = NOW()
            WHERE id = %s
            RETURNING *;
        """, (submission_id,))
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
