"""
SkillFit-AI — Database CRUD Operations
=======================================
All read/write operations for profiles, searches, and jobs.
"""

import json
import uuid
import logging
from typing import Dict, List, Any, Optional

from backend.app.db.database import get_connection, serialize_vector, deserialize_vector

logger = logging.getLogger(__name__)

# PROFILES

def save_profile(
    raw_text: str,
    extracted_skills: List[str],
    experience: List[str],
    filename: str = "",
) -> str:
    """Save a new user profile after resume upload. Returns profile_id."""
    profile_id = str(uuid.uuid4())
    conn = get_connection()
    conn.execute(
        """INSERT INTO profiles (id, filename, raw_text, extracted_skills, experience)
           VALUES (?, ?, ?, ?, ?)""",
        (profile_id, filename, raw_text, json.dumps(extracted_skills), json.dumps(experience)),
    )
    conn.commit()
    conn.close()
    logger.info(f"Profile saved: {profile_id} ({filename})")
    return profile_id


def update_profile_vectors(
    profile_id: str,
    confirmed_skills: List[str],
    global_vector: List[float],
    skill_vector: List[float],
):
    """Update a profile with confirmed skills and computed vectors."""
    conn = get_connection()

    # Update the profiles table
    conn.execute(
        """UPDATE profiles
           SET confirmed_skills = ?, global_vector = ?, skill_vector = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?""",
        (json.dumps(confirmed_skills), serialize_vector(global_vector), serialize_vector(skill_vector), profile_id),
    )

    # Upsert into vec_profiles virtual table
    # Delete old entry if exists, then insert new
    conn.execute("DELETE FROM vec_profiles WHERE profile_id = ?", (profile_id,))
    conn.execute(
        "INSERT INTO vec_profiles (profile_id, global_vector, skill_vector) VALUES (?, ?, ?)",
        (profile_id, serialize_vector(global_vector), serialize_vector(skill_vector)),
    )

    conn.commit()
    conn.close()
    logger.info(f"Profile vectors updated: {profile_id}")


