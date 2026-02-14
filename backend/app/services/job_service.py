"""
Job Skill Extraction Service.

Enriches scraped job data with extracted skills.
- Naukri: Already has skills from the DOM → use them directly.
- LinkedIn/Others: skills[] is empty → extract from description using the ML engine.
"""

import logging
from typing import Dict, List, Any
from ml.ner.inference import resume_parser

logger = logging.getLogger(__name__)


def extract_skills_from_job(job: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich a single job posting with extracted skills.
    
    If the job already has skills (e.g., Naukri), keep them.
    Otherwise, run the TwoLayerExtractor on the description text.
    """
    existing_skills = job.get("skills", [])

    # If the scraper already provided skills, trust them but standardize
    if existing_skills:
        job["skills_source"] = "scraper"
    else:
        # Otherwise, extract from the job description
        description = job.get("description", "")
        if not description or description == "N/A":
            job["skills_source"] = "none"
            return job

        try:
            result = resume_parser.extract_skills(description)
            job["skills"] = result.get("skills", [])
            job["skills_source"] = "ml_extracted"
        except Exception as e:
            logger.warning(f"Skill extraction failed for '{job.get('title', 'Unknown')}': {e}")
            job["skills_source"] = "error"

    # Standardize skills (Critical for vector matching)
    from ml.utils.skill_standardizer import standardizer
    if standardizer and job.get("skills"):
        job["skills"] = standardizer.standardize(job["skills"])

    return job


def enrich_job_listings(jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Batch-enrich a list of job postings with skills.
    Called by scraper_engine after aggregation.
    """
    logger.info(f"Enriching {len(jobs)} jobs with skill extraction...")

    for i, job in enumerate(jobs):
        jobs[i] = extract_skills_from_job(job)

    extracted_count = sum(1 for j in jobs if j.get("skills_source") == "ml_extracted")
    scraper_count = sum(1 for j in jobs if j.get("skills_source") == "scraper")
    logger.info(f"Enrichment complete: {scraper_count} from scraper, {extracted_count} from ML.")

    return jobs
