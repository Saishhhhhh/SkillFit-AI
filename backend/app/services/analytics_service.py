"""
Analytics Service — Aggregates job data into dashboard-ready stats.

Takes raw job listings from a search and produces:
- Top Skills (standardized, deduplicated, noise-filtered)
- Top Locations (normalized from messy scraper strings)
- Top Companies
- Top Job Roles (title clustering)
- Score Distribution buckets
"""

import re
import json
import logging
from collections import Counter
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# NOISE FILTERS
# ═══════════════════════════════════════════════════════════

# Skills that are too generic / not real tech skills
SKILL_NOISE = {
    "teams", "team", "less", "more", "show", "safe", "test", "testing",
    "go", "scheme", "foundation", "coding", "designing", "engineering",
    "communication", "collaboration", "leadership", "mentoring",
    "research", "analytics", "trade", "sprint", "compliance",
    "data quality", "edge ai", "cloud", "databases", "cloud platforms",
    "cloud technologies", "cloud-native", "data management",
    "data preprocessing", "experimentation", "problem solving",
    "operational risk", "risk mitigation", "user experience",
    "use cases", "graph", "t-", "cv", "ai", "ml",
    "data analyst", "data scientist", "model deployment",
    "embeddings", "summarization", "question answering",
}

# Indian states (for location → city extraction)
INDIAN_STATES = {
    "andhra pradesh", "arunachal pradesh", "assam", "bihar",
    "chhattisgarh", "goa", "gujarat", "haryana", "himachal pradesh",
    "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra",
    "manipur", "meghalaya", "mizoram", "nagaland", "odisha",
    "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
    "tripura", "uttar pradesh", "uttarakhand", "west bengal",
    "delhi", "new delhi",
}

# Common location aliases → canonical city name
CITY_ALIASES = {
    "bengaluru": "Bengaluru",
    "bangalore": "Bengaluru",
    "blr": "Bengaluru",
    "hyderabad": "Hyderabad",
    "hyder\u0101b\u0101d": "Hyderabad",
    "hyd": "Hyderabad",
    "chennai": "Chennai",
    "selaiyur": "Chennai",
    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "navi mumbai": "Mumbai",
    "pune": "Pune",
    "gurugram": "Gurugram",
    "gurgaon": "Gurugram",
    "noida": "Noida",
    "kolkata": "Kolkata",
    "calcutta": "Kolkata",
    "ahmedabad": "Ahmedabad",
    "jaipur": "Jaipur",
    "lucknow": "Lucknow",
    "chandigarh": "Chandigarh",
    "coimbatore": "Coimbatore",
    "kochi": "Kochi",
    "cochin": "Kochi",
    "thiruvananthapuram": "Thiruvananthapuram",
    "trivandrum": "Thiruvananthapuram",
    "indore": "Indore",
    "nagpur": "Nagpur",
    "visakhapatnam": "Visakhapatnam",
    "vizag": "Visakhapatnam",
    "vijayawada": "Vijayawada",
    "vijayaw\u0101da": "Vijayawada",
    "amravati": "Amravati",
    "new delhi": "Delhi",
    "delhi": "Delhi",
    "india": "India (Remote/Pan-India)",
}


# LOCATION NORMALIZATION

def normalize_locations(raw_location: str) -> List[str]:
    """
    Parse a messy location string into a list of clean city names.

    Examples:
        "Hyderabad, Chennai, Bengaluru"      → ["Hyderabad", "Chennai", "Bengaluru"]
        "Amravati, Maharashtra (+1 other)"   → ["Amravati"]
        "Bengaluru, Karnataka"               → ["Bengaluru"]
        "Selaiyur, Chennai, Tamil Nadu"      → ["Chennai"]
        "Malad West Dely, Mumbai, Maharashtra" → ["Mumbai"]
        "India"                              → ["India (Remote/Pan-India)"]
    """
    if not raw_location or raw_location == "N/A":
        return ["Unknown"]

    cleaned = re.sub(r"\(.*?\)", "", raw_location).strip()
    
    parts = [p.strip() for p in cleaned.split(",") if p.strip()]

    cities = []
    for part in parts:
        lower = part.lower().strip()

        if lower in INDIAN_STATES:
            continue

        # Map known aliases
        if lower in CITY_ALIASES:
            cities.append(CITY_ALIASES[lower])
        else:
            if any(noise in lower for noise in ["dely", "west", "east", "north", "south", "sector"]):
                continue
            cities.append(part.strip().title())

    seen = set()
    unique = []
    for c in cities:
        if c not in seen:
            seen.add(c)
            unique.append(c)

    return unique if unique else ["Unknown"]


