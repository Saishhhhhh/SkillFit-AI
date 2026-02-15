
import subprocess
import os
import json
import uuid
from typing import List, Dict, Optional, Any
import time
import logging
import threading
from backend.app.services.job_service import enrich_job_listings

logger = logging.getLogger(__name__)

task_registry = {}

import sys

SCRAPER_DIR = os.path.join(sys._MEIPASS, "scraper") if getattr(sys, 'frozen', False) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../scraper"))


def run_scraper_engine(
    task_id: str, 
    query: str, 
    location: str, 
    portals: List[str], 
    serp_api_config: Optional[Any] = None,
    user_vectors: Optional[Dict[str, List[float]]] = None,
    profile_id: Optional[str] = None
):

    task_registry[task_id] = {"status": "processing", "results": [], "logs": []}
    
    # Create results directory if it doesn't exist
    RESULTS_DIR = os.path.join(SCRAPER_DIR, "results")
    os.makedirs(RESULTS_DIR, exist_ok=True)
    
    processes = []
    temp_files = {}

    def stream_logs(pipe, logs_list):
        """Read lines from a pipe and append to logs list."""
        for line in iter(pipe.readline, b''):
            decoded = line.decode('utf-8', errors='replace').strip()
            if decoded:
                logs_list.append(decoded)
        pipe.close()

    for portal in portals:
        portal_map = {
            "linkedin": "linkedin.py",
            "indeed": "Indeed.py",
            "glassdoor": "Glassdoor.py",
            "naukri": "Naukri.py",
            "google": "google_jobs.py"
        }
        
        script_name = portal_map.get(portal.lower())
        if not script_name:
             task_registry[task_id]["logs"].append(f"Unknown portal: {portal}")
             continue

        script_path = os.path.join(SCRAPER_DIR, script_name)
        
        if not os.path.exists(script_path):
             task_registry[task_id]["logs"].append(f"Script not found: {script_name}")
             continue
             
        output_filename = f"{task_id}_{portal}_results.json"
        output_path = os.path.join(RESULTS_DIR, output_filename)
        temp_files[portal] = output_path

        limit = "10"
        
        if portal == "google" and serp_api_config:
            if hasattr(serp_api_config, "num_jobs"):
                 limit = str(serp_api_config.num_jobs)
            elif isinstance(serp_api_config, dict) and "num_jobs" in serp_api_config:
                 limit = str(serp_api_config["num_jobs"])
            
        relative_output_path = os.path.join("results", output_filename)
        cmd = ["python", script_path, query, location, limit, relative_output_path]
        
        env = os.environ.copy()
        # Ensure outputs are flushed immediately and encoding is UTF-8 for Windows
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONIOENCODING"] = "utf-8"
        
        if portal == "google" and serp_api_config:
             api_key = None
             if hasattr(serp_api_config, "api_key"):
                 api_key = serp_api_config.api_key
             elif isinstance(serp_api_config, dict) and "api_key" in serp_api_config:
                 api_key = serp_api_config["api_key"]
                 
             if api_key:
                env["SERP_API_KEY"] = api_key

        try:
            # Redirect stdout/stderr to PIPE
            p = subprocess.Popen(
                cmd, 
                env=env, 
                cwd=SCRAPER_DIR, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT
            )
            processes.append((portal, p))
            
            # Start a daemon thread to read output
            t = threading.Thread(target=stream_logs, args=(p.stdout, task_registry[task_id]["logs"]))
            t.daemon = True
            t.start()
            
        except Exception as e:
             task_registry[task_id]["logs"].append(f"Failed to start {portal}: {str(e)}")

    # Wait for all scrapers to finish
    for portal, p in processes:
        p.wait()
        if p.returncode != 0:
             task_registry[task_id]["logs"].append(f"{portal} finished with return code {p.returncode}")

    # Aggregate results from all scrapers
    aggregated_results = []
    
    for portal, output_path in temp_files.items():
        if os.path.exists(output_path):
            try:
                with open(output_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    count = len(data)
                    task_registry[task_id]["logs"].append(f"Loaded {count} jobs from {portal}")
                    for job in data:
                        job["portal"] = portal
                    aggregated_results.extend(data)
                os.remove(output_path) 
            except Exception as e:
                task_registry[task_id]["logs"].append(f"Error reading results for {portal}: {str(e)}")
        else:
             task_registry[task_id]["logs"].append(f"No results file found for {portal}")

    # Step 1: Enrich jobs with extracted skills
    aggregated_results = enrich_job_listings(aggregated_results)

    # Step 2: Score jobs against user profile 
    scoring_metadata = {}
    job_vectors = []  # Store vectors for DB

    if user_vectors:
        try:
            from backend.app.services.vector_service import score_jobs_against_user
            # Keep vectors for DB extraction
            scored = score_jobs_against_user(user_vectors, aggregated_results, keep_vectors=True)
            aggregated_results = scored["jobs"]
            
            # Extract vectors for DB and remove from object to keep JSON small
            for job in aggregated_results:
                g_vec = job.pop("jd_global_vector", None)
                s_vec = job.pop("jd_skill_vector", None)
                if g_vec and s_vec:
                    job_vectors.append({"global_vector": g_vec, "skill_vector": s_vec})
                else:
                    job_vectors.append({})
            
            scoring_metadata = {
                "market_reach": scored["market_reach"],
                "average_score": scored["average_score"],
                "total_jobs": scored["total_jobs"],
                "high_match_jobs": scored["high_match_jobs"],
            }
            logger.info(f"Scoring complete: {scoring_metadata}")
        except Exception as e:
            logger.error(f"Scoring failed (returning unscored results): {e}")
            task_registry[task_id]["logs"].append(f"Scoring error: {str(e)}")

    task_registry[task_id]["status"] = "completed"
    
    final_output = {
        "task_id": task_id,
        "query": query,
        "location": location,
        "jobs": aggregated_results,
        **scoring_metadata,
    }
    
    final_output_file = f"{task_id}_final_results.json"
    final_output_path = os.path.join(RESULTS_DIR, final_output_file)
    
    with open(final_output_path, "w") as f:
        json.dump(final_output, f, indent=2)
        
    task_registry[task_id]["results_file"] = final_output_path

    # Save to database
    try:
        from backend.app.db.crud import save_search, save_jobs_batch, update_search_scores

        save_search(
            search_id=task_id,
            profile_id=profile_id,
            query=query,
            location=location,
            portals=portals,
        )

        save_jobs_batch(search_id=task_id, jobs=aggregated_results, job_vectors=job_vectors)

        if scoring_metadata:
            update_search_scores(
                search_id=task_id,
                total_jobs=scoring_metadata.get("total_jobs", len(aggregated_results)),
                market_reach=scoring_metadata.get("market_reach", 0),
                average_score=scoring_metadata.get("average_score", 0),
                high_match_jobs=scoring_metadata.get("high_match_jobs", 0),
            )

        logger.info(f"Results saved to database for task {task_id}")
    except Exception as e:
        logger.error(f"DB save failed (JSON file still available): {e}")
        task_registry[task_id]["logs"].append(f"DB save error: {str(e)}")

