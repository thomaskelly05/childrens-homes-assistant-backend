from datetime import datetime

def get_staff(conn, user_id: int):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()

def list_staff(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE archived = FALSE ORDER BY email")
        return cur.fetchall()

def create_staff(conn, data: StaffCreate):
    now = datetime.utcnow()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (email, password_hash, role, home_id, archived, created_at, updated_at)
            VALUES (%s, crypt(%s, gen_salt('bf')), %s, %s, FALSE, %s, %s)
            RETURNING id
            """,
            (data.email, data.password, data.role, data.home_id, now, now)
        )
        row = cur.fetchone()
        conn.commit()
        return row["id"]

def update_staff(conn, user_id: int, data: StaffUpdate):
    fields = []
    values = []

    for field, value in data.dict(exclude_unset=True).items():
        fields.append(f"{field} = %s")
        values.append(value)

    if not fields:
        return

    fields.append("updated_at = %s")
    values.append(datetime.utcnow())
    values.append(user_id)

    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE users SET {', '.join(fields)} WHERE id = %s",
            tuple(values)
        )
        conn.commit()

def archive_staff(conn, user_id: int):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET archived = TRUE, updated_at = %s WHERE id = %s",
            (datetime.utcnow(), user_id)
        )
        conn.commit()
