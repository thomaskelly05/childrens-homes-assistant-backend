from datetime import datetime


# ----------------------------------------------------
# CHAT LOGGING
# ----------------------------------------------------

def log_chat(conn, user_email, role, home_id, message, response):

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO chat_logs
            (user_email, message, response, created_at, home_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                user_email,
                message,
                response,
                datetime.utcnow(),
                home_id
            )
        )

        conn.commit()


# ----------------------------------------------------
# SUPERVISION SUMMARY CREATION
# ----------------------------------------------------

def create_supervision_summary(conn, user_email, home_id, reflection):

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO supervision_summaries
            (user_email, reflection, created_at, home_id)
            VALUES (%s, %s, %s, %s)
            """,
            (
                user_email,
                reflection,
                datetime.utcnow(),
                home_id
            )
        )

        conn.commit()
