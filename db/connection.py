import os
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

def get_db():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise Exception("DATABASE_URL is not set")

    parsed = urlparse(url)

    conn = psycopg2.connect(
        host=parsed.hostname,
        database=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        port=parsed.port,
        cursor_factory=RealDictCursor,
        sslmode="require"
    )

    try:
        yield conn
    finally:
        conn.close()
