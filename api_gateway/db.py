import os, psycopg2
from contextlib import contextmanager

def get_conn():
    url = os.getenv("DATABASE_URL", "postgresql://app:app@localhost:5432/boilerai")
    return psycopg2.connect(url)

@contextmanager
def _conn():
    conn = get_conn()
    try:
        yield conn
    finally:
        conn.close()

def db_query(sql: str, params: tuple | list | None = None):
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            if cur.description:
                cols = [d[0] for d in cur.description]
                return [dict(zip(cols, r)) for r in cur.fetchall()]
            return []