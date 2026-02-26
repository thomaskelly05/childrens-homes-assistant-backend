# log_helpers.py
import datetime
import logging
from psycopg2.extensions import connection as PGConnection

# ---------------------------------------------------------
# LOGGER
# ---------------------------------------------------------
logger = logging.getLogger("indicare")
logger.setLevel(logging.INFO)

# Avoid duplicate handlers (Render restarts can cause this)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# ---------------------------------------------------------
# CHAT LOGGING
# ---------------------------------------------------------
def log_chat(
    conn: PGConnection,
    user_email: str,
    role: str,
    home_id: int | None,
    message: str,
    response: str
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO chat_logs (user_email, role, home_id, message, response, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_email, role, home_id, message, response, datetime.datetime.utcnow())
        )
        conn.commit()

# ---------------------------------------------------------
# TEMPLATE LOGGING
# ---------------------------------------------------------
def log_template(
    conn: PGConnection,
    user_email: str,
    role: str,
    home_id: int | None,
    template_name: str,
    prompt: str,
    output: str
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO template_logs (user_email, role, home_id, template_name, prompt, output, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (user_email, role, home_id, template_name, prompt, output, datetime.datetime.utcnow())
        )
        conn.commit()
