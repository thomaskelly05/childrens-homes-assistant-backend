import psycopg2
from psycopg2.extras import RealDictCursor

def get_db():
    conn = psycopg2.connect(
        host="...",
        dbname="...",
        user="...",
        password="...",
        cursor_factory=RealDictCursor
    )
    try:
        yield conn
    finally:
        conn.close()
