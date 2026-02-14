"""
Database file: data/skillfit.db (project root)
"""

import sqlite3
import sqlite_vec
import os
import json
import logging
import struct
from typing import List

logger = logging.getLogger(__name__)

# Database file location — stored in project root under data/
DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
DB_PATH = os.path.join(DB_DIR, "skillfit.db")

VECTOR_DIM = 384  # all-MiniLM-L6-v2 output dimension


def serialize_vector(vec: List[float]) -> bytes:
    """Convert a Python list of floats to a compact binary blob for sqlite-vec."""
    return struct.pack(f"{len(vec)}f", *vec)


def deserialize_vector(blob: bytes) -> List[float]:
    """Convert a binary blob back to a Python list of floats."""
    n = len(blob) // 4  
    return list(struct.unpack(f"{n}f", blob))


def get_connection() -> sqlite3.Connection:
    """
    Get a connection to the local SQLite database with sqlite-vec loaded.
    Creates the data/ directory and database file if they don't exist.
    """
    os.makedirs(DB_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  
    conn.execute("PRAGMA journal_mode=WAL")  
    conn.execute("PRAGMA foreign_keys=ON")

    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)

    return conn


def init_db():
    """
    Create all tables if they don't exist.
    Called once at app startup.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # ── 1. Profiles Table ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            filename TEXT,
            raw_text TEXT NOT NULL,
            extracted_skills TEXT DEFAULT '[]',
            confirmed_skills TEXT DEFAULT '[]',
            experience TEXT DEFAULT '[]',
            resume_path TEXT,
            global_vector BLOB,
            skill_vector BLOB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── 2. Searches Table ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS searches (
            id TEXT PRIMARY KEY,
            profile_id TEXT,
            query TEXT NOT NULL,
            location TEXT DEFAULT '',
            portals TEXT DEFAULT '[]',
            total_jobs INTEGER DEFAULT 0,
            market_reach REAL DEFAULT 0,
            average_score REAL DEFAULT 0,
            high_match_jobs INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES profiles(id)
        )
    """)

    # ── 3. Jobs Table ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_id TEXT NOT NULL,
            title TEXT DEFAULT '',
            company TEXT DEFAULT '',
            location TEXT DEFAULT '',
            description TEXT DEFAULT '',
            skills TEXT DEFAULT '[]',
            url TEXT DEFAULT '',
            portal TEXT DEFAULT '',
            match_score REAL DEFAULT 0,
            metadata TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (search_id) REFERENCES searches(id)
        )
    """)

    # ── 4. Vector Virtual Tables (sqlite-vec) ──
    # For fast vector similarity search on job embeddings
    cursor.execute(f"""
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_jobs USING vec0(
            job_id INTEGER PRIMARY KEY,
            global_vector float[{VECTOR_DIM}],
            skill_vector float[{VECTOR_DIM}]
        )
    """)

    # For user profile vectors
    cursor.execute(f"""
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_profiles USING vec0(
            profile_id TEXT PRIMARY KEY,
            global_vector float[{VECTOR_DIM}],
            skill_vector float[{VECTOR_DIM}]
        )
    """)

    # Migrations
    try:
        cursor.execute("ALTER TABLE profiles ADD COLUMN resume_path TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
    
    conn.commit()
    conn.close()

    logger.info(f"Database initialized at: {DB_PATH}")


def reset_db():
    """Drop all tables and recreate them. Use for development only."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS jobs")
    cursor.execute("DROP TABLE IF EXISTS searches")
    cursor.execute("DROP TABLE IF EXISTS profiles")
    cursor.execute("DROP TABLE IF EXISTS vec_jobs")
    cursor.execute("DROP TABLE IF EXISTS vec_profiles")
    conn.commit()
    conn.close()
    init_db()
    logger.info("Database reset complete.")
