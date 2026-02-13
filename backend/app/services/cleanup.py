import os
import time
import glob
import logging

logger = logging.getLogger(__name__)

def cleanup_stale_files(directory: str, max_age_seconds: int = 3600): # Default 1 hour
    """
    Deletes files in the specified directory that are older than max_age_seconds.
    Target files: *.json (specifically task results)
    """
    if not os.path.exists(directory):
        return

    now = time.time()
    count = 0
    
    # Pattern to match result files: "uuid-uuid-uuid_results.json" or similar
    # Using simple *.json to catch all task artifacts.
    files = glob.glob(os.path.join(directory, "*_results.json"))
    
    for f in files:
        try:
            if os.stat(f).st_mtime < (now - max_age_seconds):
                os.remove(f)
                count += 1
                logger.info(f"Deleted stale file: {f}")
        except Exception as e:
            logger.error(f"Error deleting file {f}: {e}")
            
    if count > 0:
        logger.info(f"Cleanup complete. Deleted {count} stale files.")
