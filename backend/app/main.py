from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# create the main fastapi application
app = FastAPI(
    title="SkillFit AI",
    version="2.0.0"
)

# allow the react frontend to talk to the api
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
