"""
Central API Router for v1.
"""

from fastapi import APIRouter

from backend.app.api.v1.endpoints import profile, jobs, vectors, history

api_router = APIRouter()

# Phase 1: Profile & Resume
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])

# Phase 1: Job Search & Scraping
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])

# Vector Operations (Scoring Calculator)
api_router.include_router(vectors.router, prefix="/vectors", tags=["Vector Operations"])

# History
api_router.include_router(history.router, prefix="/history", tags=["History"])

# GenAI
from backend.app.api.v1.endpoints import genai
api_router.include_router(genai.router, prefix="/genai", tags=["GenAI"])
