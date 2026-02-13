from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import asyncio

from backend.app.core.config import settings
from backend.app.api.v1.router import api_router
from backend.app.services.cleanup import cleanup_stale_files

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Tag Metadata (for Swagger UI) ──
tags_metadata = [
    {"name": "Profile", "description": "Resume upload, parsing, and profile management."},
    {"name": "Jobs", "description": "Job search, scraping, and aggregation."},
    {"name": "Health", "description": "Health check endpoints."},
]

# ── App Init ──
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    SkillFit AI Backend API.
    
    ## Features
    * **Profile**: Upload and parse resumes to extract skills and experience.
    * **Jobs**: Trigger async scraper agents for LinkedIn, Indeed, Glassdoor, etc.
    """,
    version="1.0.0",
    openapi_tags=tags_metadata,
    servers=[
        {"url": f"http://{settings.HOST}:{settings.PORT}", "description": "Local Dev"},
    ]
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register All Routers ──
app.include_router(api_router, prefix=settings.API_PREFIX)

# ── Health Check ──
@app.get("/", tags=["Health"])
async def root():
    return {"message": f"{settings.PROJECT_NAME} is running"}

# ── Background Cleanup ──
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_cleanup())

async def periodic_cleanup():
    while True:
        try:
            cleanup_stale_files(os.getcwd(), max_age_seconds=settings.CLEANUP_MAX_AGE_SECONDS)

            scraper_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../scraper"))
            cleanup_stale_files(scraper_dir, max_age_seconds=settings.CLEANUP_MAX_AGE_SECONDS)
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

        await asyncio.sleep(settings.CLEANUP_INTERVAL_SECONDS)
