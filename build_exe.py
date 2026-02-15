
import subprocess
import os
import shutil
import sys
import PyInstaller.__main__

def build_frontend():
    print("📦 Building Frontend...")
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    
    # 1. Install dependencies
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        subprocess.run(["npm", "install"], cwd=frontend_dir, shell=True, check=True)
    
    # 2. Build for production
    subprocess.run(["npm", "run", "build"], cwd=frontend_dir, shell=True, check=True)
    
    dist_dir = os.path.join(frontend_dir, "dist")
    if not os.path.exists(dist_dir):
        raise FileNotFoundError(f"Frontend build failed. {dist_dir} does not exist.")
    
    return dist_dir

def build_app():
    # 1. Build React App
    frontend_dist = build_frontend()
    
    # 2. Configure PyInstaller
    print("🔨 Compiling EXE with PyInstaller...")
    
    args = [
        'desktop_app.py',             # Main Entry Point
        '--name=SkillFitAI',          # EXE Name
        '--console',                  # Hide Terminal Window (Good for Production)
        '--onedir',                   # Create directory bundle (Faster startup than --onefile)
        '--clean',                    # Clear cache
        
        # --- Data Files (Source;Destination) ---
        f'--add-data={frontend_dist};frontend/dist',                 # Include React build
        '--add-data=ml/ner/tech_skills.json;ml/ner',                 # Include ML model configs
        '--add-data=scraper;scraper',                                # Include scraper scripts
        '--add-data=backend;backend',                                # Include backend source code
        
        # --- Hidden Imports (Detect if PyInstaller misses them) ---
        '--hidden-import=backend',
        '--hidden-import=backend.app',
        '--hidden-import=backend.app.main',
        '--hidden-import=sqlite_vec',           # <--- CRITICAL: Force import
        '--hidden-import=uvicorn.logging',
        '--hidden-import=uvicorn.loops',
        '--hidden-import=uvicorn.loops.auto',
        '--hidden-import=uvicorn.protocols',
        '--hidden-import=uvicorn.protocols.http',
        '--hidden-import=uvicorn.protocols.http.auto',
        '--hidden-import=uvicorn.lifespan',
        '--hidden-import=uvicorn.lifespan.on',
        '--hidden-import=sentence_transformers',
        '--hidden-import=sklearn.utils._typedefs',                   
        '--hidden-import=sklearn.neighbors._partition_nodes',  
        
        # --- Collect Binaries (SQLite Ext) ---
        '--collect-all=sqlite_vec',              # <--- CRITICAL: Copies the DLL/So files
    ]
    
    PyInstaller.__main__.run(args)
    
    print("\n✅ Build Complete!")
    print(f"👉 Your app is ready at: {os.path.abspath('dist/SkillFitAI/SkillFitAI.exe')}")
    print("Copy the entire folder (dist/SkillFitAI) to distribute.")

if __name__ == "__main__":
    build_app()
