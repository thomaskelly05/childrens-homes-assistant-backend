# assistant/logging.py

def log_chat(conn, user_email: str, role: str, home_id: int | None, message: str, response: str):
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO chat_logs (user_email, role, home_id, message, response)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_email, role, home_id, message, response),
    )
    conn.commit()


def log_template(conn, user_email: str, role: str, home_id: int | None, template_name: str, prompt: str, output: str):
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO template_logs (user_email, role, home_id, template_name, input_markdown, output_html)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (user_email, role, home_id, template_name, prompt, output),
    )
    conn.commit()
