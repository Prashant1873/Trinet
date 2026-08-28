"""
TRINET (TM) Database Access Layer
Provides SQLite connection management and query helpers with dictionary row factories.
"""

import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'trinet.db')

def get_db_connection():
    """Get a SQLite database connection with row factory configured."""
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

@contextmanager
def db_session():
    """Context manager for database transactions."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def query_all(sql, params=()):
    """Execute query and return all rows as list of dicts."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def query_one(sql, params=()):
    """Execute query and return single row as dict, or None."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def execute_write(sql, params=()):
    """Execute INSERT/UPDATE/DELETE query and return lastrowid."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.lastrowid
