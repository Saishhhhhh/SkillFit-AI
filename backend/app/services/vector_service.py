"""
Vector Scoring Service — embedding generation and match scoring.

Responsibilities:
1. Generate user profile vectors (global + skill) — called by /embed endpoint.
2. Batch-generate job vectors (global + skill) — called during scraper pipeline.
3. Calculate hybrid match scores (60% Skill + 40% Global).
4. Compute Market Reach score (% of jobs > 70% match).
"""

import logging
import numpy as np
from typing import Dict, List, Any
from ml.embeddings.vectorizer import vector_engine

logger = logging.getLogger(__name__)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)

    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(dot / (norm_a * norm_b))


def generate_user_vectors(resume_text: str, confirmed_skills: List[str]) -> Dict[str, List[float]]:
    # Create skill string (Standardize first to be safe)
    from ml.utils.skill_standardizer import standardizer
    if standardizer and confirmed_skills:
        confirmed_skills = standardizer.standardize(confirmed_skills)
        
    skill_string = ", ".join(confirmed_skills) if confirmed_skills else ""

    logger.info(f"Generating user vectors ({len(confirmed_skills)} confirmed skills)...")
    global_vector = vector_engine.encode(resume_text)
    skill_vector = vector_engine.encode(skill_string)

    return {
        "global_vector": global_vector,
        "skill_vector": skill_vector,
    }


def generate_job_vectors_batch(jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Batch-generate vectors for all jobs at once (fast).
    Adds 'jd_global_vector' and 'jd_skill_vector' to each job dict.
    """
    if not jobs:
        return jobs

    from ml.utils.skill_standardizer import standardizer

    jd_texts = [job.get("description", "") for job in jobs]
    jd_skills_list = []

    for job in jobs:
        sk = job.get("skills", [])
        if isinstance(sk, list):
            # Standardize if not already done
            if standardizer:
                sk = standardizer.standardize(sk)
            jd_skills_list.append(", ".join(sk))
        else:
            jd_skills_list.append("")

    logger.info(f"Batch-encoding {len(jobs)} job descriptions...")
    global_vectors = vector_engine.encode_batch(jd_texts)

    logger.info(f"Batch-encoding {len(jobs)} job skill strings...")
    skill_vectors = vector_engine.encode_batch(jd_skills_list)

    for i, job in enumerate(jobs):
        job["jd_global_vector"] = global_vectors[i]
        job["jd_skill_vector"] = skill_vectors[i]

    return jobs


def calculate_match_score(
    user_vectors: Dict[str, List[float]],
    job: Dict[str, Any],
    skill_weight: float = 0.6,
    global_weight: float = 0.4,
) -> float:
    """
    Calculate hybrid match score for a single job.
    Score = (Skill Similarity * 0.6) + (Global Similarity * 0.4)
    Returns a percentage (0-100).
    """
    skill_sim = cosine_similarity(
        user_vectors["skill_vector"],
        job.get("jd_skill_vector", [0.0] * 384)
    )
    global_sim = cosine_similarity(
        user_vectors["global_vector"],
        job.get("jd_global_vector", [0.0] * 384)
    )

    raw_score = (skill_sim * skill_weight) + (global_sim * global_weight)
    return round(max(0, min(100, raw_score * 100)), 1)


def score_jobs_against_user(
    user_vectors: Dict[str, List[float]],
    jobs: List[Dict[str, Any]],
    keep_vectors: bool = False
) -> Dict[str, Any]:
    # 1. Batch-encode all job vectors
    jobs = generate_job_vectors_batch(jobs)

    # 2. Score each job
    for job in jobs:
        job["match_score"] = calculate_match_score(user_vectors, job)

    # 3. Remove raw vectors from output (unless requested)
    if not keep_vectors:
        for job in jobs:
            job.pop("jd_global_vector", None)
            job.pop("jd_skill_vector", None)

    # 4. Sort (highest match first)
    jobs.sort(key=lambda j: j["match_score"], reverse=True)

    # 5. Market Reach
    high_match_count = sum(1 for j in jobs if j["match_score"] >= 70)
    market_reach = round((high_match_count / len(jobs)) * 100, 1) if jobs else 0
    average_score = round(sum(j["match_score"] for j in jobs) / len(jobs), 1) if jobs else 0

    logger.info(f"Scoring complete: Market Reach={market_reach}%, Avg={average_score}%")

    return {
        "jobs": jobs,
        "market_reach": market_reach,
        "average_score": average_score,
        "total_jobs": len(jobs),
        "high_match_jobs": high_match_count,
    }
