from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import logging
from backend.app.models.job import SearchRequest
from backend.app.services.scraper_engine import run_scraper_engine, task_registry
from backend.app.services.cleanup import cleanup_stale_files
from backend.app.api.v1.resume import router as resume_router
import os
import json
import asyncio

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

tags_metadata = [
    {
        "name": "Jobs",
        "description": "Operations related to job search and aggregation.",
    },
    {
        "name": "Profile",
        "description": "Resume upload, parsing, and profile management.",
    },
    {
        "name": "Health",
        "description": "Health check endpoints.",
    },
]

app = FastAPI(
    title="SkillFit AI Job Search API",
    description="""
    SkillFit AI Backend API for orchestrating job scrapers and resume processing.
    
    ## Features
    * **Search**: Trigger async scraper agents for LinkedIn, Indeed, Glassdoor, etc.
    * **Status**: Poll task progress.
    * **Results**: Retrieve aggregated job listings.
    * **Profile**: Upload and parse resumes to extract skills, job titles, and experience.
    """,
    version="1.0.0",
    openapi_tags=tags_metadata,
    servers=[
        {"url": "http://127.0.0.1:8000", "description": "Local Development Server"},
    ]
)

@app.on_event("startup")
async def startup_event():
    # Schedule periodic cleanup (can be moved to a BackgroundTask loop if needed)
    # For simplicity, running once on startup to clean old files from previous runs per launch
    # Or create a background loop
    asyncio.create_task(periodic_cleanup())

async def periodic_cleanup():
    while True:
        try:
            # Clean root directory (where main.py runs)
            cleanup_stale_files(os.getcwd(), max_age_seconds=3600*24) # 24 hours
            
            # Clean scraper directory (where scrapers dump files)
            scraper_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../scraper"))
            cleanup_stale_files(scraper_dir, max_age_seconds=3600*24)
            
        except Exception as e:
            logger.error(f"Cleanup task error: {e}")
            
        await asyncio.sleep(3600) # Run every hour

# CORS Configuration
origins = [
    "http://localhost",
    "http://localhost:3000", # React dev server
    "http://localhost:5173", # Vite dev server
    "*" # For Electron file:// protocol or widespread access during dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(resume_router, prefix="/api/v1/profile")

@app.get("/", tags=["Health"])
async def root():
    return {"message": "SkillFit AI Scraper Service is running"}

@app.post("/api/v1/jobs/search", tags=["Jobs"], summary="Start a Job Search")
async def search_jobs(request: SearchRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    logger.info(f"Received search request: {request.query} in {request.location} on {request.portals}. Task ID: {task_id}")
    
    # Trigger background task
    background_tasks.add_task(
        run_scraper_engine,
        task_id, 
        request.query, 
        request.location, 
        request.portals, 
        request.serp_api_config
    )
    
    return {"task_id": task_id, "status": "processing"}

@app.get("/api/v1/jobs/status/{task_id}", tags=["Jobs"], summary="Check Task Status")
async def get_task_status(task_id: str):
    task = task_registry.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": task_id,
        "status": task.get("status"),
        "logs": task.get("logs", [])
    }

@app.get("/api/v1/jobs/results/{task_id}", tags=["Jobs"], summary="Get Aggregated Results")
async def get_task_results(task_id: str):
    task = task_registry.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Task is not completed yet")
        
    result_file = f"{task_id}_results.json"
    
    # Check current directory
    if os.path.exists(result_file):
        with open(result_file, "r") as f:
            data = json.load(f)
        return data

    # Check scraper directory
    scraper_result_file = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../scraper")), f"{task_id}_results.json")
    if os.path.exists(scraper_result_file):
        with open(scraper_result_file, "r") as f:
            data = json.load(f)
        return data
        
    return {"error": "Result file not found", "logs": task.get("logs")}
