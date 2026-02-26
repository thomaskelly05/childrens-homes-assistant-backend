from psycopg2.extensions import connection as PGConnection

def get_user(conn: PGConnection, user_id: int):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()

def assign_staff_to_home(conn: PGConnection, user_id: int, home_id: int):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET home_id = %s
            WHERE id = %s
            """,
            (home_id, user_id)
        )
        conn.commit()
