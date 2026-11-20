import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager

# Store the authentication database inside backend/app/database
APP_DIR = Path(__file__).resolve().parents[1]

DATABASE_PATH = Path(
    os.getenv(
        "DATABASE_PATH",
        str(APP_DIR / "database" / "users.db")
    )
)

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
    """Create the users and inventory optimization tables if they do not already exist."""
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

        conn.execute("""
            CREATE TABLE IF NOT EXISTS optimization_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                solver TEXT,
                total_transfers INTEGER,
                total_transfer_units INTEGER,
                total_transport_cost REAL,
                external_replenishment_units INTEGER,
                estimated_savings REAL,
                status TEXT
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS inventory_transfers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER,
                item_id TEXT,
                from_store TEXT,
                to_store TEXT,
                transfer_units INTEGER,
                donor_safe_surplus INTEGER,
                recipient_need INTEGER,
                estimated_cost REAL,
                remaining_shortage INTEGER,
                status TEXT,
                explanation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (run_id) REFERENCES optimization_runs(id)
            )
        """)


def record_optimization_run(run_data: dict) -> int:
    """Save an optimization run and its transfers into SQLite."""
    initialize_database()
    with get_db_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO optimization_runs
            (solver, total_transfers, total_transfer_units, total_transport_cost, external_replenishment_units, estimated_savings, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            run_data.get("solver", "Google OR-Tools CP-SAT"),
            run_data.get("total_transfers_count", 0),
            run_data.get("total_transfer_units", 0),
            run_data.get("total_transfer_cost", 0.0),
            run_data.get("total_external_units", 0),
            run_data.get("estimated_savings", 0.0),
            run_data.get("status", "success")
        ))
        run_id = cursor.lastrowid

        transfers = run_data.get("transfers", [])
        for t in transfers:
            conn.execute("""
                INSERT INTO inventory_transfers
                (run_id, item_id, from_store, to_store, transfer_units, donor_safe_surplus, recipient_need, estimated_cost, remaining_shortage, status, explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id,
                t.get("item_id"),
                t.get("from_store"),
                t.get("to_store"),
                t.get("transfer_units", 0),
                t.get("donor_safe_surplus", 0),
                t.get("recipient_need", 0),
                t.get("estimated_cost", 0.0),
                t.get("remaining_shortage", 0),
                t.get("status", "Recommended"),
                t.get("explanation", "")
            ))

        return run_id


def get_optimization_history(limit: int = 10):
    """Retrieve recent optimization runs."""
    initialize_database()
    with get_db_connection() as conn:
        cursor = conn.execute("""
            SELECT * FROM optimization_runs ORDER BY id DESC LIMIT ?
        """, (limit,))
        return [dict(row) for row in cursor.fetchall()]


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


# Run initialize_database on module load
initialize_database()