def get_profile(profile_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a profile by ID."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    conn.close()

    if not row:
        return None

    result = dict(row)
    result["extracted_skills"] = json.loads(result["extracted_skills"])
    result["confirmed_skills"] = json.loads(result["confirmed_skills"])
    result["experience"] = json.loads(result["experience"])

    # Deserialize vectors if present
    if result["global_vector"]:
        result["global_vector"] = deserialize_vector(result["global_vector"])
    if result["skill_vector"]:
        result["skill_vector"] = deserialize_vector(result["skill_vector"])

    return result


def get_latest_profile() -> Optional[Dict[str, Any]]:
    """Get the most recently created profile."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1").fetchone()
    conn.close()

    if not row:
        return None

    result = dict(row)
    result["extracted_skills"] = json.loads(result["extracted_skills"])
    result["confirmed_skills"] = json.loads(result["confirmed_skills"])
    result["experience"] = json.loads(result["experience"])

    if result["global_vector"]:
        result["global_vector"] = deserialize_vector(result["global_vector"])
    if result["skill_vector"]:
        result["skill_vector"] = deserialize_vector(result["skill_vector"])

    return result


# SEARCHES

def save_search(
    search_id: str,
    profile_id: Optional[str],
    query: str,
    location: str,
    portals: List[str],
):
    """Save a new search entry."""
    conn = get_connection()
    conn.execute(
        """INSERT INTO searches (id, profile_id, query, location, portals)
           VALUES (?, ?, ?, ?, ?)""",
        (search_id, profile_id, query, location, json.dumps(portals)),
    )
    conn.commit()
    conn.close()
    logger.info(f"Search saved: {search_id} — '{query}' in '{location}'")


def update_search_scores(
    search_id: str,
    total_jobs: int,
    market_reach: float,
    average_score: float,
    high_match_jobs: int,
):
    """Update a search with scoring results."""
    conn = get_connection()
    conn.execute(
        """UPDATE searches
           SET total_jobs = ?, market_reach = ?, average_score = ?, high_match_jobs = ?
           WHERE id = ?""",
        (total_jobs, market_reach, average_score, high_match_jobs, search_id),
    )
    conn.commit()
    conn.close()
    logger.info(f"Search scores updated: {search_id}")


def get_search_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent search history."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM searches ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()

    results = []
    for row in rows:
        r = dict(row)
        r["portals"] = json.loads(r["portals"])
        results.append(r)
    return results


# JOBS

def save_jobs_batch(
    search_id: str,
    jobs: List[Dict[str, Any]],
    job_vectors: Optional[List[Dict[str, List[float]]]] = None,
):
    """
    Batch-save all jobs for a search.
    Optionally saves vectors to vec_jobs for future similarity queries.
    """
    conn = get_connection()

    for i, job in enumerate(jobs):
        cursor = conn.execute(
            """INSERT INTO jobs (search_id, title, company, location, description, skills, url, portal, match_score, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                search_id,
                job.get("title", ""),
                job.get("company", ""),
                job.get("location", ""),
                job.get("description", ""),
                json.dumps(job.get("skills", [])),
                job.get("url", ""),
                job.get("portal", ""),
                job.get("match_score", 0),
                json.dumps({k: v for k, v in job.items() if k not in (
                    "title", "company", "location", "description", "skills",
                    "url", "portal", "match_score",
                    "jd_global_vector", "jd_skill_vector"
                )}),
            ),
        )

        # Save vectors if provided
        if job_vectors and i < len(job_vectors):
            job_id = cursor.lastrowid
            vecs = job_vectors[i]
            if vecs.get("global_vector") and vecs.get("skill_vector"):
                conn.execute(
                    "INSERT INTO vec_jobs (job_id, global_vector, skill_vector) VALUES (?, ?, ?)",
                    (
                        job_id,
                        serialize_vector(vecs["global_vector"]),
                        serialize_vector(vecs["skill_vector"]),
                    ),
                )

    conn.commit()
    conn.close()
    logger.info(f"Saved {len(jobs)} jobs for search {search_id}")


def get_jobs_by_search(search_id: str) -> List[Dict[str, Any]]:
    """Get all jobs for a given search, sorted by match_score descending."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM jobs WHERE search_id = ? ORDER BY match_score DESC",
        (search_id,),
    ).fetchall()
    conn.close()

    results = []
    for row in rows:
        r = dict(row)
        r["skills"] = json.loads(r["skills"])
        r["metadata"] = json.loads(r["metadata"])
        results.append(r)
    return results


def get_all_jobs(limit: int = 100) -> List[Dict[str, Any]]:
    """Get all jobs across all searches."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM jobs ORDER BY match_score DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()

    results = []
    for row in rows:
        r = dict(row)
        r["skills"] = json.loads(r["skills"])
        r["metadata"] = json.loads(r["metadata"])
        results.append(r)
    return results


def get_job_vectors_by_search(search_id: str) -> List[Dict[str, Any]]:
    """Get job vectors for a search from the vec_jobs virtual table."""
    conn = get_connection()
    # Join jobs table to filter by search_id
    try:
        rows = conn.execute(
            "SELECT j.id, vj.global_vector, vj.skill_vector FROM jobs j JOIN vec_jobs vj ON j.id = vj.job_id WHERE j.search_id = ?",
            (search_id,),
        ).fetchall()
    except Exception as e:
        logger.error(f"Vector fetch failed: {e}")
        return []
    finally:
        conn.close()

    results = []
    for row in rows:
        try:
            results.append({
                "id": row["id"],
                "global_vector": deserialize_vector(row["global_vector"]),
                "skill_vector": deserialize_vector(row["skill_vector"]),
            })
        except Exception:
            continue

    return results
