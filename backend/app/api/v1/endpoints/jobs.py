from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
import uuid
import os
import json
import logging

from backend.app.services.scraper_engine import run_scraper_engine, task_registry
from backend.app.models.job import SearchRequest, SimulationRequest

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search", tags=["Jobs"], summary="Start a Job Search")
async def search_jobs(request: SearchRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    logger.info(f"Received search request: {request.query} in {request.location} on {request.portals}. Task ID: {task_id}")

    user_vectors_dict = None
    if request.user_vectors:
        user_vectors_dict = {
            "global_vector": request.user_vectors.global_vector,
            "skill_vector": request.user_vectors.skill_vector,
        }
    elif request.profile_id:
        from backend.app.db.crud import get_profile
        profile = get_profile(request.profile_id)
        if profile and profile.get("global_vector") and profile.get("skill_vector"):
            user_vectors_dict = {
                "global_vector": profile["global_vector"],
                "skill_vector": profile["skill_vector"],
            }

    background_tasks.add_task(
        run_scraper_engine,
        task_id,
        request.query,
        request.location,
        request.portals,
        request.serp_api_config,
        user_vectors_dict,
        request.profile_id,  # Pass profile_id for history association
    )

    return {"task_id": task_id, "status": "processing"}


@router.get("/status/{task_id}", tags=["Jobs"], summary="Check Task Status")
async def get_task_status(task_id: str):
    task = task_registry.get(task_id)
    
    if not task:
        # Check if results file already exists (History support after restart)
        scraper_result_file = os.path.join(
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../scraper/results")),
            f"{task_id}_final_results.json"
        )
        if os.path.exists(scraper_result_file):
            return {"task_id": task_id, "status": "completed", "logs": ["Restored from history"]}
            
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "task_id": task_id,
        "status": task.get("status"),
        "logs": task.get("logs", [])
    }


@router.get("/results/{task_id}", tags=["Jobs"], summary="Get Aggregated Results")
async def get_task_results(task_id: str):
    # Strategy 1: Load from file (this allows history retrieval even if registry is lost)
    scraper_result_file = os.path.join(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../scraper/results")),
        f"{task_id}_final_results.json"
    )
    if os.path.exists(scraper_result_file):
        with open(scraper_result_file, "r") as f:
            data = json.load(f)
        return data

    # Strategy 2: Check registry for ongoing tasks
    task = task_registry.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task results not found")

    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Task is still in progress")

    # Path: endpoints/ → v1/ → api/ → app/ → backend/ → project_root/scraper/results/
    scraper_result_file = os.path.join(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../scraper/results")),
        f"{task_id}_final_results.json"
    )
    if os.path.exists(scraper_result_file):
        with open(scraper_result_file, "r") as f:
            data = json.load(f)
        return data

    # Fallback: check current directory
    result_file = f"{task_id}_results.json"
    if os.path.exists(result_file):
        with open(result_file, "r") as f:
            data = json.load(f)
        return data

    return {"error": "Result file not found", "logs": task.get("logs")}


@router.get("/analytics/{task_id}", tags=["Jobs"], summary="Get Dashboard Analytics")
async def get_analytics(task_id: str):
    """
    Compute aggregated analytics for a completed search task.
    Returns chart-ready JSON with:
    - Top Skills (standardized, deduplicated)
    - Top Locations (normalized cities)
    - Top Companies
    - Top Roles (title-clustered)
    - Score Distribution
    - Portal Breakdown
    """
    from backend.app.services.analytics_service import compute_analytics, get_analytics_from_db

    task = task_registry.get(task_id)

    # Strategy 1: Load from JSON file (fastest, works even if DB is empty)
    scraper_result_file = os.path.join(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../scraper/results")),
        f"{task_id}_final_results.json"
    )

    if os.path.exists(scraper_result_file):
        with open(scraper_result_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        jobs = data.get("jobs", [])
        analytics = compute_analytics(jobs)
        analytics["source"] = "file"
        analytics["task_id"] = task_id
        return analytics

    # Strategy 2: Load from database
    try:
        analytics = get_analytics_from_db(task_id)
        analytics["source"] = "database"
        analytics["task_id"] = task_id
        return analytics
    except Exception:
        pass

    # Strategy 3: Check registry for ongoing status (if strategy 1 & 2 failed)
    if task and task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Task is still in progress")

    raise HTTPException(status_code=404, detail="No analytics found for this task")


@router.post("/simulate/{search_id}", tags=["Jobs"], summary="Run What-If Analysis")
async def simulate_job_impact(search_id: str, request: SimulationRequest):
    """
    Simulate adding skills to a profile and measure the impact on job match scores.
    Returns delta metrics (e.g., "Market Reach: 65% -> 78%").
    """
    from backend.app.services.simulation_service import simulate_skill_impact

    if not request.profile_id or not request.added_skills:
        raise HTTPException(status_code=400, detail="Profile ID and skills required")

    try:
        result = simulate_skill_impact(
            search_id=search_id,
            profile_id=request.profile_id,
            added_skills=request.added_skills
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

class ComparisonRequest(BaseModel):
    resume_text: Optional[str] = None
    profile_id: Optional[str] = None
    jd_text: str
    api_key: str  


@router.post("/compare", tags=["Jobs"], summary="Deep-Dive Job Comparison")
async def compare_jobs(request: ComparisonRequest):
    """
    Perform a high-precision comparison using Cross-Encoders and LLM.
    """
    from backend.app.services.comparison_service import run_deep_dive_comparison

    try:
        result = run_deep_dive_comparison(
            resume_text=request.resume_text,
            jd_text=request.jd_text,
            api_key=request.api_key,
            profile_id=request.profile_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Deep-dive failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
