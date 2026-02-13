import subprocess
import os
import json
import uuid
from typing import List, Dict, Optional
import time

task_registry = {}

SCRAPER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../scraper"))

def run_scraper_engine(task_id: str, query: str, location: str, portals: List[str], serp_api_config: Optional[Dict] = None):

    task_registry[task_id] = {"status": "processing", "results": [], "logs": []}
    
    processes = []
    
    if "google" in portals and serp_api_config and serp_api_config.get("api_key"):
        pass 

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
        output_path = os.path.join(SCRAPER_DIR, output_filename)
        temp_files[portal] = output_path

        # Construct command
        # python script.py <query> <location> [limit] [output_file]
        limit = "10"
        if portal == "google" and serp_api_config:
            # Check if it's a dict or Pydantic model (depending on how it's passed)
            # In run_scraper_engine arguments, it is typed as Optional[Dict] originally, 
            # but main.py passes request.serp_api_config which is now a Pydantic model.
            # I should update the type hint in run_scraper_engine too, but python runtime doesn't care.
            # However, I need to access it correctly.
            if hasattr(serp_api_config, "num_jobs"):
                 limit = str(serp_api_config.num_jobs)
            elif isinstance(serp_api_config, dict) and "num_jobs" in serp_api_config:
                 limit = str(serp_api_config["num_jobs"])
            
        cmd = ["python", script_path, query, location, limit, output_filename]
        
        env = os.environ.copy()
        if portal == "google" and serp_api_config:
             api_key = None
             if hasattr(serp_api_config, "api_key"):
                 api_key = serp_api_config.api_key
             elif isinstance(serp_api_config, dict) and "api_key" in serp_api_config:
                 api_key = serp_api_config["api_key"]
                 
             if api_key:
                env["SERP_API_KEY"] = api_key

        try:
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


    task_registry[task_id]["status"] = "completed"
    output_file = f"{task_id}_results.json"
    with open(output_file, "w") as f:
        json.dump(aggregated_results, f)
    
