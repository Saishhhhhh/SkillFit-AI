"""
Simulation Service — 'What-If' Analysis Engine.
Calculates how adding specific skills impacts a user's market match score.
"""

import logging
from typing import List, Dict, Any

from backend.app.db.crud import get_profile, get_job_vectors_by_search, get_jobs_by_search
from backend.app.services.vector_service import generate_user_vectors, calculate_match_score

logger = logging.getLogger(__name__)


def simulate_skill_impact(
    search_id: str,
    profile_id: str,
    added_skills: List[str]
) -> Dict[str, Any]:
   
    logger.info(f"Simulating impact of adding {added_skills} for search {search_id}")

    # 1. Fetch original profile
    profile = get_profile(profile_id)
    if not profile:
        raise ValueError("Profile not found")

    # 2. Combine skills
    original_skills = profile.get("confirmed_skills", [])
    # Case-insensitive dedup
    existing_lower = {s.lower() for s in original_skills}
    new_skills = []
    
    # Only add truly new skills
    for skill in added_skills:
        if skill.lower() not in existing_lower:
            new_skills.append(skill)
            existing_lower.add(skill.lower())
    
    if not new_skills:
        return {"error": "All skills already exist in profile", "delta": 0}

    simulated_skills = original_skills + new_skills

    # 3. Generate NEW User Vectors
    
    augmented_text = profile.get("raw_text", "") + "\n\n" + ", ".join(new_skills)
    
    new_vectors = generate_user_vectors(augmented_text, simulated_skills)

    # 4. Fetch Job Vectors (Cached)
    job_vectors = get_job_vectors_by_search(search_id)
    if not job_vectors:
        return {"error": "No cached job vectors found for this search", "delta": 0}
    
    # Map for quick lookup
    vec_map = {v["id"]: v for v in job_vectors}

    # 5. Fetch Original Jobs (for metadata & old scores)
    original_jobs = get_jobs_by_search(search_id)
    
    improved_jobs = []
    total_old_score = 0
    total_new_score = 0
    old_high_match = 0
    new_high_match = 0
    
    for job in original_jobs:
        job_id = job.get("id")
        old_score = job.get("match_score", 0)
        
        # Get vectors
        vecs = vec_map.get(job_id)
        if not vecs:
            continue
            
        # Prepare job dict for calculator
        # Calculator expects 'jd_global_vector' keys
        job_for_calc = {
            "jd_global_vector": vecs["global_vector"],
            "jd_skill_vector": vecs["skill_vector"]
        }
        
        # Calculate NEW score
        new_score = calculate_match_score(new_vectors, job_for_calc)
        
        # Stats
        total_old_score += old_score
        total_new_score += new_score
        
        if old_score >= 60: old_high_match += 1
        if new_score >= 60: new_high_match += 1
        
        if new_score > old_score:
            improved_jobs.append({
                "id": job_id,
                "title": job.get("title"),
                "company": job.get("company"),
                "old_score": old_score,
                "new_score": new_score,
                "delta": round(new_score - old_score, 1)
            })

    count = len(original_jobs)
    if count == 0:
        return {"error": "No jobs found", "delta": 0}

    # 6. Sort by improvement
    improved_jobs.sort(key=lambda x: x["delta"], reverse=True)

    return {
        "original_avg_score": round(total_old_score / count, 1),
        "new_avg_score": round(total_new_score / count, 1),
        "score_delta": round((total_new_score - total_old_score) / count, 1),
        "original_reach": round((old_high_match / count) * 100, 1),
        "new_reach": round((new_high_match / count) * 100, 1),
        "reach_delta": round(((new_high_match - old_high_match) / count) * 100, 1),
        "jobs_improved": len(improved_jobs),
        "top_improvements": improved_jobs[:10]  # Top 10 gainers
    }
