"""
Central API Router for v1.

All endpoint routers are registered here.
To add a new module (e.g., market, insights), just:
  1. Create `endpoints/market.py` with its own `router = APIRouter()`
  2. Import and include it below.
"""

from fastapi import APIRouter

from backend.app.api.v1.endpoints import profile, jobs

api_router = APIRouter()

# Phase 1: Profile & Resume
api_router.include_router(profile.router, prefix="/profile")

# Phase 1: Job Search & Scraping
api_router.include_router(jobs.router, prefix="/jobs")

# ── Future Phases ──
# api_router.include_router(market.router, prefix="/market")       # Phase 2
# api_router.include_router(insights.router, prefix="/insights")   # Phase 4
# api_router.include_router(comparison.router, prefix="/compare")  # Phase 5
