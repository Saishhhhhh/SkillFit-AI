
import subprocess
import os
import json
import uuid
from typing import List, Dict, Optional, Any
import time
from backend.app.services.job_service import enrich_job_listings

task_registry = {}

SCRAPER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../scraper"))

def run_scraper_engine(
    task_id: str, 
    query: str, 
    location: str, 
    portals: List[str], 
    serp_api_config: Optional[Any] = None  # Typed as Any to handle Pydantic model or dict
):

    task_registry[task_id] = {"status": "processing", "results": [], "logs": []}
    
    # Create results directory if it doesn't exist
    RESULTS_DIR = os.path.join(SCRAPER_DIR, "results")
    if not os.path.exists(RESULTS_DIR):
        os.makedirs(RESULTS_DIR)
    
    processes = []
    
    # DEBUG: Check config type
    # print(f"Config type: {type(serp_api_config)}")

    temp_files = {}

    for portal in portals:
        script_name = f"{portal}.py"

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
        
        # We need the absolute path for reading later
        output_path = os.path.join(RESULTS_DIR, output_filename)
        temp_files[portal] = output_path

        # Construct command
        # python script.py <query> <location> [limit] [output_file]
        limit = "10"
        
        # Handle Pydantic model or dict for num_jobs
        if portal == "google" and serp_api_config:
            if hasattr(serp_api_config, "num_jobs"):
                 limit = str(serp_api_config.num_jobs)
            elif isinstance(serp_api_config, dict) and "num_jobs" in serp_api_config:
                 limit = str(serp_api_config["num_jobs"])
            
        # Pass explicit path to the results/ folder so the scraper writes there
        # Since scraper runs with CWD=SCRAPER_DIR, we pass "results/filename.json"
        relative_output_path = os.path.join("results", output_filename)
        
        cmd = ["python", script_path, query, location, limit, relative_output_path]
        
        env = os.environ.copy()
        
        # Handle Pydantic model or dict for api_key
        if portal == "google" and serp_api_config:
             api_key = None
             if hasattr(serp_api_config, "api_key"):
                 api_key = serp_api_config.api_key
             elif isinstance(serp_api_config, dict) and "api_key" in serp_api_config:
                 api_key = serp_api_config["api_key"]
                 
             if api_key:
                env["SERP_API_KEY"] = api_key

        try:
            # Run in SCRAPER_DIR so imports work
            p = subprocess.Popen(cmd, env=env, cwd=SCRAPER_DIR) 
            processes.append((portal, p))
        except Exception as e:
             task_registry[task_id]["logs"].append(f"Failed to start {portal}: {str(e)}")

    for portal, p in processes:
        p.wait()
        if p.returncode != 0:
             task_registry[task_id]["logs"].append(f"{portal} failed with return code {p.returncode}")

    aggregated_results = []
    
    for portal, output_path in temp_files.items():
        if os.path.exists(output_path):
            try:
                with open(output_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for job in data:
                        job["portal"] = portal
                    aggregated_results.extend(data)
                # Cleanup temp file
                os.remove(output_path) 
            except Exception as e:
                task_registry[task_id]["logs"].append(f"Error reading results for {portal}: {str(e)}")
        else:
             task_registry[task_id]["logs"].append(f"No results file found for {portal}")


    # Enrich jobs with extracted skills (reuses the ML engine)
    aggregated_results = enrich_job_listings(aggregated_results)

    task_registry[task_id]["status"] = "completed"
    
    # Save final enriched JSON
    final_output_file = f"{task_id}_final_results.json"
    final_output_path = os.path.join(RESULTS_DIR, final_output_file)
    
    with open(final_output_path, "w") as f:
        json.dump(aggregated_results, f, indent=2)
        
    task_registry[task_id]["results_file"] = final_output_path
