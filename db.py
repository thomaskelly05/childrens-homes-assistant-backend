# db.py
import os
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

POOL = SimpleConnectionPool(
    1,
    10,
    DATABASE_URL,
    cursor_factory=RealDictCursor,
)

def get_db():
    conn = POOL.getconn()
    try:
        yield conn
    finally:
        POOL.putconn(conn)