# TITLE NORMALIZATION

def normalize_title(raw_title: str) -> str:
    """
    Normalize job titles to group similar ones.

    Examples:
        "Data scientist- Bang/Hyd/Chennai-Hybrid-MNC"  → "Data Scientist"
        "Sr. Data Scientist"                            → "Senior Data Scientist"
        "Data Science - Data Scientist"                 → "Data Scientist"
        "Vice President - Lead Data Scientist (...)"    → "Lead Data Scientist"
    """
    if not raw_title:
        return "Unknown"

    title = raw_title.strip()

    title = re.sub(r"\s*[-–—]\s*(Bang|Hyd|Chennai|Hybrid|MNC|Immediate|Across|Python).*$", "", title, flags=re.IGNORECASE)
    
    title = re.sub(r"\(.*?\)", "", title).strip()
    
    title = re.sub(r"^(vice\s+president|vp)\s*[-–—]\s*", "", title, flags=re.IGNORECASE).strip()

    title = re.sub(r"\bSr\.?\s", "Senior ", title, flags=re.IGNORECASE)
    title = re.sub(r"\bJr\.?\s", "Junior ", title, flags=re.IGNORECASE)
    title = re.sub(r"\bAI\s*/?\s*ML\b", "AI/ML", title, flags=re.IGNORECASE)
    title = re.sub(r"\bAIML\b", "AI/ML", title, flags=re.IGNORECASE)
    
    # Remove "Data Science - " prefix if followed by a role
    title = re.sub(r"^Data\s+Science\s*[-–—]\s*", "", title, flags=re.IGNORECASE).strip()

    # Clean up extra whitespace and periods
    title = re.sub(r"\s+", " ", title).strip()
    title = re.sub(r"\.\s", " ", title)  # "Senior. Data" -> "Senior Data"

    # Remove trailing dashes or noise
    title = title.rstrip("- .").strip()

    # Title case normalization for consistent grouping
    title = title.title()
    # Fix known acronyms that title() breaks
    title = title.replace("Ai/Ml", "AI/ML")
    title = title.replace("Ai ", "AI ")
    title = title.replace("Ml ", "ML ")
    title = title.replace("Llm", "LLM")
    title = title.replace("Nlp", "NLP")

    return title if title else "Unknown"


# MAIN ANALYTICS ENGINE

