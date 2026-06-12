import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from backend.app.services.resume_parser import full_parse_pipeline
from backend.app.ml.embeddings import embed_text

router = APIRouter(prefix="/api/resume", tags=["resume"])

# we are just saving resumes in memory for now. 
# when you restart the server, these will disappear!
resume_store = {}

class ConfirmSkillsRequest(BaseModel):
    
    resume_id: str
    confirmed_skills: list[str]
    credibility_overrides: dict[str, str] = {}
    user_context_note: str = ""

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    groq_key: str = Form(...)
):
    
    # make sure they actually uploaded a pdf
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="only PDF files are accepted")
    
    file_bytes = await file.read()
    
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="uploaded file is empty")
    
    # 10mb limit so people don't crash our server with massive files
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="file too large (max 10MB)")
    
    # this does all the heavy lifting: text extraction, ner, and groq llm
    try:
        parsed = full_parse_pipeline(file_bytes, groq_key)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"parsing failed: {str(e)}")
    
    # give this resume a random unique id
    resume_id = str(uuid.uuid4())
    
    resume_store[resume_id] = {
        "id": resume_id,
        "filename": file.filename,
        "parsed": parsed,
        "confirmed": False,
    }
    
    # send the good stuff back to the frontend
    return {
        "resume_id": resume_id,
        "filename": file.filename,
        "skills": parsed["skills"],
        "evidence": parsed["evidence"],
        "experience_bullets": parsed["experience_bullets"],
        "projects": parsed["projects"],
        "education": parsed["education"],
        "sections": list(parsed["sections"].keys()),
    }

@router.post("/confirm")
async def confirm_skills(body: ConfirmSkillsRequest):
    
    if body.resume_id not in resume_store:
        raise HTTPException(status_code=404, detail="resume not found")
    
    resume = resume_store[body.resume_id]
    
    resume["confirmed_skills"] = body.confirmed_skills
    resume["credibility_overrides"] = body.credibility_overrides
    resume["user_context_note"] = body.user_context_note
    resume["confirmed"] = True
    
    # turn all their confirmed skills into a single block of text
    # then convert that text into a math vector so we can match it against jobs
    skills_text = ", ".join(body.confirmed_skills)
    embedding = embed_text(skills_text)
    
    resume["embedding"] = embedding.tolist()
    
    return {
        "status": "confirmed",
        "resume_id": body.resume_id,
        "skill_count": len(body.confirmed_skills),
        "embedding_ready": True,
    }

@router.get("/{resume_id}")
async def get_resume(resume_id):
    
    if resume_id not in resume_store:
        raise HTTPException(status_code=404, detail="resume not found")
    
    resume = resume_store[resume_id]
    
    return {
        "id": resume["id"],
        "filename": resume["filename"],
        "skills": resume["parsed"]["skills"],
        "confirmed": resume["confirmed"],
        "confirmed_skills": resume.get("confirmed_skills", []),
    }
