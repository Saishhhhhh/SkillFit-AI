
import os
import sys
import threading
import time
import webview
import uvicorn
import socket
from fastapi.staticfiles import StaticFiles
from fastapi import Request
from fastapi.responses import FileResponse

# 1. Determine paths (Critical for PyInstaller)
import sys
if getattr(sys, 'frozen', False):
    # Running as compiled .exe, bundle dir is base
    base_dir = sys._MEIPASS
    sys.path.insert(0, base_dir) # Add root to Python Path
    IS_PROD = True
else:
    # Running as script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, base_dir) # Ensure local dev also sees 'backend' as package
    IS_PROD = False

# 2. Import Backend - Wait until AFTER path setup
from backend.app.main import app

# 3. Handle Frontend Serving
PORT = 8000

if IS_PROD:
    static_dir = os.path.join(base_dir, "frontend", "dist")
    TARGET_URL = f"http://127.0.0.1:{PORT}"
else:
    static_dir = os.path.join(base_dir, "frontend", "dist")
    TARGET_URL = f"http://127.0.0.1:{PORT}"

# 4. CRITICAL FIX: Serve React App at Root
if os.path.exists(static_dir):
    # Mount assets (js, css)
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Serve index.html for root path (Overriding any existing root route if defined in main.py)
    # Note: We must insert this route securely. Since FastAPI routes are matched in order,
    # we need to be careful. The easiest way is to add a middleware or catch-all route.
    
    @app.get("/")
    async def serve_spa(request: Request):
        return FileResponse(os.path.join(static_dir, "index.html"))

    # Catch-all for React Router (e.g. /dashboard, /profile)
    # We exclude /api routes so they still work
    @app.exception_handler(404)
    async def spa_exception_handler(request: Request, exc):
        if request.url.path.startswith("/api"):
            return {"detail": "API endpoint not found"}
        return FileResponse(os.path.join(static_dir, "index.html"))

else:
    print(f"⚠️ Warning: Static files not found at {static_dir}. Frontend won't load.")
    # Fallback to dev server if strictly needed
    if not IS_PROD:
        TARGET_URL = "http://localhost:5173"


# 5. Desktop Logic
def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]

def run_server():
    # Use 0.0.0.0 to bind to all interfaces if needed, but 127.0.0.1 is safer for local
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")

if __name__ == '__main__':
    # Start Backend Thread
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    
    # Wait a moment for server to start
    time.sleep(2)
    
    print(f"Loading App at: {TARGET_URL}")
    
    # Start WebView
    webview.create_window(
        'SkillFit AI', 
        TARGET_URL,
        width=1280,
        height=800,
        resizable=True
    )
    webview.start(debug=not IS_PROD)