def compute_analytics(jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute dashboard analytics from a list of job dicts.
    
    Returns a structured dict ready for frontend charting:
    {
        "total_jobs": 50,
        "top_skills": [{"name": "python", "count": 45}, ...],
        "top_locations": [{"name": "Bengaluru", "count": 20}, ...],
        "top_companies": [{"name": "Google", "count": 5}, ...],
        "top_roles": [{"name": "Data Scientist", "count": 15}, ...],
        "score_distribution": [{"range": "90-100", "count": 2}, ...],
        "portal_breakdown": [{"name": "naukri", "count": 20}, ...],
    }
    """
    if not jobs:
        return {
            "total_jobs": 0,
            "top_skills": [],
            "top_locations": [],
            "top_companies": [],
            "top_roles": [],
            "score_distribution": [],
            "portal_breakdown": [],
        }

    # ─── Skill Aggregation (with standardization) ───
    from ml.utils.skill_standardizer import standardizer

    skill_counter = Counter()
    for job in jobs:
        skills = job.get("skills", [])
        if isinstance(skills, str):
            skills = json.loads(skills)
        if standardizer:
            skills = standardizer.standardize(skills)
        for skill in skills:
            clean = skill.lower().strip()
            if clean and clean not in SKILL_NOISE and len(clean) > 1:
                skill_counter[clean] += 1

    # ─── Location Aggregation ───
    location_counter = Counter()
    for job in jobs:
        raw_loc = job.get("location", "")
        cities = normalize_locations(raw_loc)
        for city in cities:
            location_counter[city] += 1

    # ─── Company Aggregation ───
    company_counter = Counter()
    for job in jobs:
        company = job.get("company", "").strip()
        if company and company != "N/A":
            company_counter[company] += 1

    # ─── Role/Title Aggregation ───
    role_counter = Counter()
    for job in jobs:
        raw_title = job.get("title", "")
        normalized = normalize_title(raw_title)
        if normalized and normalized != "Unknown":
            role_counter[normalized] += 1

    # ─── Score Distribution ───
    score_buckets = {
        "90-100": 0, "80-89": 0, "70-79": 0,
        "60-69": 0, "50-59": 0, "0-49": 0,
    }
    for job in jobs:
        score = job.get("match_score", 0)
        if score >= 90: score_buckets["90-100"] += 1
        elif score >= 80: score_buckets["80-89"] += 1
        elif score >= 70: score_buckets["70-79"] += 1
        elif score >= 60: score_buckets["60-69"] += 1
        elif score >= 50: score_buckets["50-59"] += 1
        else: score_buckets["0-49"] += 1

    # ─── Portal Breakdown ───
    portal_counter = Counter()
    for job in jobs:
        portal = job.get("portal", "unknown")
        portal_counter[portal] += 1

    # ─── Statistics ───
    total_score = sum(job.get("match_score", 0) for job in jobs)
    avg_match_score = round(total_score / len(jobs), 1) if jobs else 0

    # ─── Work Mode Aggregation ───
    work_mode_counter = Counter()
    for job in jobs:
        text = (job.get("location", "") + " " + job.get("title", "") + " " + job.get("description", "")[:500]).lower()
        if "remote" in text:
            work_mode_counter["Remote"] += 1
        elif "hybrid" in text:
            work_mode_counter["Hybrid"] += 1
        else:
            work_mode_counter["On-site"] += 1

    # ─── Build Response ───
    return {
        "total_jobs": len(jobs),
        "avg_match_score": avg_match_score,
        "work_mode_distribution": [
            {"name": k, "count": v} for k, v in work_mode_counter.items() if v > 0
        ],
        "top_skills": [
            {"name": name, "count": count}
            for name, count in skill_counter.most_common(20)
        ],
        "top_locations": [
            {"name": name, "count": count}
            for name, count in location_counter.most_common(15)
        ],
        "top_companies": [
            {"name": name, "count": count}
            for name, count in company_counter.most_common(15)
        ],
        "top_roles": [
            {"name": name, "count": count}
            for name, count in role_counter.most_common(10)
        ],
        "score_distribution": [
            {"range": bucket, "count": count}
            for bucket, count in score_buckets.items()
        ],
        "portal_breakdown": [
            {"name": name, "count": count}
            for name, count in portal_counter.most_common()
        ],
    }


def get_analytics_from_file(file_path: str) -> Dict[str, Any]:
    """Compute analytics from a saved JSON results file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        jobs = data.get("jobs", [])
        return compute_analytics(jobs)
    except Exception as e:
        logger.error(f"Failed to compute analytics from {file_path}: {e}")
        return {"error": str(e)}


def get_analytics_from_db(search_id: str) -> Dict[str, Any]:
    """Compute analytics from DB for a given search_id."""
    try:
        from backend.app.db.crud import get_jobs_by_search
        jobs = get_jobs_by_search(search_id)
        return compute_analytics(jobs)
    except Exception as e:
        logger.error(f"Failed to compute analytics from DB: {e}")
        return {"error": str(e)}
