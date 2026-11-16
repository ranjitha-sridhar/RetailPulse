
import sqlite3
from pathlib import Path
from contextlib import contextmanager

# Store the authentication database inside backend/app/database
APP_DIR = Path(__file__).resolve().parents[1]
DATABASE_PATH = APP_DIR / "database" / "users.db"

DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_db_connection():
    """Provide a database connection and close it safely."""
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database():
    """Create the users table if it does not already exist."""
    with get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'store_manager',
                store_id TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def get_user_by_username(username: str):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()


def get_user_by_email(email: str):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()


def create_user(
    username: str,
    email: str,
    hashed_password: str,
    role: str = "store_manager",
    store_id: str = None
):
    with get_db_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO users
            (username, email, hashed_password, role, store_id)
            VALUES (?, ?, ?, ?, ?)
        """, (username, email, hashed_password, role, store_id))

        return cursor.lastrowid
