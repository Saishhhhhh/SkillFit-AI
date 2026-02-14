from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
import uuid

from backend.app.services.resume_service import process_resume
from backend.app.services.vector_service import generate_user_vectors
from backend.app.models.job import UserProfile
from backend.app.db.crud import save_profile, update_profile_vectors, get_profile

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/upload",
    tags=["Profile"],
    summary="Upload & Parse a Resume PDF",
    description="""
    Upload a PDF resume file. The server will:
    1. Extract raw text using **pdfplumber**.
    2. Run **2-layer skill extraction**:
       - Layer 1: ML-based NER (amjad-awad/skill-extractor)
       - Layer 2: Dictionary matching (1000+ tech terms)
    3. Save profile to local database.
    4. Return a UI-ready JSON with extracted skills and profile_id.
    """,
)
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported. Please upload a .pdf file."
        )

    contents = await file.read()
    max_size = 10 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 10MB, got {len(contents) / (1024*1024):.1f}MB."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    try:
        # Save file to disk
        import os
        upload_dir = os.path.abspath(os.path.join(os.getcwd(), "uploads/resumes"))
        os.makedirs(upload_dir, exist_ok=True)
        
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        with open(file_path, "wb") as f:
            f.write(contents)
            
        resume_url = f"/uploads/resumes/{unique_filename}"
        
        result = process_resume(contents, file.filename)

        # Save to database
        skill_names = [s["name"] for s in result.get("skills", [])]
        profile_id = save_profile(
            raw_text=result["raw_text"],
            extracted_skills=skill_names,
            experience=result.get("experience", []),
            filename=file.filename,
            resume_path=resume_url
        )

        result["profile_id"] = profile_id
        result["resume_url"] = resume_url
        result["resume_path"] = resume_url
        return result

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Resume processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error during resume processing: {str(e)}")


@router.post(
    "/embed",
    tags=["Profile"],
    summary="Generate User Embedding Vectors",
    description="""
    Generate embedding vectors from confirmed user profile.
    Call this **after** the user has reviewed and confirmed their skills.
    Returns global_vector (from resume text) and skill_vector (from confirmed skills).
    These vectors are reusable across multiple job searches.
    
    If profile_id is provided, vectors are saved to the database for caching.
    """,
)
async def embed_user_profile(profile: UserProfile):
    try:
        user_vectors = generate_user_vectors(
            profile.raw_text,
            profile.confirmed_skills
        )

        # Save vectors to DB if profile_id is provided
        if profile.profile_id:
            update_profile_vectors(
                profile_id=profile.profile_id,
                confirmed_skills=profile.confirmed_skills,
                global_vector=user_vectors["global_vector"],
                skill_vector=user_vectors["skill_vector"],
            )

        return {
            "profile_id": profile.profile_id,
            "global_vector": user_vectors["global_vector"],
            "skill_vector": user_vectors["skill_vector"],
            "skills_used": profile.confirmed_skills,
            "metadata": {
                "vector_dim": 384,
                "model": "all-MiniLM-L6-v2",
                "saved_to_db": bool(profile.profile_id),
            }
        }
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@router.get(
    "/{profile_id}",
    tags=["Profile"],
    summary="Get Profile by ID",
    description="Retrieve a saved profile with its extracted skills and vectors.",
)
async def get_profile_by_id(profile_id: str):
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
