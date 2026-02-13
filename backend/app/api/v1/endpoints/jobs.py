from fastapi import APIRouter, BackgroundTasks, HTTPException
import uuid
import os
import json
import logging

from backend.app.services.scraper_engine import run_scraper_engine, task_registry
from backend.app.models.job import SearchRequest

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search", tags=["Jobs"], summary="Start a Job Search")
async def search_jobs(request: SearchRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    logger.info(f"Received search request: {request.query} in {request.location} on {request.portals}. Task ID: {task_id}")

    # Convert user_vectors Pydantic model to dict if provided
    user_vectors_dict = None
    if request.user_vectors:
        user_vectors_dict = {
            "global_vector": request.user_vectors.global_vector,
            "skill_vector": request.user_vectors.skill_vector,
        }

    background_tasks.add_task(
        run_scraper_engine,
        task_id,
        request.query,
        request.location,
        request.portals,
        request.serp_api_config,
        user_vectors_dict,
    )

    return {"task_id": task_id, "status": "processing"}


@router.get("/status/{task_id}", tags=["Jobs"], summary="Check Task Status")
async def get_task_status(task_id: str):
    task = task_registry.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "task_id": task_id,
        "status": task.get("status"),
        "logs": task.get("logs", [])
    }


@router.get("/results/{task_id}", tags=["Jobs"], summary="Get Aggregated Results")
async def get_task_results(task_id: str):
    task = task_registry.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Task is not completed yet")

    # Check scraper/results/ directory
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
